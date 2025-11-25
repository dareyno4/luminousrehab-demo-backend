import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Edit,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mail,
  Printer,
  Download,
  Lock,
  X,
  Paperclip,
  Camera,
  TrendingUp,
  Upload,
  RefreshCw,
  Eye,
  Info,
  Save,
  ChevronLeft,
  MoreVertical,
  Archive,
  RotateCcw,
  LockOpen,
  Trash2,
  User,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Progress } from '../../components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { Separator } from '../../components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';
import { Screen, NavigationParams } from '../../App';
import { supabaseClient } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useRef, useCallback } from 'react';
import { uploadDocument, deleteDocument, getSignedDocumentUrl } from '../../services/documentService';
import MedicationBarcodeScanner, { ScannedMedication } from '../../components/MedicationBarcodeScanner';
import MedicationOCRScanner from '../../components/MedicationOCRScanner';
import type { MedicationInfo } from '../../utils/ocrService';



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
  drugName: string;
  strength: string;
  route: string;
  frequency: string;
  prescriber: string;
  scannedDate: string;
  confidence: number;
  isVerified: boolean;
}
interface Patient {
  first_name: string;
  last_name: string;
  dob: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip_code: string;
  notes: string;
}

interface DocumentRow {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  chart_id: string;
  tenant_id: string;
  created_at: string;
}


const mapChartStatus = (
  status: string
): 'Active' | 'Verified Ready' | 'Pending Review' | 'Delivered (Locked)' | 'Needs Reverification' | 'Archived' => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'verified_ready':
      return 'Verified Ready';
    case 'pending_review':
      return 'Pending Review';
    case 'delivered_locked':
      return 'Delivered (Locked)';
    case 'needs_reverification':
      return 'Needs Reverification';
    case 'archived':
      return 'Archived';
    default:
      return 'Active';
  }
};


export default function ChartDetail({ navigation, route }: Props) {
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showAddMedicationModal, setShowAddMedicationModal] = useState(false);
  const [showAttachDocumentModal, setShowAttachDocumentModal] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<DocumentRow | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false);
  const [showFaxModal, setShowFaxModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  // Scanning modals
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showOCRScanner, setShowOCRScanner] = useState(false);
  const [showDeliveryConfirmation, setShowDeliveryConfirmation] = useState(false);
  const [pendingDeliveryMethod, setPendingDeliveryMethod] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [showArchiveConfirmation, setShowArchiveConfirmation] = useState(false);
  const [showUnarchiveConfirmation, setShowUnarchiveConfirmation] = useState(false);
  const [showUnlockConfirmation, setShowUnlockConfirmation] = useState(false);
  const [newMedDrugName, setNewMedDrugName] = useState('');
  const [newMedStrength, setNewMedStrength] = useState('');
  const [newMedRoute, setNewMedRoute] = useState('');
  const [newMedFrequency, setNewMedFrequency] = useState('');
  const [newMedPrescriber, setNewMedPrescriber] = useState('');
  const [newMedScannedOn, setNewMedScannedOn] = useState('');
  const [savingMedication, setSavingMedication] = useState(false);

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<any[]>([]);
  const [loadingReviewNotes, setLoadingReviewNotes] = useState(false);

  const { patientId, chartId, prefillMedications } = route.params;
  const { user } = useAuth();

