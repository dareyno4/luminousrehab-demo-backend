import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lock,
  RotateCcw,
  CheckCircle,
  Eye,
  Paperclip,
  MoreVertical,
  Archive,
  LockOpen,
  Clock,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Screen, NavigationParams } from '../../App';
import { supabaseClient } from '../../lib/supabase';
import { approveChart, rejectChart } from '../../services/agencyAdminService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';

interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
  route: {
    params: NavigationParams;
  };
}

interface Medication {
  id: string;
  drug_name: string;
  strength: string;
  route: string;
  frequency: string;
  prescriber: string;
  created_at: string;
  is_verified: boolean;
  notes?: string;
}

interface ChartDocument {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
  file_type: string;
  ocr_status?: string;
}

interface ChartData {
  id: string;
  patient_id: string;
  status: string;
  source: string;
  created_at: string;
  finalized_at: string | null;
  created_by: string;
  finalized_by: string | null;
  patient: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
  };
  created_by_user: {
    first_name: string;
    last_name: string;
  } | null;
  finalized_by_user: {
    first_name: string;
    last_name: string;
  } | null;
}

export default function ChartDetailView({ navigation, route }: Props) {
  const { chartId, mode } = route.params;
  const { user } = useAuth();
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showReverificationModal, setShowReverificationModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showArchiveConfirmation, setShowArchiveConfirmation] = useState(false);
  const [showUnarchiveConfirmation, setShowUnarchiveConfirmation] = useState(false);
  const [showUnlockConfirmation, setShowUnlockConfirmation] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [documents, setDocuments] = useState<ChartDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isReviewMode = mode === 'review';
  const chartStatus = chartData?.status || 'active';
  const isLocked = chartStatus === 'delivered_locked';
  const canApprove = chartStatus === 'verified_ready' || chartStatus === 'pending_review';

  useEffect(() => {
    loadChartData();
  }, [chartId]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch chart data
      const { data: chart, error: chartError } = await supabaseClient
        .from('charts')
        .select(`
          *,
          patient:patients(first_name, last_name, date_of_birth),
          created_by_user:users!charts_created_by_fkey(first_name, last_name),
          finalized_by_user:users!charts_finalized_by_fkey(first_name, last_name)
        `)
        .eq('id', chartId)
        .single();

      if (chartError) throw chartError;
      setChartData(chart);

      // Fetch medications
      const { data: meds, error: medsError } = await supabaseClient
        .from('medications')
        .select('*')
        .eq('chart_id', chartId)
        .order('created_at', { ascending: true });

      if (medsError) throw medsError;
      setMedications(meds || []);

      // Fetch documents
      const { data: docs, error: docsError } = await supabaseClient
        .from('documents')
        .select('*')
        .eq('chart_id', chartId)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docs || []);

    } catch (err: any) {
      console.error('Error loading chart data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!user?.id || !chartId) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setIsApproving(true);
      await approveChart(chartId, user.id);
      setShowApprovalModal(false);
      setReviewNotes('');
      toast.success('Chart approved and locked successfully!');
      
      // Reload chart data to show updated status
      await loadChartData();
    } catch (err: any) {
      console.error('Error approving chart:', err);
      toast.error(err.message || 'Failed to approve chart');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!reviewNotes.trim()) {
      toast.error('Please provide feedback notes for the clinician');
      return;
    }
    if (!user?.id || !chartId) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setIsRejecting(true);
      await rejectChart(chartId, reviewNotes, user.id);
      setShowReverificationModal(false);
      setReviewNotes('');
      toast.success('Chart returned to clinician for changes');
      
      // Reload chart data to show updated status
      await loadChartData();
    } catch (err: any) {
      console.error('Error rejecting chart:', err);
      toast.error(err.message || 'Failed to send reverification request');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleArchiveChart = async () => {
    setShowArchiveConfirmation(true);
  };

  const confirmArchiveChart = async () => {
    if (!chartId) return;

    try {
      const { error } = await supabaseClient
        .from('charts')
        .update({ status: 'archived' })
        .eq('id', chartId);

      if (error) throw error;

      setShowArchiveConfirmation(false);
      alert('Chart archived successfully');
      await loadChartData();
    } catch (err: any) {
      console.error('Error archiving chart:', err);
      alert(`Failed to archive chart: ${err.message}`);
    }
  };

  const handleUnarchiveChart = () => {
    setShowUnarchiveConfirmation(true);
  };

  const confirmUnarchiveChart = async () => {
    if (!chartId) return;

    try {
      const { error } = await supabaseClient
        .from('charts')
        .update({ status: 'active' })
        .eq('id', chartId);

      if (error) throw error;

      setShowUnarchiveConfirmation(false);
      alert('Chart restored to Active status');
      await loadChartData();
    } catch (err: any) {
      console.error('Error restoring chart:', err);
      alert(`Failed to restore chart: ${err.message}`);
    }
  };

  const handleUnlockChart = () => {
    setShowUnlockConfirmation(true);
  };

  const confirmUnlockChart = async () => {
    if (!chartId) return;

    try {
      const { error } = await supabaseClient
        .from('charts')
        .update({ 
          status: 'active',
          finalized_at: null,
          finalized_by: null
        })
        .eq('id', chartId);

      if (error) throw error;

      setShowUnlockConfirmation(false);
      alert('Chart unlocked successfully');
      await loadChartData();
    } catch (err: any) {
      console.error('Error unlocking chart:', err);
      alert(`Failed to unlock chart: ${err.message}`);
    }
  };

  const mapChartStatus = (status: string): string => {
    switch (status) {
      case 'active': return 'Active';
      case 'verified_ready': return 'Verified';
      case 'pending_review': return 'Pending Review';
      case 'delivered_locked': return 'Delivered';
      case 'needs_reverification': return 'Needs Reverification';
      case 'archived': return 'Archived';
      default: return 'Active';
    }
  };

  const getChartType = (source: string): string => {
    switch (source) {
      case 'bottle_scan': return 'Bottle Scan';
      case 'pdf_import': return 'PDF Import';
      case 'image_upload': return 'Manual Entry';
      default: return 'Empty Chart';
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0966CC] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#64748b]">Loading chart...</p>
        </div>
      </div>
    );
  }

  if (error || !chartData) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="text-center max-w-md p-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg text-[#0f172a] mb-2">Failed to Load Chart</h2>
          <p className="text-[#64748b] mb-4">{error || 'Chart not found'}</p>
          <Button onClick={() => navigation.goBack()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const patient = {
    name: `${chartData.patient.first_name} ${chartData.patient.last_name}`,
    dob: formatDate(chartData.patient.date_of_birth),
  };

  const chartInfo = {
    type: getChartType(chartData.source),
    createdBy: chartData.created_by_user 
      ? `${chartData.created_by_user.first_name} ${chartData.created_by_user.last_name}` 
      : 'Unknown',
    createdDate: formatDate(chartData.created_at),
    finalizedDate: chartData.finalized_at ? formatDate(chartData.finalized_at) : null,
    finalizedBy: chartData.finalized_by_user
      ? `${chartData.finalized_by_user.first_name} ${chartData.finalized_by_user.last_name}`
      : null,
  };

  const displayStatus = mapChartStatus(chartStatus);

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">
      <Toaster />
      {/* Header */}
      <div className="bg-gradient-to-r from-[#10B981] to-[#059669] p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigation.goBack()}
            className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg text-white">{patient.name}</h1>
            <p className="text-sm text-white/80">DOB: {patient.dob}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
                <MoreVertical className="w-5 h-5 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {chartStatus === 'delivered_locked' && (
                <>
                  <DropdownMenuItem onClick={handleUnlockChart} className="cursor-pointer">
                    <LockOpen className="w-4 h-4 mr-2" />
                    Unlock Chart
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleArchiveChart} className="cursor-pointer text-amber-600">
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Chart
                  </DropdownMenuItem>
                </>
              )}
              {(chartStatus === 'active' || chartStatus === 'verified_ready' || chartStatus === 'pending_review') && (
                <DropdownMenuItem onClick={handleArchiveChart} className="cursor-pointer text-amber-600">
                  <Archive className="w-4 h-4 mr-2" />
                  Archive Chart
                </DropdownMenuItem>
              )}
              {chartStatus === 'archived' && (
                <DropdownMenuItem onClick={handleUnarchiveChart} className="cursor-pointer text-green-600">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore to Active
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex justify-center">
          <Badge
            className={
              chartStatus === 'delivered_locked'
                ? 'bg-[#E0E7FF] text-[#4F46E5] border-[#C7D2FE]'
                : chartStatus === 'verified_ready'
                ? 'bg-[#D1FAE5] text-[#10B981] border-[#A7F3D0]'
                : chartStatus === 'pending_review'
                ? 'bg-[#FEF3C7] text-[#F59E0B] border-[#FDE68A]'
                : chartStatus === 'needs_reverification'
                ? 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]'
                : chartStatus === 'archived'
                ? 'bg-[#F3F4F6] text-[#6B7280] border-[#D1D5DB]'
                : 'bg-[#DBEAFE] text-[#0966CC] border-[#BFDBFE]'
            }
          >
            {chartStatus === 'delivered_locked' ? (<><Lock className="w-3 h-3 mr-1" /> Delivered (Locked)</>) : 
             chartStatus === 'verified_ready' ? (<><CheckCircle2 className="w-3 h-3 mr-1" /> Verified (Ready to Deliver)</>) : 
             chartStatus === 'pending_review' ? (<><Clock className="w-3 h-3 mr-1" /> Pending Review</>) :
             chartStatus === 'needs_reverification' ? (<><AlertCircle className="w-3 h-3 mr-1" /> Needs Reverification</>) :
             chartStatus === 'archived' ? (<><Archive className="w-3 h-3 mr-1" /> Archived</>) :
             displayStatus}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Review Mode Info */}
          {isReviewMode && canApprove && (
            <div className="bg-[#E0F2FE] border-2 border-[#BFDBFE] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-[#0966CC] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-[#0C4A6E] mb-1">Review Mode</h3>
                  <p className="text-sm text-[#0C4A6E]">
                    Review all medications and their verification details. You can approve this chart or request changes from the clinician.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Chart Information */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
            <h2 className="text-lg text-[#0f172a] mb-4">Chart Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#64748b]">Chart Type:</span>{' '}
                <span className="text-[#0f172a]">{chartInfo.type}</span>
              </div>
              <div>
                <span className="text-[#64748b]">Created By:</span>{' '}
                <span className="text-[#0f172a]">{chartInfo.createdBy}</span>
              </div>
              <div>
                <span className="text-[#64748b]">Created Date:</span>{' '}
                <span className="text-[#0f172a]">{chartInfo.createdDate}</span>
              </div>
              {chartInfo.finalizedDate && (
                <div>
                  <span className="text-[#64748b]">Finalized Date:</span>{' '}
                  <span className="text-[#0f172a]">{chartInfo.finalizedDate}</span>
                </div>
              )}
              {chartInfo.finalizedBy && (
                <div>
                  <span className="text-[#64748b]">Finalized By:</span>{' '}
                  <span className="text-[#0f172a]">{chartInfo.finalizedBy}</span>
                </div>
              )}
            </div>
          </div>

          {/* Medications Section */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg text-[#0f172a]">Medications ({medications.length})</h2>
            </div>

            <div className="space-y-4">
              {medications.map((med) => (
                <div key={med.id} className="bg-[#f8fafc] rounded-xl border border-[#e2e8f0] p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg text-[#0f172a] mb-2">{med.drug_name}</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm text-[#64748b]">
                        <div>
                          <span className="text-xs text-[#94a3b8]">Strength:</span>{' '}
                          <span className="text-[#0f172a]">{med.strength || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-[#94a3b8]">Route:</span>{' '}
                          <span className="text-[#0f172a]">{med.route || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-[#94a3b8]">Frequency:</span>{' '}
                          <span className="text-[#0f172a]">{med.frequency || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-[#94a3b8]">Prescriber:</span>{' '}
                          <span className="text-[#0f172a]">{med.prescriber || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {med.is_verified && (
                        <Badge className="bg-[#D1FAE5] text-[#10B981] border-[#A7F3D0]">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Created Date */}
                  <div className="flex items-center gap-3 pt-3 border-t border-[#e2e8f0]">
                    <span className="text-xs text-[#94a3b8]">Added: {formatDate(med.created_at)}</span>
                  </div>

                  {med.notes && (
                    <div className="mt-3 pt-3 border-t border-[#e2e8f0]">
                      <p className="text-sm text-[#64748b]">
                        <span className="text-xs text-[#94a3b8]">Notes:</span> {med.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Attached Documents */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg text-[#0f172a]">Attached Documents</h2>
            </div>
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
                    <Paperclip className="w-4 h-4 text-[#64748b]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#0f172a] truncate">{doc.file_name}</p>
                      <p className="text-xs text-[#94a3b8]">Uploaded: {formatDate(doc.created_at)}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(doc.file_url, '_blank')}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#64748b]">No documents attached</p>
            )}
          </div>

          {/* Review Actions */}
          {isReviewMode && canApprove && !isLocked && (
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 space-y-4">
              <h3 className="text-lg text-[#0f172a]">Review Actions</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => setShowReverificationModal(true)}
                  variant="outline"
                  className="flex-1 h-12 border-[#F59E0B] text-[#F59E0B] hover:bg-[#FEF3C7]"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Request Changes
                </Button>
                <Button
                  onClick={() => setShowApprovalModal(true)}
                  className="flex-1 h-12 bg-[#10B981] hover:bg-[#059669] text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Chart
                </Button>
              </div>
            </div>
          )}

          {/* Close Button */}
          <Button
            onClick={() => navigation.goBack()}
            variant="outline"
            className="w-full h-12 rounded-xl border-2 border-[#e2e8f0]"
          >
            {isReviewMode ? 'Back to Dashboard' : 'Close'}
          </Button>
        </div>
      </div>

      {/* Approval Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Approve Chart</DialogTitle>
            <DialogDescription>
              Confirm that you have reviewed all medications and want to approve this chart.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-[#f8fafc] rounded-xl p-4">
              <p className="text-sm text-[#0f172a] mb-2">
                <strong>Patient:</strong> {patient.name}
              </p>
              <p className="text-sm text-[#0f172a] mb-2">
                <strong>Medications:</strong> {medications.length}
              </p>
              <p className="text-sm text-[#0f172a]">
                <strong>Created by:</strong> {chartInfo.createdBy}
              </p>
            </div>
            <div>
              <Label htmlFor="approval-notes">Approval Notes (optional)</Label>
              <Textarea
                id="approval-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                className="mt-2 rounded-xl border-2 border-[#e2e8f0] min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowApprovalModal(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving}
              className="w-full sm:w-auto bg-[#10B981] hover:bg-[#059669] text-white"
            >
              {isApproving ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Approval
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverification Modal */}
      <Dialog open={showReverificationModal} onOpenChange={setShowReverificationModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request Changes</DialogTitle>
            <DialogDescription>
              Send this chart back to the clinician with feedback for reverification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#92400E]">
                  The clinician will receive your feedback and must reverify the chart before it can be approved.
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="reverification-notes">Feedback for Clinician *</Label>
              <Textarea
                id="reverification-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Describe what needs to be corrected or verified..."
                className="mt-2 rounded-xl border-2 border-[#e2e8f0] min-h-[120px]"
              />
              <p className="text-xs text-[#64748b] mt-2">
                Be specific about which medications or fields need attention.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReverificationModal(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestChanges}
              disabled={isRejecting}
              className="w-full sm:w-auto bg-[#F59E0B] hover:bg-[#D97706] text-white"
            >
              {isRejecting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Send for Reverification
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveConfirmation} onOpenChange={setShowArchiveConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Chart</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this chart?
              <br /><br />
              Archived charts can be restored to Active status at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12 rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmArchiveChart}
              className="h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Archive className="w-4 h-4 mr-2" />
              Archive Chart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unarchive Confirmation Dialog */}
      <AlertDialog open={showUnarchiveConfirmation} onOpenChange={setShowUnarchiveConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Chart</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this chart to Active status?
              <br /><br />
              The chart will be moved from Archived to Active and can be edited again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12 rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnarchiveChart}
              className="h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restore to Active
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unlock Chart Confirmation Dialog */}
      <AlertDialog open={showUnlockConfirmation} onOpenChange={setShowUnlockConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock Chart</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlock this chart?
              <br /><br />
              <strong className="text-amber-700">⚠️ Warning:</strong> Unlocking will allow the chart to be edited again. This should only be done if corrections are needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12 rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnlockChart}
              className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            >
              <LockOpen className="w-4 h-4 mr-2" />
              Unlock Chart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
