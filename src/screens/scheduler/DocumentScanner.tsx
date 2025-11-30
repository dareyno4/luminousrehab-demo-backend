import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  FileText,
  X,
  Check,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
  LightbulbIcon,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { uploadDocument, uploadUnassignedDocument } from '../../services/documentService';
import { fetchAllCharts } from '../../services/schedulerService';
import MedicationOCRScanner from '../../components/MedicationOCRScanner';
import MedicationBarcodeScanner from '../../components/MedicationBarcodeScanner';

interface Props {
  chartId?: string; // If provided, documents will be attached to this chart
  onSuccess?: () => void;
  onClose?: () => void;
}

interface Chart {
  id: string;
  patientName: string;
  patientDob: string;
  documentCount: number;
}

export default function DocumentScanner({ chartId, onSuccess, onClose }: Props) {
  const { user } = useAuth();
  const [uploadMethod, setUploadMethod] = useState<'camera' | 'file' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showOCRScanner, setShowOCRScanner] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isPatientSelectionOpen, setIsPatientSelectionOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load charts if no chartId is provided (for patient selection)
  useEffect(() => {
    if (!chartId && user?.tenant_id) {
      loadCharts();
    }
  }, [chartId, user?.tenant_id]);

  const loadCharts = async () => {
    if (!user?.tenant_id) return;
    
    setLoadingCharts(true);
    try {
      const data = await fetchAllCharts(user.tenant_id);
      const mappedCharts = data.map(chart => ({
        id: chart.id,
        patientName: `${chart.patient?.first_name || ''} ${chart.patient?.last_name || ''}`.trim() || 'Unknown',
        patientDob: chart.patient?.date_of_birth || '',
        documentCount: chart.document_count || 0,
      }));
      setCharts(mappedCharts);
    } catch (error) {
      console.error('Error loading charts:', error);
      toast.error('Failed to load patient charts');
    } finally {
      setLoadingCharts(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // If no chartId, show patient selection
    if (!chartId) {
      setPendingFiles(Array.from(files));
      setIsPatientSelectionOpen(true);
      return;
    }

    // Otherwise upload directly
    await uploadFilesToChart(Array.from(files), chartId);
  };

  const uploadFilesToChart = async (files: File[], targetChartId: string) => {
    if (!user?.tenant_id || !user?.id) return;

    setUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
          throw new Error(`Invalid file type: ${file.name}. Only JPG, PNG, HEIC, and PDF files are allowed.`);
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File too large: ${file.name}. Maximum size is 10MB.`);
        }

        return await uploadDocument(file, targetChartId, user.tenant_id, user.id);
      });

      await Promise.all(uploadPromises);
      
      toast.success(`${files.length} document${files.length > 1 ? 's' : ''} uploaded successfully`);
      onSuccess?.();
      onClose?.();
    } catch (error: any) {
      console.error('Error uploading documents:', error);
      toast.error(error.message || 'Failed to upload documents');
    } finally {
      setUploading(false);
      setPendingFiles([]);
      setIsPatientSelectionOpen(false);
    }
  };

  const handlePatientSelected = async (selectedChartId: string) => {
    if (pendingFiles.length > 0) {
      await uploadFilesToChart(pendingFiles, selectedChartId);
    }
  };

  const handleCameraScan = () => {
    // If no chartId, show patient selection first
    if (!chartId) {
      setIsPatientSelectionOpen(true);
      return;
    }
    // Otherwise proceed directly to camera
    setShowOCRScanner(true);
  };

  const handleOCRComplete = async (medications: any[]) => {
    // For document scanning, we just want to note that medications were scanned
    // The actual medication data would be processed separately
    toast.success('Document scanned successfully');
    setShowOCRScanner(false);
    onSuccess?.();
    onClose?.();
  };

  const handleOCRCancel = () => {
    setShowOCRScanner(false);
  };

  if (showOCRScanner) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <MedicationOCRScanner
          onMedicationsScanned={handleOCRComplete}
          onCancel={handleOCRCancel}
        />
      </div>
    );
  }

  if (showBarcodeScanner) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <MedicationBarcodeScanner
          onMedicationsScanned={(medications) => {
            console.log('Medications scanned:', medications);
            setShowBarcodeScanner(false);
            toast.info('Barcode scanning complete. Document upload needed.');
          }}
          onCancel={() => setShowBarcodeScanner(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-[#0f172a]">Scan or Upload Documents</h2>
          <p className="text-sm text-[#64748b]">
            {chartId ? 'Add documents to this patient chart' : 'Upload documents to attach later'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGuideModal(true)}
            className="text-[#0966CC] border-[#0966CC]"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            View Guide
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Upload Options */}
      <div className="space-y-3">
        {/* Camera Scan */}
        <button
          onClick={handleCameraScan}
          disabled={uploading}
          className="w-full bg-white rounded-xl border-2 border-[#e2e8f0] p-6 hover:border-[#F59E0B] hover:shadow-md transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#FEF3C7] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Camera className="w-7 h-7 text-[#F59E0B]" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg text-[#0f172a] mb-1">Camera Scan</h4>
              <p className="text-sm text-[#64748b] mb-2">Capture documents using your device camera</p>
              <p className="text-xs text-[#94a3b8]">
                Best for: Discharge summaries, medical records, insurance cards, lab results
              </p>
            </div>
          </div>
        </button>

        {/* File Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full bg-white rounded-xl border-2 border-dashed border-[#e2e8f0] p-6 hover:border-[#F59E0B] hover:bg-[#FFFBEB] hover:shadow-md transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Upload className="w-7 h-7 text-[#0966CC]" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg text-[#0f172a] mb-1">Upload Files</h4>
              <p className="text-sm text-[#64748b] mb-2">Select files from your device</p>
              <div className="flex flex-col gap-1">
                <p className="text-xs text-[#94a3b8]">Supports: PDF, JPG, PNG, HEIC (max 10MB per file)</p>
                <p className="text-xs text-[#0966CC] italic">Click to browse or drag files here</p>
              </div>
            </div>
          </div>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,application/pdf"
          multiple
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
        />

        {/* Barcode Scanner (Optional) */}
        <button
          onClick={() => setShowBarcodeScanner(true)}
          disabled={uploading}
          className="w-full bg-white rounded-xl border-2 border-[#e2e8f0] p-6 hover:border-[#F59E0B] hover:shadow-md transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#E0E7FF] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <ImageIcon className="w-7 h-7 text-[#4F46E5]" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg text-[#0f172a] mb-1">Quick Scan</h4>
              <p className="text-sm text-[#64748b] mb-2">Fast scanning for barcoded documents</p>
              <p className="text-xs text-[#94a3b8]">
                Best for: Documents with barcodes or QR codes
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-[#F59E0B] animate-spin" />
            <div>
              <p className="text-sm text-[#92400E]">Uploading documents...</p>
              <p className="text-xs text-[#92400E]">Please wait while we process your files</p>
            </div>
          </div>
        </div>
      )}

      {/* HIPAA Notice */}
      <div className="bg-[#E0F2FE] border border-[#BFDBFE] rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#0966CC] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-[#0c4a6e]">
              <strong>HIPAA Compliant:</strong> All documents are securely encrypted and stored.
            </p>
            <p className="text-xs text-[#0c4a6e] mt-1">
              Supported: Discharge summaries, medical records, insurance cards, lab results, prescriptions, and other patient documents.
            </p>
          </div>
        </div>
      </div>

      {/* Patient Selection Dialog */}
      {!chartId && (
        <Dialog open={isPatientSelectionOpen} onOpenChange={setIsPatientSelectionOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Select Patient for Document</DialogTitle>
              <DialogDescription>
                {pendingFiles.length > 0
                  ? `Select which patient chart to attach ${pendingFiles.length} file(s) to`
                  : 'Select which patient chart to attach the document to'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto">
              {loadingCharts || uploading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-8 h-8 text-[#F59E0B] animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {charts.map((chart) => (
                    <button
                      key={chart.id}
                      onClick={() => handlePatientSelected(chart.id)}
                      disabled={uploading}
                      className="w-full text-left p-4 rounded-xl border-2 border-[#e2e8f0] hover:border-[#F59E0B] hover:bg-[#FFFBEB] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-base font-medium text-[#0f172a]">
                            {chart.patientName}
                          </h4>
                          <p className="text-sm text-[#64748b] mt-1">
                            DOB: {new Date(chart.patientDob).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-xs text-[#94a3b8] mt-1">
                            {chart.documentCount} document{chart.documentCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[#cbd5e1]" />
                      </div>
                    </button>
                  ))}

                  {charts.length === 0 && !loadingCharts && (
                    <div className="text-center p-8 text-[#64748b]">
                      <p>No patient charts available.</p>
                      <p className="text-sm mt-2">Create a chart first to upload documents.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsPatientSelectionOpen(false);
                  setPendingFiles([]);
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Scanning Guide Modal */}
      <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LightbulbIcon className="w-5 h-5 text-[#F59E0B]" />
              Document Scanning Guide
            </DialogTitle>
            <DialogDescription>
              Tips for getting the best scan results
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Best Practices */}
            <div>
              <h3 className="font-semibold text-sm text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                Best Practices
              </h3>
              <div className="space-y-3">
                <div className="bg-[#D1FAE5] border border-[#A7F3D0] rounded-lg p-3">
                  <p className="text-sm text-[#065F46] font-medium mb-1">✓ Good Lighting</p>
                  <p className="text-xs text-[#065F46]">Use natural light or bright indoor lighting. Avoid shadows and glare on the document.</p>
                </div>
                <div className="bg-[#D1FAE5] border border-[#A7F3D0] rounded-lg p-3">
                  <p className="text-sm text-[#065F46] font-medium mb-1">✓ Flat Surface</p>
                  <p className="text-xs text-[#065F46]">Place the document on a flat, contrasting surface. Use a dark background for white paper.</p>
                </div>
                <div className="bg-[#D1FAE5] border border-[#A7F3D0] rounded-lg p-3">
                  <p className="text-sm text-[#065F46] font-medium mb-1">✓ Hold Steady</p>
                  <p className="text-xs text-[#065F46]">Keep your device stable and parallel to the document. Use both hands or prop against a surface.</p>
                </div>
                <div className="bg-[#D1FAE5] border border-[#A7F3D0] rounded-lg p-3">
                  <p className="text-sm text-[#065F46] font-medium mb-1">✓ Full Document</p>
                  <p className="text-xs text-[#065F46]">Capture the entire document in frame with all four edges visible. Leave a small margin.</p>
                </div>
                <div className="bg-[#D1FAE5] border border-[#A7F3D0] rounded-lg p-3">
                  <p className="text-sm text-[#065F46] font-medium mb-1">✓ Sharp Focus</p>
                  <p className="text-xs text-[#065F46]">Ensure text is clear and readable. Tap screen to focus if needed before capturing.</p>
                </div>
              </div>
            </div>

            {/* Common Mistakes */}
            <div>
              <h3 className="font-semibold text-sm text-slate-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                Avoid These Mistakes
              </h3>
              <div className="space-y-3">
                <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg p-3">
                  <p className="text-sm text-[#7F1D1D] font-medium mb-1">✗ Poor Lighting</p>
                  <p className="text-xs text-[#7F1D1D]">Dark or shadowy photos make text hard to read and reduce accuracy.</p>
                </div>
                <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg p-3">
                  <p className="text-sm text-[#7F1D1D] font-medium mb-1">✗ Blurry Images</p>
                  <p className="text-xs text-[#7F1D1D]">Motion blur or out-of-focus shots won't process correctly. Retake if blurry.</p>
                </div>
                <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg p-3">
                  <p className="text-sm text-[#7F1D1D] font-medium mb-1">✗ Cropped Text</p>
                  <p className="text-xs text-[#7F1D1D]">Missing edges or cut-off text means important information may be lost.</p>
                </div>
                <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg p-3">
                  <p className="text-sm text-[#7F1D1D] font-medium mb-1">✗ Glare/Reflections</p>
                  <p className="text-xs text-[#7F1D1D]">Glossy surfaces or flash can create bright spots that obscure text.</p>
                </div>
              </div>
            </div>

            {/* Document Types */}
            <div>
              <h3 className="font-semibold text-sm text-slate-900 mb-3">Supported Document Types</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-slate-700">
                  <FileText className="w-4 h-4 text-[#0966CC]" />
                  <span>Discharge Summaries</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <FileText className="w-4 h-4 text-[#0966CC]" />
                  <span>Medical Records</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <FileText className="w-4 h-4 text-[#0966CC]" />
                  <span>Insurance Cards</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <FileText className="w-4 h-4 text-[#0966CC]" />
                  <span>Lab Results</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <FileText className="w-4 h-4 text-[#0966CC]" />
                  <span>Prescriptions</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <FileText className="w-4 h-4 text-[#0966CC]" />
                  <span>Referral Forms</span>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-lg p-4">
              <h3 className="font-semibold text-sm text-[#92400E] mb-2">💡 Pro Tips</h3>
              <ul className="space-y-1 text-xs text-[#92400E]">
                <li>• For multi-page documents, scan each page separately</li>
                <li>• PDFs are best for already-digital documents</li>
                <li>• Use the file upload option for documents on your computer</li>
                <li>• Camera scan works best for physical paper documents</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowGuideModal(false)}
              className="bg-[#0966CC] hover:bg-[#075497] text-white"
            >
              Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