const [patient, setPatient] = useState<Patient>({
  first_name: '',
  last_name: '',
  dob: '',
  phone: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zip_code: '',
  notes: '',
});
const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Standalone loader so we can refresh from UI
  const loadDocuments = useCallback(async () => {
    if (!chartId) return;
    setLoadingDocs(true);
    setDocsError(null);
    try {
      const { data: docs, error: docsError } = await supabaseClient
        .from('documents')
        .select('*')
        .eq('chart_id', chartId)
        .order('created_at', { ascending: false});

      if (docsError) throw docsError;
      setDocuments(docs || []);
    } catch (error: any) {
      setDocsError(error.message || 'Failed to load documents');
    } finally {
      setLoadingDocs(false);
    }
  }, [chartId]);

  // Load review notes for charts that need reverification
  const loadReviewNotes = useCallback(async () => {
    if (!chartId) return;
    setLoadingReviewNotes(true);
    try {
      const { data: notes, error } = await supabaseClient
        .from('chart_review_notes')
        .select(`
          *,
          reviewer:users!chart_review_notes_created_by_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq('chart_id', chartId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviewNotes(notes || []);
    } catch (error: any) {
      console.error('Failed to load review notes:', error);
    } finally {
      setLoadingReviewNotes(false);
    }
  }, [chartId]);

  const handleViewDocument = async (doc: DocumentRow) => {
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


  const [chartStatus, setChartStatus] = useState<
    'Active' | 'Verified Ready' | 'Pending Review' | 'Delivered (Locked)' | 'Needs Reverification' | 'Archived'
  >('Active');

  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);


  const hasUnverifiedMeds = medications.some(med => !med.isVerified);
  const isLocked = chartStatus === 'Delivered (Locked)' || chartStatus === 'Pending Review';

  const [deletingMedicationId, setDeletingMedicationId] = useState<string | null>(null);
  
  // Calculate verification progress
  const verifiedCount = medications.filter(med => med.isVerified).length;
  const totalCount = medications.length;
  const verificationProgress = totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0;

  // Determine dynamic status badge
  const getStatusBadge = () => {
    if (chartStatus === 'Delivered (Locked)') {
      return { icon: '🔒', text: 'Delivered / Locked', classes: 'bg-[#E0E7FF] text-[#4F46E5] border-0' };
    } else if (chartStatus === 'Pending Review') {
      return { icon: '⏳', text: 'Pending Admin Review', classes: 'bg-[#FEF3C7] text-[#F59E0B] border-0' };
    } else if (hasUnverifiedMeds) {
      return { icon: '⚠️', text: 'Re-Verification Needed', classes: 'bg-[#FEF3C7] text-[#92400E] border-0' };
    } else if (verificationProgress === 100) {
      return { icon: '✅', text: 'Verified Ready', classes: 'bg-[#D1FAE5] text-[#10B981] border-0' };
    } else {
      return { icon: '📝', text: 'In Progress', classes: 'bg-[#DBEAFE] text-[#0966CC] border-0' };
    }
  };

  const statusBadge = getStatusBadge();

    useEffect(() => {
    const loadChartData = async () => {
      try {
        if (!chartId || !patientId) return;

        // 1) Patient
        const { data: patientRow, error: patientError } = await supabaseClient
          .from('patients')
          .select('first_name, last_name, date_of_birth')
          .eq('id', patientId)
          .single();

        if (patientError) throw patientError;

        setPatient(prev => ({
  ...prev,
      first_name: patientRow.first_name,
      last_name: patientRow.last_name,
      dob: patientRow.date_of_birth ?? '',
      }));


        // 2) Chart meta (status etc.)
        const { data: chartRow, error: chartError } = await supabaseClient
          .from('charts')
          .select('status')
          .eq('id', chartId)
          .single();

        if (chartError) throw chartError;

        setChartStatus(mapChartStatus(chartRow.status));

        // Load documents list
        loadDocuments();

        // Load review notes if chart needs reverification
        if (chartRow.status === 'needs_reverification') {
          loadReviewNotes();
        }

        // 3) Medications
        const { data: medsRows, error: medsError } = await supabaseClient
          .from('medications')
          .select('id, drug_name, strength, route, frequency, prescriber, scanned_on, ocr_confidence, verified')
          .eq('chart_id', chartId);

        if (medsError) throw medsError;

        const mappedMeds: Medication[] = (medsRows || []).map((m) => ({
          id: m.id,
          drugName: m.drug_name,
          strength: m.strength || '',
          route: m.route || '',
          frequency: m.frequency || '',
          prescriber: m.prescriber || '',
          scannedDate: m.scanned_on
            ? new Date(m.scanned_on).toLocaleDateString()
            : '',
          confidence: m.ocr_confidence != null ? Math.round(Number(m.ocr_confidence) * 100) : 0,
          isVerified: m.verified,
        }));

        setMedications(mappedMeds);
        setLoadError(null);


      } catch (err: any) {
        console.error('Error loading chart detail', err);
        setLoadError(err.message || 'Failed to load chart');
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, [chartId, patientId, prefillMedications]);

  useEffect(() => {
    const addPrefills = async () => {
      if (!prefillMedications || !Array.isArray(prefillMedications)) return;
      for (const med of prefillMedications) {
        try {
          await saveScannedMedication(med as any);
        } catch (e) {
          console.error('Failed to save prefilled medication', e);
        }
      }
    };
    void addPrefills();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open the Add Medication modal and reset form fields
  const openAddMedicationModal = () => {
    setNewMedDrugName('');
    setNewMedStrength('');
    setNewMedRoute('');
    setNewMedFrequency('');
    setNewMedPrescriber('');
    setNewMedScannedOn('');
    setShowAddMedicationModal(true);
  };

  const handleAddMedicationFromModal = async () => {
  if (!newMedDrugName.trim()) {
    alert('Drug name is required');
    return;
  }
  if (!chartId || !user?.tenant_id) {
    alert('Missing chart or tenant information');
    return;
  }

  try {
    setSavingMedication(true);
    console.log('Inserting medication from modal…');

    const { data, error } = await supabaseClient
      .from('medications')
      .insert([
        {
          chart_id: chartId,
          tenant_id: user.tenant_id,
          drug_name: newMedDrugName.trim(),
          strength: newMedStrength || null,
          route: newMedRoute || null,
          frequency: newMedFrequency || null,
          prescriber: newMedPrescriber || null,
          instructions: null,
          notes: null,
          scanned_on: newMedScannedOn
            ? new Date(newMedScannedOn).toISOString()
            : null,
          ocr_confidence: 0.9,     // 0–1 range
          verified: false,         // start unverified
          changed_after_verify: false,
        },
      ])
      .select('*')
      .single();

    console.log('Insert result:', data, error);

    if (error) throw error;

    // Update local list so it shows immediately
    setMedications((prev) => [
      ...prev,
      {
        id: data.id,
        drugName: data.drug_name,
        strength: data.strength || '',
        route: data.route || '',
        frequency: data.frequency || '',
        prescriber: data.prescriber || '',
        scannedDate: data.scanned_on
          ? new Date(data.scanned_on).toLocaleDateString()
          : '',
        confidence: data.ocr_confidence != null
          ? Math.round(Number(data.ocr_confidence) * 100)
          : 0,
        isVerified: data.verified,
      },
    ]);

    // Clear form & close modal
    setNewMedDrugName('');
    setNewMedStrength('');
    setNewMedRoute('');
    setNewMedFrequency('');
    setNewMedPrescriber('');
    setNewMedScannedOn('');
    setShowAddMedicationModal(false);
  } catch (err: any) {
    console.error('Error inserting medication from modal:', err);
    alert(err.message || 'Failed to add medication');
  } finally {
    setSavingMedication(false);
  }
};

  // Save a scanned medication directly to the DB and update local state
  const saveScannedMedication = async (med: Partial<MedicationInfo> | ScannedMedication) => {
    if (!chartId || !user?.tenant_id) {
      alert('Missing chart or tenant information');
      return;
    }

    try {
      setSavingMedication(true);

      const rawConfidence = (med as any).confidence;
      let normalizedConfidence: number | null = null;

      if (typeof rawConfidence === 'number') {
        // If > 1 assume 0–100 and scale down, else assume already 0–1
        normalizedConfidence = rawConfidence > 1 ? rawConfidence / 100 : rawConfidence;
      }

      const payload: any = {
        chart_id: chartId,
        tenant_id: user.tenant_id,
        drug_name: (med as any).name || (med as any).drugName || 'Unknown',
        strength: (med as any).dosage || (med as any).strength || null,
        route: (med as any).route || null,
        frequency: (med as any).frequency || null,
        prescriber: (med as any).prescriber || null,
        instructions: (med as any).instructions || null,
        notes: null,
        scanned_on: new Date().toISOString(),
        ocr_confidence: normalizedConfidence ?? 0.8,
        verified: false,
        changed_after_verify: false,
        scanned_image: (med as any).image || null, // Store the base64 image
      };


      const { data, error } = await supabaseClient
        .from('medications')
        .insert([payload])
        .select('*')
        .single();

      if (error) throw error;

      setMedications((prev) => [
        ...prev,
        {
          id: data.id,
          drugName: data.drug_name,
          strength: data.strength || '',
          route: data.route || '',
          frequency: data.frequency || '',
          prescriber: data.prescriber || '',
          scannedDate: data.scanned_on ? new Date(data.scanned_on).toLocaleDateString() : '',
          confidence: data.ocr_confidence != null ? Math.round(Number(data.ocr_confidence) * 100) : 0,
          isVerified: data.verified,
        },
      ]);

      // Close any scanner UI
      setShowBarcodeScanner(false);
      setShowOCRScanner(false);
      // Provide quick feedback
      alert('Medication added from scan');
    } catch (err: any) {
      console.error('Error inserting scanned medication:', err);
      alert(err.message || 'Failed to add scanned medication');
    } finally {
      setSavingMedication(false);
    }
  };




  // Get confidence indicator
  const getConfidenceIndicator = (confidence: number) => {
    if (confidence >= 85) {
      return { color: 'bg-[#10B981]', label: 'High', message: 'High confidence - AI extraction reliable' };
    } else if (confidence >= 70) {
      return { color: 'bg-[#F59E0B]', label: 'Medium', message: 'Medium confidence - Manual review recommended' };
    } else {
      return { color: 'bg-[#DC2626]', label: 'Low', message: 'Low confidence - Manual verification required' };
    }
  };

  const handleVerify = (medId: string) => {
    navigation.navigate('MedicationVerification', { patientId, chartId, medicationId: medId });
  };

  const handleEdit = (medId: string) => {
    navigation.navigate('MedicationVerification', { patientId, chartId, medicationId: medId, mode: 'edit' });
  };

  const handleDeleteMedication = async (medId: string) => {
  if (isLocked) return;

  const confirmDelete = window.confirm('Are you sure you want to remove this medication from the chart?');
  if (!confirmDelete) return;

  try {
    setDeletingMedicationId(medId);

    const { error } = await supabaseClient
      .from('medications')
      .delete()
      .eq('id', medId);

    if (error) throw error;

    // Update local state so UI reflects the change immediately
    setMedications((prev) => prev.filter((m) => m.id !== medId));
  } catch (err: any) {
    console.error('Failed to delete medication:', err);
    alert(err.message || 'Failed to delete medication');
  } finally {
    setDeletingMedicationId(null);
  }
};


    const handleFinalize = () => {
    if (hasUnverifiedMeds) {
      alert('Please verify all medications before proceeding to chart summary.');
      return;
    }

    navigation.navigate('ChartSummary', {
      patientId,
      chartId,
      patient,
      medications: medications.map((med) => ({
        drugName: med.drugName,
        strength: med.strength,
        route: med.route,
        frequency: med.frequency,
        prescriber: med.prescriber,
        scannedDate: med.scannedDate,
      })),
    });
  };


const handleFileSelected = async (file: File) => {
  try {
    setLoadingDocs(true);

    if(!user?.tenant_id) {
      alert("User tenant ID is missing");
      return;
    }
    if(!chartId) {
      alert("Chart ID is missing");
      return;
    }
      const newDoc = await uploadDocument(file, chartId, user.tenant_id, user.id);
      // update UI immediately
    setDocuments(prev => [...prev, newDoc]);
    alert("Document uploaded!");
  } 
  catch (err: any) {
    console.error("Upload failed:", err);
    alert(err.message || "Failed to upload document");
  } finally {
    setLoadingDocs(false);
  }
};


  const handleDelivery = (method: string) => {
    setPendingDeliveryMethod(method);
    setShowDeliveryConfirmation(true);
  };

  const handleDeleteDocument = async (doc: DocumentRow) => {
    if (isLocked) return;
    try {
      setLoadingDocs(true);
      await deleteDocument(doc.id, doc.file_url);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err: any) {
      console.error('Delete failed:', err);
      alert(err.message || 'Failed to delete document');
    } finally {
      setLoadingDocs(false);
    }
  };

  const confirmDelivery = () => {
    setShowDeliveryConfirmation(false);
    if (pendingDeliveryMethod === 'pdf') {
      // Generate PDF
      alert('PDF generated and downloaded');
    } else if (pendingDeliveryMethod === 'fax') {
      setShowFaxModal(true);
    } else if (pendingDeliveryMethod === 'email') {
      setShowEmailModal(true);
    }
  };

  const handleSendFax = () => {
    alert('Fax sent successfully');
    setShowFaxModal(false);
    setChartStatus('Delivered (Locked)');
  };

  const handleSendEmail = () => {
    alert('Email sent successfully');
    setShowEmailModal(false);
    setChartStatus('Delivered (Locked)');
  };

  const handleArchiveChart = () => {
    setShowArchiveConfirmation(true);
  };

  const confirmArchiveChart = () => {
    setChartStatus('Archived');
    setShowArchiveConfirmation(false);
    alert('Chart archived successfully');
  };

  const handleUnarchiveChart = () => {
    setShowUnarchiveConfirmation(true);
  };

  const confirmUnarchiveChart = () => {
    setChartStatus('Active');
    setShowUnarchiveConfirmation(false);
    alert('Chart restored to Active status');
  };

  const handleUnlockChart = () => {
    setShowUnlockConfirmation(true);
  };

  const confirmUnlockChart = async () => {
    setShowUnlockConfirmation(false);
    if (!chartId) {
      alert('Chart ID missing');
      return;
    }

    try {
      // Persist the unlocked status to the database
      const { data, error } = await supabaseClient
        .from('charts')
        .update({ status: 'active' })
        .eq('id', chartId)
        .select()
        .single();

      if (error) throw error;

      // Update local UI state
      setChartStatus(mapChartStatus(data.status));
      alert('Chart unlocked successfully');
    } catch (err: any) {
      console.error('Failed to unlock chart:', err);
      alert(err.message || 'Failed to unlock chart');
    }
  };

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-[#f8fafc]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0966CC] to-[#0C4A6E] p-5">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigation.goBack()}
              className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1 text-center">
              <h1 className="text-lg text-white">{patient.first_name} {patient.last_name}</h1>
              <p className="text-sm text-white/80">DOB: {patient.dob}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
                  <MoreVertical className="w-5 h-5 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {chartStatus === 'Delivered (Locked)' && (
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
                {chartStatus === 'Active' && (
                  <DropdownMenuItem onClick={handleArchiveChart} className="cursor-pointer text-amber-600">
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Chart
                  </DropdownMenuItem>
                )}
                {chartStatus === 'Verified Ready' && (
                  <DropdownMenuItem onClick={handleArchiveChart} className="cursor-pointer text-amber-600">
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Chart
                  </DropdownMenuItem>
                )}
                {chartStatus === 'Needs Reverification' && (
                  <DropdownMenuItem onClick={handleArchiveChart} className="cursor-pointer text-amber-600">
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Chart
                  </DropdownMenuItem>
                )}
                {chartStatus === 'Archived' && (
                  <DropdownMenuItem onClick={handleUnarchiveChart} className="cursor-pointer text-green-600">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restore to Active
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex justify-center">
            <Badge className={statusBadge.classes}>
              {statusBadge.icon} {statusBadge.text}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-32">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => navigation.goBack()}
                className="flex items-center gap-1 text-[#0966CC] hover:text-[#0C4A6E] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Charts
              </button>
              <span className="text-[#94a3b8]">|</span>
              <span className="text-[#64748b]">Patient: {patient.first_name} {patient.last_name}</span>
              <span className="text-[#94a3b8]">|</span>
              <span className="text-[#64748b]">DOB {patient.dob}</span>
            </div>

            {/* Locked banner */}
            {isLocked && (
              <div className="bg-sky-50 border-2 border-sky-100 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-sky-700" />
                </div>
                <div className="text-slate-700">
                  <p className="text-sm font-medium">This chart is locked</p>
                  <p className="text-xs text-slate-600">Medications and attachments are read-only after delivery. Use the menu to unlock if corrections are needed.</p>
                </div>
              </div>
            )}
          {/* Progress Indicator */}
          {!isLocked && totalCount > 0 && (
            <div className="bg-gradient-to-br from-white to-[#f8fafc] rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E0F2FE] to-[#DBEAFE] flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-[#0966CC]" />
                  </div>
                  <div>
                    <h3 className="text-lg text-[#0f172a]">Verification Progress</h3>
                    <p className="text-sm text-[#64748b]">
                      {verifiedCount} of {totalCount} medications verified
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl text-[#0f172a]">
                    {Math.round(verificationProgress)}%
                  </div>
                  <div className="text-xs text-[#64748b]">Complete</div>
                </div>
              </div>
              <Progress value={verificationProgress} className="h-2.5" />
              {verificationProgress === 100 && (
                <div className="mt-4 flex items-center gap-2 text-sm text-[#10B981] bg-[#D1FAE5]/50 rounded-xl px-3 py-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All medications verified! Ready to finalize.</span>
                </div>
              )}
            </div>
          )}

            {/* Verification Warning */}
            {hasUnverifiedMeds && !isLocked && (
              <div className="bg-gradient-to-br from-[#FEF3C7] to-[#FEF9E7] border-0 rounded-2xl shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[#92400E] mb-1">Verification Required</h3>
                    <p className="text-sm text-[#92400E]/90 leading-relaxed">
                      Some medications have been changed after verification or need initial verification. All fields must be verified before delivery.
                    </p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="flex-shrink-0">
                        <Info className="w-4 h-4 text-[#92400E]/70" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">AI extraction confidence varies. Values below 85% require manual review for safety.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}

            {/* Review Notes - Chart Needs Reverification */}
            {chartStatus === 'Needs Reverification' && reviewNotes.length > 0 && (
              <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-2xl shadow-sm p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-red-900 font-semibold text-lg mb-1">Chart Returned for Corrections</h3>
                    <p className="text-sm text-red-800">
                      This chart has been reviewed by an admin and requires changes. Please review the feedback below and make necessary corrections.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {reviewNotes.map((note, index) => (
                    <div key={note.id || index} className="bg-white rounded-xl p-4 border border-red-200">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {note.reviewer ? `${note.reviewer.first_name} ${note.reviewer.last_name}` : 'Admin'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(note.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {note.note}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-red-200">
                  <p className="text-xs text-red-800 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    After making corrections, verify all medications and submit for review again.
                  </p>
                </div>
              </div>
            )}

            {/* Medications Section */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg text-[#0f172a]">Medications</h2>
                {!isLocked && (
                  <Button
                    onClick={openAddMedicationModal}
                    disabled={savingMedication}
                    className="bg-[#0966CC] hover:bg-[#0C4A6E] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {savingMedication ? 'Adding...' : 'Add Medication'}
                  </Button>
                )}
              </div>
              <Separator className="mb-4" />

              <div className="space-y-3">
                {medications.map((med) => {
                  const confidenceInfo = getConfidenceIndicator(med.confidence);
                  return (
                    <div key={med.id} className="bg-[#f8fafc] rounded-xl border border-[#e2e8f0] p-4 hover:border-[#cbd5e1] transition-colors">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-[#0f172a]">{med.drugName} {med.strength}</h3>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-2 h-2 rounded-full ${confidenceInfo.color}`} />
                                  <span className="text-xs text-[#64748b]">{med.confidence}%</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{confidenceInfo.message}</p>
                              </TooltipContent>
                            </Tooltip>
                            {!isLocked && (
                          <div className="flex items-center gap-2">
                            {!med.isVerified ? (
                              <Button
                                onClick={() => handleVerify(med.id)}
                                size="sm"
                                className="h-7 px-3 bg-[#0966CC] hover:bg-[#0C4A6E] text-white"
                              >
                                Verify
                              </Button>
                            ) : (
                              <Badge className="bg-[#D1FAE5] text-[#10B981] border-[#A7F3D0]">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}

                            <Button
                              onClick={() => handleEdit(med.id)}
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>

                            {/* 🗑 Delete medication */}
                            <Button
                              onClick={() => handleDeleteMedication(med.id)}
                              variant="ghost"
                              size="sm"
                              title="Delete medication"
                              disabled={deletingMedicationId === med.id}
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}

                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm">
                            <div className="pl-3">
                              <span className="text-xs text-[#94a3b8]">Route:</span> <span className="text-[#64748b]">{med.route}</span>
                            </div>
                            <div className="pl-3">
                              <span className="text-xs text-[#94a3b8]">Frequency:</span> <span className="text-[#64748b]">{med.frequency}</span>
                            </div>
                            <div className="pl-3">
                              <span className="text-xs text-[#94a3b8]">Prescriber:</span> <span className="text-[#64748b]">{med.prescriber}</span>
                            </div>
                            <div className="pl-3">
                              <span className="text-xs text-[#94a3b8]">Scanned:</span> <span className="text-[#64748b]">{med.scannedDate}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Attached Documents */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg text-[#0f172a]">Attached Documents</h2>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={loadDocuments}
                    variant="ghost"
                    className="h-9 w-9"
                    title="Refresh"
                    disabled={loadingDocs}
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingDocs ? 'animate-spin' : ''}`} />
                  </Button>
                  {!isLocked && (
                    <Button
                      onClick={() => setShowAttachDocumentModal(true)}
                      variant="outline"
                      className="border-[#e2e8f0]"
                    >
                      <Paperclip className="w-4 h-4 mr-2" />
                      Attach
                    </Button>
                  )}
                </div>
              </div>
              <Separator className="mb-4" />
              
              {!isLocked ? (
                <div
                  className={`border-2 border-dashed rounded-xl p-8 transition-colors ${
                    dragActive 
                      ? 'border-[#0966CC] bg-[#E0F2FE]' 
                      : 'border-[#cbd5e1] bg-[#f8fafc]'
                  }`}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragActive(false);

                    const file = e.dataTransfer.files?.[0];
                    if (!file) return;

                    handleFileSelected(file);
                  }}

                >
                  <div className="text-center">
                    <Upload className="w-12 h-12 text-[#94a3b8] mx-auto mb-3" />
                    <p className="text-[#64748b] mb-2">
                      📎 Drag & drop or{' '}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[#0966CC] hover:text-[#0C4A6E] underline"
                      >
                        browse files
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelected(file);
                        }}
                      />
                    </p>
                    <p className="text-xs text-[#94a3b8]">
                      Accepted: PDF, JPG, PNG
                    </p>
                  </div>
                </div>
              ) : (
                documents.length === 0 ? (
                  <p className="text-sm text-[#64748b]">No documents attached</p>
                ) : null
              )}

              {/* Documents list (always visible below, regardless of lock state) */}
              <div className="mt-4">
                {loadingDocs ? (
                  <p className="text-sm text-[#64748b]">Loading documents…</p>
                ) : docsError ? (
                  <p className="text-sm text-red-600">{docsError}</p>
                ) : documents.length === 0 ? (
                  <p className="text-sm text-[#64748b]">No documents attached to this chart yet.</p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3"
                      >
                        <div>
                          <p className="text-sm text-[#0f172a] font-medium">{doc.file_name}</p>
                          <p className="text-xs text-[#64748b]">
                            {doc.file_type} • {new Date(doc.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleViewDocument(doc)}
                            variant="ghost"
                            size="sm"
                            className="text-[#0966CC] hover:text-[#0C4A6E] hover:bg-[#E0F2FE]"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          {!isLocked && (
                            <Button
                              onClick={() => handleDeleteDocument(doc)}
                              variant="ghost"
                              className="h-9 w-9"
                              title="Delete"
                              disabled={loadingDocs}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>


        {/* Sticky Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#e2e8f0] shadow-lg p-4 z-10">
          <div className="max-w-4xl mx-auto">
            {!isLocked && verificationProgress === 100 ? (
              <div className="flex gap-3">
                <Button
                  onClick={openAddMedicationModal}
                  disabled={savingMedication}
                  variant="outline"
                  className="flex-1 h-12 border-2 border-[#e2e8f0]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {savingMedication ? 'Adding...' : 'Add Medication'}
                </Button>
                <Button
                  onClick={handleFinalize}
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Finalize Chart
                </Button>
              </div>
            ) : !isLocked ? (
              <div className="flex gap-3">
                <Button
                  onClick={openAddMedicationModal}
                  disabled={savingMedication}
                  variant="outline"
                  className="flex-1 h-12 border-2 border-[#e2e8f0]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {savingMedication ? 'Adding...' : 'Add Medication'}
                </Button>
                <Button
                  onClick={() => {
                    // Save draft
                    alert('Draft saved');
                  }}
                  className="flex-1 h-12 bg-[#0966CC] hover:bg-[#0C4A6E] text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => navigation.goBack()}
                variant="outline"
                className="w-full h-12 border-2 border-[#e2e8f0]"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Charts
              </Button>
            )}
          </div>
        </div>

      {/* Add Medication Modal */}
      <Dialog open={showAddMedicationModal} onOpenChange={setShowAddMedicationModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Medication</DialogTitle>
            <DialogDescription>Add a new medication to this chart</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Scan Button */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  // Close manual input modal and open barcode scanner
                  setShowAddMedicationModal(false);
                  setShowBarcodeScanner(true);
                }}
                className="h-12 rounded-xl bg-[#0966CC] hover:bg-[#0C4A6E] text-white"
              >
                <Camera className="w-4 h-4 mr-2" />
                Scan Barcode
              </Button>
              <Button
                onClick={() => {
                  // Close manual input modal and open OCR scanner
                  setShowAddMedicationModal(false);
                  setShowOCRScanner(true);
                }}
                variant="outline"
                className="h-12 rounded-xl border-2 border-[#e2e8f0]"
              >
                <FileText className="w-4 h-4 mr-2" />
                OCR Label
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#e2e8f0]"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-[#64748b]">or enter manually</span>
              </div>
            </div>
            <div>
              <Label htmlFor="drugName">Drug Name *</Label>
              <Input
                id="drugName"
                placeholder="Enter drug name"
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
                value={newMedDrugName}
                onChange={(e) => setNewMedDrugName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="strength">Strength</Label>
                <Input
                  id="strength"
                  placeholder="e.g., 500 mg"
                  className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
                  value={newMedStrength}
                  onChange={(e) => setNewMedStrength(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="route">Route</Label>
                <Input
                  id="route"
                  placeholder="e.g., PO"
                  className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
                  value={newMedRoute}
                  onChange={(e) => setNewMedRoute(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Input
                  id="frequency"
                  placeholder="e.g., BID"
                  className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
                  value={newMedFrequency}
                  onChange={(e) => setNewMedFrequency(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="prescriber">Prescriber</Label>
                <Input
                  id="prescriber"
                  placeholder="Dr. Name"
                  className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
                  value={newMedPrescriber}
                  onChange={(e) => setNewMedPrescriber(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="scannedOn">Scanned On</Label>
              <Input
                id="scannedOn"
                type="datetime-local"
                placeholder="mm/dd/yyyy --:-- --"
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
                value={newMedScannedOn}
                onChange={(e) => setNewMedScannedOn(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowAddMedicationModal(false)}
              variant="outline"
              className="flex-1 h-12 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMedicationFromModal}
              disabled={savingMedication || !newMedDrugName.trim()}
              className="flex-1 h-12 rounded-xl bg-[#0966CC] hover:bg-[#0C4A6E] text-white"
            >
              {savingMedication ? 'Adding…' : 'Add Medication'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fax Modal */}
      <Dialog open={showFaxModal} onOpenChange={setShowFaxModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send via Fax</DialogTitle>
            <DialogDescription>Enter the fax number to send this chart</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="faxNumber">Fax Number *</Label>
              <Input
                id="faxNumber"
                type="tel"
                placeholder="(555) 123-4567"
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
              />
            </div>
            <div>
              <Label htmlFor="faxNote">Note (Optional)</Label>
              <Input
                id="faxNote"
                placeholder="Add a note for the recipient"
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowFaxModal(false)}
              variant="outline"
              className="flex-1 h-12 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendFax}
              className="flex-1 h-12 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              Send Fax
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send via Email</DialogTitle>
            <DialogDescription>Enter the email address to send this chart</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="emailAddress">Email Address *</Label>
              <Input
                id="emailAddress"
                type="email"
                placeholder="recipient@example.com"
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
              />
            </div>
            <div>
              <Label htmlFor="emailSubject">Subject</Label>
              <Input
                id="emailSubject"
                defaultValue={`Patient Chart - ${patient.first_name} ${patient.last_name}`}
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
              />
            </div>
            <div>
              <Label htmlFor="emailMessage">Message (Optional)</Label>
              <Input
                id="emailMessage"
                placeholder="Add a message"
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-[#f8fafc]"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowEmailModal(false)}
              variant="outline"
              className="flex-1 h-12 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              className="flex-1 h-12 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attach Document Modal */}
      <Dialog open={showAttachDocumentModal} onOpenChange={setShowAttachDocumentModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Attach Document</DialogTitle>
            <DialogDescription>Choose how you want to capture the document</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <button
              onClick={() => {
                setShowAttachDocumentModal(false);
                // Handle bottle photo logic
              }}
              className="w-full bg-white rounded-xl border-2 border-[#e2e8f0] p-4 hover:border-[#0966CC] hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6 text-[#0966CC]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[#0f172a] mb-1">Bottle Photo</h4>
                  <p className="text-sm text-[#64748b]">Scan medication bottle labels</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setShowAttachDocumentModal(false);
                // Handle document scan logic
              }}
              className="w-full bg-white rounded-xl border-2 border-[#e2e8f0] p-4 hover:border-[#0966CC] hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-[#10B981]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[#0f172a] mb-1">Document Scan</h4>
                  <p className="text-sm text-[#64748b]">Scan paper documents (DC summary, PCP med list, referrals)</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setShowAttachDocumentModal(false);
                // Handle import logic
              }}
              className="w-full bg-white rounded-xl border-2 border-[#e2e8f0] p-4 hover:border-[#0966CC] hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Download className="w-6 h-6 text-[#F59E0B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[#0f172a] mb-1">Import PDF/Image</h4>
                  <p className="text-sm text-[#64748b]">Import a PDF or photo of a document</p>
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

        {/* Barcode Scanner Modal */}
        {showBarcodeScanner && (
          <MedicationBarcodeScanner
            onMedicationsScanned={(meds: ScannedMedication[]) => {
              const m = meds[0];
              if (m) {
                // Persist immediately
                void saveScannedMedication(m);
              } else {
                setShowBarcodeScanner(false);
              }
            }}
            onCancel={() => setShowBarcodeScanner(false)}
          />
        )}
        {/* OCR Scanner Modal */}
        {showOCRScanner && (
          <MedicationOCRScanner
            onMedicationsScanned={(meds: Partial<MedicationInfo>[]) => {
              const m = meds[0];
              if (m) {
                void saveScannedMedication(m);
              } else {
                setShowOCRScanner(false);
              }
            }}
            onCancel={() => setShowOCRScanner(false)}
            modal={true}
          />
        )}

        {/* Delivery Confirmation Dialog */}
        <AlertDialog open={showDeliveryConfirmation} onOpenChange={setShowDeliveryConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delivery</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to send this chart?
                <br />
                <strong className="text-[#92400E]">⚠️ This chart will be locked after delivery.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-12 rounded-xl">
                ❌ Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelivery}
                className="h-12 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white"
              >
                ✅ Confirm & Deliver
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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

        {/* Document View Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{viewingDocument?.file_name || 'Document'}</DialogTitle>
              <DialogDescription>
                {viewingDocument?.file_type} • Uploaded {viewingDocument?.created_at ? new Date(viewingDocument.created_at).toLocaleString() : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {loadingSignedUrl ? (
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <RefreshCw className="w-8 h-8 text-[#F59E0B] animate-spin mx-auto mb-2" />
                    <p className="text-sm text-[#64748b]">Loading document...</p>
                  </div>
                </div>
              ) : viewingDocument?.file_type?.includes('pdf') ? (
                <iframe
                  src={signedUrl}
                  className="w-full h-[600px] border-0 rounded-lg"
                  title={viewingDocument.file_name}
                />
              ) : (
                <div className="flex items-center justify-center p-4">
                  <img
                    src={signedUrl}
                    alt={viewingDocument?.file_name || 'Document'}
                    className="max-w-full max-h-[600px] object-contain rounded-lg"
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
