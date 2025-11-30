import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Upload,
  Plus,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import {
  fetchAllDocuments,
  fetchUnassignedDocuments,
  attachDocumentToChart,
  deleteDocument,
  getDocumentStats,
  getSignedDocumentUrl,
  DocumentWithChart,
} from '../../services/documentService';
import { searchPatients } from '../../services/schedulerService';

interface Props {
  onClose?: () => void;
}

export default function DocumentLibrary({ onClose }: Props) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentWithChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned' | 'processing' | 'failed'>('all');
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithChart | null>(null);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<DocumentWithChart | null>(null);
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false);
  const [stats, setStats] = useState({ total: 0, unassigned: 0, ocrProcessing: 0, failed: 0 });

  useEffect(() => {
    loadDocuments();
    loadStats();
  }, [user?.tenant_id]);

  const loadDocuments = async () => {
    if (!user?.tenant_id) return;
    
    try {
      setLoading(true);
      const data = await fetchAllDocuments(user.tenant_id);
      setDocuments(data);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user?.tenant_id) return;
    
    try {
      const data = await getDocumentStats(user.tenant_id);
      setStats(data);
    } catch (error) {
      console.error('Error loading document stats:', error);
    }
  };

  const handleViewDocument = async (doc: DocumentWithChart) => {
    setViewingDocument(doc);
    setIsViewModalOpen(true);
    setLoadingSignedUrl(true);
    
    try {
      const url = await getSignedDocumentUrl(doc.file_url);
      setSignedUrl(url);
    } catch (error) {
      console.error('Error getting signed URL:', error);
      setSignedUrl(doc.file_url); // Fallback to original URL
    } finally {
      setLoadingSignedUrl(false);
    }
  };

  const handleAttachToChart = async (chartId: string) => {
    if (!selectedDocument) return;

    try {
      await attachDocumentToChart(selectedDocument.id, chartId);
      toast.success('Document attached to patient chart');
      setIsAttachModalOpen(false);
      setSelectedDocument(null);
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('Error attaching document:', error);
      toast.error('Failed to attach document');
    }
  };

  const handleDelete = async () => {
    if (!selectedDocument) return;

    try {
      await deleteDocument(selectedDocument.id, selectedDocument.file_url);
      toast.success('Document deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedDocument(null);
      loadDocuments();
      loadStats();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    // Filter by search query
    const searchLower = searchQuery.toLowerCase().trim();
    if (!searchLower && filterStatus === 'all') return true; // Show all if no search/filter
    
    const matchesSearch = !searchLower || (
      doc.file_name.toLowerCase().includes(searchLower) ||
      (doc.chart?.patient && 
        `${doc.chart.patient.first_name} ${doc.chart.patient.last_name}`.toLowerCase().includes(searchLower))
    );

    // Filter by status
    const matchesFilter = 
      filterStatus === 'all' ? true :
      filterStatus === 'assigned' ? doc.chart_id !== null && doc.chart?.patient :
      filterStatus === 'unassigned' ? !doc.chart?.patient :
      filterStatus === 'processing' ? ['pending', 'processing'].includes(doc.ocr_status || '') :
      filterStatus === 'failed' ? doc.ocr_status === 'failed' :
      true;

    return matchesSearch && matchesFilter;
  });

  const getOCRStatusBadge = (status?: string | null) => {
    if (!status) return null;
    
    switch (status) {
      case 'pending':
      case 'processing':
        return (
          <Badge className="bg-[#E0F2FE] text-[#0966CC] border-[#BFDBFE]">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            OCR Processing
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-[#D1FAE5] text-[#10B981] border-[#A7F3D0]">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            OCR Complete
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]">
            <AlertCircle className="w-3 h-3 mr-1" />
            OCR Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-[#F59E0B] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl text-[#0f172a]">Document Library</h2>
          <p className="text-sm text-[#64748b]">View and manage all documents in your organization</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-[#64748b]" />
            <p className="text-xs text-[#64748b]">Total</p>
          </div>
          <p className="text-2xl text-[#0f172a]">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-[#F59E0B]" />
            <p className="text-xs text-[#64748b]">Unassigned</p>
          </div>
          <p className="text-2xl text-[#F59E0B]">{stats.unassigned}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <div className="flex items-center gap-2 mb-1">
            <X className="w-4 h-4 text-[#DC2626]" />
            <p className="text-xs text-[#64748b]">Failed</p>
          </div>
          <p className="text-2xl text-[#DC2626]">{stats.failed}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
          <Input
            placeholder="Search by file name or patient name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-10 h-14 rounded-xl border-2 border-[#e2e8f0] bg-white text-base"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-full md:w-[240px] h-14 rounded-xl border-2 border-[#e2e8f0] text-base">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Documents List */}
      {filteredDocuments.length > 0 ? (
        <div className="space-y-3">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-[#e2e8f0] p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-lg text-[#0f172a]">{doc.file_name}</h3>
                    {!doc.chart_id && (
                      <Badge className="bg-[#FEF3C7] text-[#F59E0B] border-[#FDE68A]">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Unassigned
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-sm text-[#64748b]">
                    {doc.chart?.patient && (
                      <p>
                        Patient: {doc.chart.patient.first_name} {doc.chart.patient.last_name}
                      </p>
                    )}
                    <p>
                      Uploaded: {new Date(doc.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                    {doc.uploaded_by && (
                      <p>
                        Uploaded by: {doc.uploaded_by}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument(doc)}
                    className="border-[#E0F2FE] text-[#0966CC] hover:bg-[#F0F9FF]"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  
                  {!doc.chart_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDocument(doc);
                        setIsAttachModalOpen(true);
                      }}
                      className="border-[#F59E0B] text-[#F59E0B] hover:bg-[#FEF3C7]"
                    >
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Attach
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDocument(doc);
                      setIsDeleteModalOpen(true);
                    }}
                    className="border-[#DC2626] text-[#DC2626] hover:bg-[#FEE2E2]"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center">
          <FileText className="w-12 h-12 text-[#cbd5e1] mx-auto mb-3" />
          <p className="text-[#64748b] mb-2">
            {searchQuery || filterStatus !== 'all'
              ? 'No documents found matching your filters.'
              : 'No documents uploaded yet.'}
          </p>
          {(searchQuery || filterStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
              }}
              className="text-[#F59E0B] hover:text-[#D97706] text-sm underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Attach to Chart Modal */}
      {selectedDocument && (
        <Dialog open={isAttachModalOpen} onOpenChange={setIsAttachModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Attach Document to Chart</DialogTitle>
              <DialogDescription>
                Select a patient chart to attach "{selectedDocument.file_name}"
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-[#64748b] mb-4">
                Search for a patient and select their chart to attach this document.
              </p>
              {/* TODO: Add patient/chart search and selection UI */}
              <p className="text-xs text-[#94a3b8] italic">
                Patient selection interface coming soon
              </p>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAttachModalOpen(false);
                  setSelectedDocument(null);
                }}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="bg-[#f8fafc] rounded-xl p-4">
              <p className="text-sm text-[#0f172a]">
                <strong>File:</strong> {selectedDocument.file_name}
              </p>
              {selectedDocument.chart?.patient && (
                <p className="text-sm text-[#0f172a] mt-1">
                  <strong>Patient:</strong> {selectedDocument.chart.patient.first_name} {selectedDocument.chart.patient.last_name}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedDocument(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Viewer Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>View Document</DialogTitle>
            <DialogDescription>
              {viewingDocument?.file_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto bg-[#f8fafc] rounded-xl">
            {loadingSignedUrl ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-[#F59E0B] animate-spin" />
              </div>
            ) : viewingDocument && signedUrl ? (
              <>
                {viewingDocument.file_type.includes('pdf') && (
                  <iframe
                    src={signedUrl}
                    className="w-full h-full border-0"
                    title={viewingDocument.file_name}
                  />
                )}
                {viewingDocument.file_type.includes('image') && (
                  <div className="flex items-center justify-center h-full p-4">
                    <img
                      src={signedUrl}
                      alt={viewingDocument.file_name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        console.error('Image failed to load');
                        e.currentTarget.style.display = 'none';
                        const errorDiv = e.currentTarget.nextElementSibling as HTMLElement;
                        if (errorDiv) {
                          errorDiv.classList.remove('hidden');
                          errorDiv.classList.add('flex');
                        }
                      }}
                    />
                    <div className="hidden flex-col items-center justify-center">
                      <AlertCircle className="w-16 h-16 text-[#DC2626] mb-4" />
                      <p className="text-[#64748b] mb-4">Failed to load image</p>
                      <Button
                        onClick={() => window.open(signedUrl, '_blank')}
                        className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Try Download
                      </Button>
                    </div>
                  </div>
                )}
                {!viewingDocument.file_type.includes('pdf') && !viewingDocument.file_type.includes('image') && (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <FileText className="w-16 h-16 text-[#cbd5e1] mb-4" />
                    <p className="text-[#64748b] mb-4">
                      Preview not available for this file type.
                    </p>
                    <Button
                      onClick={() => window.open(signedUrl, '_blank')}
                      className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                )}
              </>
            ) : null}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsViewModalOpen(false);
                setViewingDocument(null);
              }}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (signedUrl) {
                  const link = document.createElement('a');
                  link.href = signedUrl;
                  link.download = viewingDocument?.file_name || 'document';
                  link.target = '_blank';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }}
              disabled={loadingSignedUrl || !signedUrl}
              className="bg-[#F59E0B] hover:bg-[#D97706] text-white disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
