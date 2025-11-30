import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  AlertCircle,
  Calendar,
  Pill,
  ChevronRight,
  Bell,
  LogOut,
  Activity,
  Menu,
  User,
  Settings,
  Lock,
  FileText,
  CheckCircle2,
  Clock,
  Camera,
  Filter,
  SortAsc,
  SortDesc,
  Zap,
  List,
  RefreshCw,
  Wifi,
  WifiOff,
  Play,
  Archive,
  X,
  CheckCircle,
  Loader2,
  Info,
  Scan,
  Barcode,
  Upload,
  Mail,
  Phone,
  MapPin,
  Shield,
  Briefcase,
  GraduationCap,
  BadgeCheck,
  Building2,
  Edit,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileUp,
  ClipboardCheck,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { Progress } from '../../components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Separator } from '../../components/ui/separator';
import { Alert, AlertDescription } from '../../components/ui/alert';
import NotificationCenter from '../../components/NotificationCenter';
import { notificationService } from '../../services/notificationService';
import { Screen, NavigationParams } from '../../App';
import { useAuth } from '../../context/AuthContext';
import { fetchPatientsForClinician } from '../../services/patientService';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import { motion, AnimatePresence } from 'motion/react';
import PatientSelectionModal from '../../components/PatientSelectionModal';
import MedicationBarcodeScanner, { ScannedMedication } from '../../components/MedicationBarcodeScanner';
import MedicationOCRScanner from '../../components/MedicationOCRScanner';
import PDFScanner from '../../components/PDFScanner';
import type { MedicationInfo } from '../../utils/ocrService';

// Time formatting utility for healthcare-friendly display
const formatLastEditedTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Just now (< 2 minutes)
  if (diffMins < 2) {
    return 'Just now';
  }

  // Less than 60 minutes
  if (diffMins < 60) {
    return `Edited ${diffMins} min ago`;
  }

  // Less than 24 hours - show "today at time"
  if (diffHours < 24) {
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `Edited today at ${timeStr}`;
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Edited yesterday';
  }

  // This week (last 7 days) - show day name
  if (diffDays < 7) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `Edited ${dayName}`;
  }

  // Older - show full date
  return `Edited ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })}`;
};

interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
  route?: {
    params?: NavigationParams;
  };
}

type TabType = 'dashboard' | 'charts' | 'profile' | 'settings';
type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'status';
type FilterStatus = 'all' | 'Active' | 'Verified Ready' | 'Pending Review' | 'Delivered (Locked)' | 'Needs Reverification' | 'Archived';

interface Patient {
  id: string;
  name: string;
  dob: string;
  charts: Chart[];
}

interface Chart {
  id: string;
  status: 'Active' | 'Verified Ready' | 'Pending Review' | 'Delivered (Locked)' | 'Needs Reverification' | 'Archived';
  type: 'Bottle Scan' | 'PDF Import' | 'Manual Entry';
  medicationCount: number;
  verifiedMedicationCount?: number;
  createdDate: string;
  createdBy: string;
  finalizedDate?: string;
}

const mapChartStatus = (status: string): Chart['status'] => {
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
      // fallback so UI doesn't explode
      return 'Active';
  }
};

const mapChartSourceToType = (source: string): Chart['type'] => {
  switch (source) {
    case 'bottle_scan':
      return 'Bottle Scan';
    case 'pdf_import':
      return 'PDF Import';
    case 'image_upload':
      return 'Manual Entry'; // or "Image Upload" if you change the union
    case 'empty_chart':
      return 'Manual Entry';
    default:
      return 'Manual Entry';
  }
};


export default function ClinicianDashboard({ navigation, route }: Props) {
  const { logout, user } = useAuth();
  // Patients state from database
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isPatientsLoading, setIsPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);

  // Auto-open PDF scanner if navigated with that parameter
  useEffect(() => {
    if (route?.params?.openPDFScanner) {
      setShowPDFScanner(true);
    }
  }, [route?.params?.openPDFScanner]);

  useEffect(() => {
    async function loadPatients() {
      setIsPatientsLoading(true);
      setPatientsError(null);
      try {
        const clinicianId = user?.id;
        if (!clinicianId) {
          setPatientsError('Clinician ID not found');
          setIsPatientsLoading(false);
          return;
        }
        const data = await fetchPatientsForClinician(clinicianId);

// Map the data to match the Patient interface
const mappedData: Patient[] = (data || []).map((patient: any) => ({
  id: patient.id,
  name: `${patient.first_name} ${patient.last_name}`,
  dob: patient.date_of_birth, // you can format later when rendering
  charts: (patient.charts || []).map((chart: any) => ({
    id: chart.id,
    status: mapChartStatus(chart.status),
    type: mapChartSourceToType(chart.source),
    medicationCount: Array.isArray(chart.medications) ? chart.medications.length : 0,
    verifiedMedicationCount: chart.medications.filter((m: any) => m.verified).length,
    createdDate: chart.created_at,
    createdBy: chart.created_by,
    finalizedDate: chart.finalized_at ?? undefined,
  })),
}));

console.log('Mapped patient data:', mappedData);
setPatients(mappedData);

      } catch (err: any) {
        setPatientsError(err.message || 'Failed to fetch patients');
      } finally {
        setIsPatientsLoading(false);
      }
    }
    loadPatients();
  }, [user?.id]);
  //barcode/ocr stuff
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showOCRScanner, setShowOCRScanner] = useState(false);
  const [showPDFScanner, setShowPDFScanner] = useState(false);
  const [scanTypeForSelection, setScanTypeForSelection] = useState<string>('');
  const [scannedForSelection, setScannedForSelection] = useState<Partial<MedicationInfo>[]>([]);
  const [scannedPatientInfo, setScannedPatientInfo] = useState<any>(null);
  const [scannedPDFFile, setScannedPDFFile] = useState<File | null>(null);
  const [showPatientSelection, setShowPatientSelection] = useState(false);
  const [showScanOptions, setShowScanOptions] = useState(false);
  const [isScanSheetOpen, setIsScanSheetOpen] = useState(false);


  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [activeFilterChip, setActiveFilterChip] = useState<FilterStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [showReviewBanner, setShowReviewBanner] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedEmail, setEditedEmail] = useState('anna.clinician@luminous.com');
  const [editedPhone, setEditedPhone] = useState('(555) 123-4567');
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{ score: number; label: string; color: string } | null>(null);
  const [passwordRules, setPasswordRules] = useState<{
    length: boolean;
    upperLower: boolean;
    numberOrSymbol: boolean;
  }>({ length: false, upperLower: false, numberOrSymbol: false });

  // Password validation functions
  const getPasswordRules = (password: string) => {
    return {
      length: password.length >= 8,
      upperLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
      numberOrSymbol: /[0-9\W]/.test(password)
    };
  };

  // Update password strength and rules when password changes
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength(null);
      setPasswordRules({ length: false, upperLower: false, numberOrSymbol: false });
      return;
    }
    
    const strength = calculatePasswordStrength(newPassword);
    setPasswordStrength(strength);
    setPasswordRules(getPasswordRules(newPassword));
  }, [newPassword]);
  
  // Quick filter chips
  const [quickFilterChips, setQuickFilterChips] = useState<FilterStatus[]>([]);
  
  // Table sorting
  const [sortByColumn, setSortByColumn] = useState<'created' | 'status' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Scan sheet
  // Scan sheet (state declared earlier near barcode/ocr setup)

  // Calculate stats (must be before useEffects that use these values)
  const totalPatients = patients.length;
  const needsReverificationCount = patients.reduce((sum, p) => sum + (p.charts?.filter(c => c.status === 'Needs Reverification').length || 0), 0);
  const activeCount = patients.reduce((sum, p) => sum + (p.charts?.filter(c => c.status === 'Active').length || 0), 0);
  const verifiedReadyCount = patients.reduce((sum, p) => sum + (p.charts?.filter(c => c.status === 'Verified Ready').length || 0), 0);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('synced');
      toast.success('Back online - Synced successfully', {
        duration: 3000,
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show review banner if needed
  useEffect(() => {
    if (needsReverificationCount > 0) {
      setShowReviewBanner(true);
    }
  }, [needsReverificationCount]);

  const handleSignOut = () => {
    logout();
    navigation.navigate('Landing');
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setIsDrawerOpen(false);
  };

  // Accept both patientId and chartId (used in list and dashboard quick actions)
  const handleSelectChart = (patientId: string, chartId: string) => {
    navigation.navigate('ChartDetail', { patientId, chartId });
  };

  // Pull to refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;

    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchEnd - touchStart;

    // If pulled down more than 100px at the top of the page
    if (diff > 100 && window.scrollY === 0) {
      handleRefresh();
    }

    setTouchStart(null);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const handleScanOption = (scanType: string) => {
  setShowScanOptions(false);
  setIsScanSheetOpen(false);
  setScanTypeForSelection(scanType);

  if (scanType === 'Barcode Scan') {
    setShowBarcodeScanner(true);
  } else if (scanType === 'Bottle OCR') {
    setShowOCRScanner(true);
  } else if (scanType === 'Import PDF') {
    setShowPDFScanner(true); // Use dedicated PDF scanner
  }
};


  // Toggle quick filter chip
  const toggleQuickFilterChip = (status: FilterStatus) => {
    if (quickFilterChips.includes(status)) {
      setQuickFilterChips(quickFilterChips.filter(s => s !== status));
    } else {
      setQuickFilterChips([...quickFilterChips, status]);
    }
  };

  // Handle column sort
  const handleColumnSort = (column: 'created' | 'status') => {
    if (sortByColumn === column) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortByColumn(column);
      setSortDirection('desc');
    }
  };

  // Filter and sort charts
  const getFilteredAndSortedCharts = () => {
    let allCharts: Array<{ patient: Patient; chart: Chart }> = [];

    patients.forEach(patient => {
      patient.charts?.forEach(chart => {
        allCharts.push({ patient, chart });
      });
    });

    // Apply search filter
    if (searchQuery) {
      allCharts = allCharts.filter(item =>
        item.patient.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter from dropdown
    if (filterStatus !== 'all') {
      allCharts = allCharts.filter(item => item.chart.status === filterStatus);
    }

    // Apply quick filter chips (OR logic - show if matches any chip)
    if (quickFilterChips.length > 0) {
      allCharts = allCharts.filter(item => quickFilterChips.includes(item.chart.status as FilterStatus));
    }

    // Apply column sorting (overrides dropdown sorting when active)
    if (sortByColumn === 'created') {
      allCharts.sort((a, b) => {
        const dateA = new Date(a.chart.createdDate).getTime();
        const dateB = new Date(b.chart.createdDate).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else if (sortByColumn === 'status') {
      const statusOrder = { 'Needs Reverification': 0, 'Active': 1, 'Verified Ready': 2, 'Pending Review': 3, 'Delivered (Locked)': 4, 'Archived': 5 };
      allCharts.sort((a, b) => {
        const orderA = statusOrder[a.chart.status] || 999;
        const orderB = statusOrder[b.chart.status] || 999;
        return sortDirection === 'asc' ? orderA - orderB : orderB - orderA;
      });
    } else {
      // Apply dropdown sorting
      allCharts.sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.chart.createdDate).getTime() - new Date(a.chart.createdDate).getTime();
          case 'oldest':
            return new Date(a.chart.createdDate).getTime() - new Date(b.chart.createdDate).getTime();
          case 'name-asc':
            return a.patient.name.localeCompare(b.patient.name);
          case 'name-desc':
            return b.patient.name.localeCompare(a.patient.name);
          case 'status':
            const statusOrder = { 'Needs Reverification': 0, 'Active': 1, 'Verified Ready': 2, 'Pending Review': 3, 'Delivered (Locked)': 4, 'Archived': 5 };
            return (statusOrder[a.chart.status] || 999) - (statusOrder[b.chart.status] || 999);
          default:
            return 0;
        }
      });
    }

    return allCharts;
  };

  const filteredCharts = getFilteredAndSortedCharts();

  // Status Helper Functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Needs Reverification':
        return <AlertCircle className="w-3.5 h-3.5" />;
      case 'Active':
        return <FileText className="w-3.5 h-3.5" />;
      case 'Verified Ready':
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'Delivered (Locked)':
        return <Lock className="w-3.5 h-3.5" />;
      case 'Archived':
        return <Archive className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Needs Reverification':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Active':
        return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'Verified Ready':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Delivered (Locked)':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Archived':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return '';
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Needs Reverification':
        return 'Needs Review';
      case 'Verified Ready':
        return 'Verified';
      case 'Delivered (Locked)':
        return 'Locked';
      default:
        return status;
    }
  };

  const getStatusTooltip = (status: string) => {
    switch (status) {
      case 'Needs Reverification':
        return 'Chart awaiting review before medication verification';
      case 'Active':
        return 'Currently in progress';
      case 'Verified Ready':
        return 'All medications verified and ready for delivery';
      case 'Delivered (Locked)':
        return 'Chart has been finalized and locked';
      case 'Archived':
        return 'Chart has been archived';
      default:
        return status;
    }
  };

  // Sidebar Navigation Component
  const renderSidebarNav = () => (
    <nav className="space-y-1">
      <button
        onClick={() => {
          setActiveTab('dashboard');
          setIsDrawerOpen(false);
        }}
        className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors ${
          activeTab === 'dashboard'
            ? 'bg-[#E0F2FE] text-[#0966CC]'
            : 'text-[#64748b] hover:bg-[#f8fafc]'
        }`}
      >
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5" />
          <span>Dashboard</span>
        </div>
        {needsReverificationCount > 0 && (
          <Badge className="bg-[#DC2626] text-white border-0 h-5 min-w-5 px-1.5 flex items-center justify-center">
            {needsReverificationCount}
          </Badge>
        )}
      </button>
      <button
        onClick={() => {
          setActiveTab('charts');
          setIsDrawerOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
          activeTab === 'charts'
            ? 'bg-[#E0F2FE] text-[#0966CC]'
            : 'text-[#64748b] hover:bg-[#f8fafc]'
        }`}
      >
        <FileText className="w-5 h-5" />
        <span>My Charts</span>
      </button>
      <button
        onClick={() => {
          setActiveTab('profile');
          setIsDrawerOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
          activeTab === 'profile'
            ? 'bg-[#E0F2FE] text-[#0966CC]'
            : 'text-[#64748b] hover:bg-[#f8fafc]'
        }`}
      >
        <User className="w-5 h-5" />
        <span>Profile</span>
      </button>
      <button
        onClick={() => {
          setActiveTab('settings');
          setIsDrawerOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
          activeTab === 'settings'
            ? 'bg-[#E0F2FE] text-[#0966CC]'
            : 'text-[#64748b] hover:bg-[#f8fafc]'
        }`}
      >
        <Settings className="w-5 h-5" />
        <span>Settings</span>
      </button>
    </nav>
  );

  // Dashboard Tab Content
  const renderDashboard = () => (
    <div className="space-y-6" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Pull to refresh indicator */}
      {isRefreshing && (
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="w-5 h-5 text-[#0966CC] animate-spin" />
          <span className="ml-2 text-sm text-[#64748b]">Refreshing...</span>
        </div>
      )}

      {/* Review Alert Banner */}
      {showReviewBanner && needsReverificationCount > 0 && (
        <div className="bg-gradient-to-r from-[#FEF2F2] to-[#FEE2E2] rounded-2xl shadow-sm border border-[#FECACA] p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DC2626]/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-[#DC2626]" />
              </div>
              <div>
                <p className="text-[15px] text-[#991B1B]">
                  <span className="font-semibold">{needsReverificationCount} chart{needsReverificationCount !== 1 ? 's need' : ' needs'} review</span>
                </p>
                <p className="text-sm text-[#DC2626]">Patient medication list requires verification before continuing</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setActiveFilterChip('Needs Reverification');
                  setFilterStatus('Needs Reverification');
                  setShowReviewBanner(false);
                }}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm"
              >
                View Now
              </Button>
              <button
                onClick={() => setShowReviewBanner(false)}
                className="w-8 h-8 rounded-lg hover:bg-[#FEE2E2] flex items-center justify-center transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4 text-[#DC2626]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Panel - Lightened */}
      <div className="bg-gradient-to-r from-sky-50 to-sky-100 rounded-2xl border border-sky-200 px-5 md:px-6 py-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-sky-600" />
          <h3 className="text-sm font-semibold text-slate-700">Quick Actions</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Primary Actions */}
          <button
            onClick={() => navigation.navigate('NewPatientChart')}
            className="flex-1 min-w-[160px] bg-white hover:bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3.5 transition-all text-left group shadow-sm hover:shadow-md hover:ring-1 hover:ring-sky-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5 text-sky-600" />
              </div>
              <div className="flex-1">
                <div className="text-[15px] text-slate-900 mb-0.5">New Chart</div>
                <div className="text-sm text-slate-600">Create patient chart</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors" />
            </div>
          </button>
          <button
            onClick={() => setShowScanOptions(true)}
            className="flex-1 min-w-[160px] bg-white hover:bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3.5 transition-all text-left group shadow-sm hover:shadow-md hover:ring-1 hover:ring-emerald-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="text-[15px] text-slate-900 mb-0.5">Scan</div>
                <div className="text-sm text-slate-600">Capture medications</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </div>
          </button>
          <button
            onClick={() => navigation.navigate('PatientChartList')}
            className="flex-1 min-w-[160px] bg-white hover:bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3.5 transition-all text-left group shadow-sm hover:shadow-md hover:ring-1 hover:ring-sky-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <List className="w-5 h-5 text-sky-600" />
              </div>
              <div className="flex-1">
                <div className="text-[15px] text-slate-900 mb-0.5">All Charts</div>
                <div className="text-sm text-slate-600">View full list</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-colors" />
            </div>
          </button>
        </div>
      </div>

      {/* Scan Options Sheet */}
      <Sheet open={showScanOptions} onOpenChange={setShowScanOptions}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Choose Scan Method</SheetTitle>
            <SheetDescription>
              Select how you want to capture medication information. The system will automatically detect if the patient exists.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-3 pb-6">
            {/* Manual Entry */}
            <button
              onClick={() => {
                setShowScanOptions(false);
                navigation.navigate('NewPatientChart');
              }}
              className="w-full bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-sky-400 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-200 transition-colors">
                  <Plus className="w-6 h-6 text-sky-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-slate-900 font-medium mb-1">Manual Entry</h4>
                  <p className="text-sm text-slate-600">Type patient and medication details manually</p>
                </div>
              </div>
            </button>

            {/* Barcode Scan */}
            <button
              onClick={() => handleScanOption('Barcode Scan')}
              className="w-full bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-emerald-400 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                  <Barcode className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-slate-900 font-medium mb-1">Scan Barcode</h4>
                  <p className="text-sm text-slate-600">Quick medication lookup via barcode</p>
                </div>
              </div>
            </button>

            {/* Bottle OCR */}
            <button
              onClick={() => handleScanOption('Bottle OCR')}
              className="w-full bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-violet-400 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-200 transition-colors">
                  <Camera className="w-6 h-6 text-violet-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-slate-900 font-medium mb-1">Scan Bottle (OCR)</h4>
                  <p className="text-sm text-slate-600">Capture text from medication bottle labels</p>
                </div>
              </div>
            </button>

            {/* Import PDF */}
            <button
              onClick={() => handleScanOption('Import PDF')}
              className="w-full bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-amber-400 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                  <Upload className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-slate-900 font-medium mb-1">Import PDF/Image</h4>
                  <p className="text-sm text-slate-600">Upload discharge summaries or med lists</p>
                </div>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Scan Options Sheet - From Quick Action Button */}
      <Sheet open={isScanSheetOpen} onOpenChange={setIsScanSheetOpen}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Scan Medication Information</SheetTitle>
            <SheetDescription>
              Choose how you want to capture medication data
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-3 pb-6">
            {/* Barcode Scan */}
            <button
              onClick={() => handleScanOption('Barcode Scan')}
              className="w-full bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-emerald-400 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                  <Scan className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-slate-900 font-medium mb-1">Scan Barcode</h4>
                  <p className="text-sm text-slate-600">Quick medication lookup via barcode</p>
                </div>
              </div>
            </button>

            {/* Bottle OCR */}
            <button
              onClick={() => handleScanOption('Bottle OCR')}
              className="w-full bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-violet-400 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-200 transition-colors">
                  <Camera className="w-6 h-6 text-violet-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-slate-900 font-medium mb-1">Scan Bottle (OCR)</h4>
                  <p className="text-sm text-slate-600">Capture text from medication bottle labels</p>
                </div>
              </div>
            </button>

            {/* Import PDF */}
            <button
              onClick={() => handleScanOption('Import PDF')}
              className="w-full bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-amber-400 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                  <Upload className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-slate-900 font-medium mb-1">Import PDF/Image</h4>
                  <p className="text-sm text-slate-600">Upload discharge summaries or med lists</p>
                </div>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>

        {/* Global Barcode Scanner */}
      {showBarcodeScanner && (
        <MedicationBarcodeScanner
          onMedicationsScanned={(meds: ScannedMedication[]) => {
            const converted: Partial<MedicationInfo>[] = meds.map(m => ({
              name: m.name,
              dosage: m.dosage,
              frequency: m.frequency,
              route: m.route,
            }));
            setShowBarcodeScanner(false);
            setScannedForSelection(converted);
            setShowPatientSelection(true);
          }}
          onCancel={() => setShowBarcodeScanner(false)}
        />
      )}

      {/* Global OCR Scanner */}
      {showOCRScanner && (
        <MedicationOCRScanner
          onMedicationsScanned={(meds: Partial<MedicationInfo>[], patientInfo?: any) => {
            setShowOCRScanner(false);
            setScannedForSelection(meds);
            // Store patient info for passing to NewPatientChart
            if (patientInfo) {
              console.log('Patient info from PDF:', patientInfo);
              setScannedPatientInfo(patientInfo);
            }
            setShowPatientSelection(true);
          }}
          onCancel={() => setShowOCRScanner(false)}
          modal={true}
        />
      )}

      {/* PDF Scanner (dedicated for multi-page PDFs) */}
      {showPDFScanner && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <PDFScanner
              onPDFScanned={(meds: Partial<MedicationInfo>[], patientInfo?: any, originalFile?: File) => {
                setShowPDFScanner(false);
                setScannedForSelection(meds);
                if (patientInfo) {
                  console.log('Patient info from PDF:', patientInfo);
                  setScannedPatientInfo(patientInfo);
                }
                if (originalFile) {
                  console.log('Storing PDF file for attachment:', originalFile.name);
                  setScannedPDFFile(originalFile);
                }
                setShowPatientSelection(true);
              }}
              onCancel={() => setShowPDFScanner(false)}
              modal={true}
            />
          </div>
        </div>
      )}

      {/* Patient Selection after scan */}
      {showPatientSelection && (
        <PatientSelectionModal
          scannedMedications={scannedForSelection}
          scanType={scanTypeForSelection}
          patients={patients.map(p => ({
            id: p.id,
            firstName: p.name.split(' ')[0] || p.name,
            lastName: p.name.split(' ').slice(1).join(' '),
            dateOfBirth: p.dob,
          }))}
          onSelectExistingPatient={(patientId) => {
            const p = patients.find(px => px.id === patientId);
            setShowPatientSelection(false);
            if (p) {
              navigation.navigate('ChartDetail', {
                patientId: p.id,
                chartId: p.charts[0]?.id,
                prefillMedications: scannedForSelection,
              });
            }
          }}
          onCreateNewPatient={() => {
            setShowPatientSelection(false);
            // Pass both medications and patient info to avoid re-scanning
            const navParams: any = {
              scannedMedications: scannedForSelection,
              scanType: scanTypeForSelection,
              prefillData: scannedPatientInfo ? {
                firstName: scannedPatientInfo.firstName,
                lastName: scannedPatientInfo.lastName,
                dateOfBirth: scannedPatientInfo.dateOfBirth,
                phone: scannedPatientInfo.phone,
                address: scannedPatientInfo.address,
                medicalRecordNumber: scannedPatientInfo.medicalRecordNumber,
              } : undefined,
            };
            
            // Include PDF file if it was scanned
            if (scannedPDFFile) {
              navParams.attachments = [scannedPDFFile];
            }
            
            navigation.navigate('NewPatientChart', navParams);
          }}
          onCancel={() => setShowPatientSelection(false)}
        />
      )}

      {/* Sync Status - Streamlined */}
      <div className="flex items-center justify-end" aria-live="polite" role="status">
        <div className="flex items-center gap-2">
          {syncStatus === 'synced' ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D1FAE5] text-[#047857]">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">Synced just now</span>
            </div>
          ) : syncStatus === 'syncing' ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DBEAFE] text-[#0369A1]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-sm font-medium">Syncing...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FEE2E2] text-[#991B1B]">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">Offline • 3 pending uploads</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats - All Clickable KPIs in One Row */}
      <div className="mt-1">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-sky-600" />
          <h3 className="text-sm font-semibold text-slate-700">Overview</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {/* Needs Review - PROMOTED with Tooltip & Animation */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  key={needsReverificationCount}
                  initial={{ scale: 1 }}
                  animate={needsReverificationCount > 0 ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="w-full"
                >
                  <button
                    onClick={() => {
                      setActiveFilterChip('Needs Reverification');
                      setFilterStatus('Needs Reverification');
                      setShowReviewBanner(false);
                    }}
                    className="bg-gradient-to-br from-[#FEE2E2] to-[#FECACA] rounded-2xl shadow-sm hover:shadow-lg transition-all p-5 text-left border-l-4 border-[#DC2626] hover:ring-2 hover:ring-[#DC2626]/30 w-full"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#DC2626]/10 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-[#DC2626]" />
                      </div>
                      <div>
                        <motion.p 
                          key={`count-${needsReverificationCount}`}
                          initial={{ opacity: 0.5 }}
                          animate={{ opacity: 1 }}
                          className="text-2xl text-[#DC2626] font-semibold"
                        >
                          {needsReverificationCount}
                        </motion.p>
                        <p className="text-xs font-semibold text-[#991B1B]">Needs Review</p>
                      </div>
                    </div>
                  </button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>Patient charts requiring verification of medication list before continuing</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <button
            onClick={() => {
              setActiveFilterChip('Active');
              setFilterStatus('Active');
            }}
            className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-5 text-left hover:ring-1 hover:ring-sky-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#DBEAFE] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#0966CC]" />
              </div>
              <div>
                <p className="text-2xl text-[#0f172a] font-semibold">{activeCount}</p>
                <p className="text-xs font-semibold text-[#64748b]">Active</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => {
              setActiveFilterChip('Verified Ready');
              setFilterStatus('Verified Ready');
            }}
            className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-5 text-left hover:ring-1 hover:ring-emerald-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#D1FAE5] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <p className="text-2xl text-[#0f172a] font-semibold">{verifiedReadyCount}</p>
                <p className="text-xs font-semibold text-[#64748b]">Ready</p>
              </div>
            </div>
          </button>
          
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#E0F2FE] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#0966CC]" />
              </div>
              <div>
                <p className="text-2xl text-[#0f172a] font-semibold">{totalPatients}</p>
                <p className="text-xs font-semibold text-[#64748b]">Patients</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Filter Chip */}
      {activeFilterChip && (
        <div className="flex items-center gap-2">
          <Badge className="bg-[#DC2626] text-white border-0 px-3 py-1.5 text-sm flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Showing: {activeFilterChip}</span>
            <button
              onClick={() => {
                setActiveFilterChip(null);
                setFilterStatus('all');
              }}
              className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </Badge>
        </div>
      )}

      {/* Search and Filters - Sticky Toolbar (Moved above Continue) */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm py-3 -mx-6 px-6 border-b border-slate-200 shadow-sm">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
            <Input
              id="dashboard-search"
              placeholder="Search by patient name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-11 rounded-xl border border-[#e2e8f0] bg-white focus:bg-white"
            />
          </div>

          {/* Filter by Status */}
          <div className="w-full md:w-48">
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
              <SelectTrigger className="h-11 rounded-xl border border-[#e2e8f0] bg-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Needs Reverification">Needs Reverification</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Verified Ready">Verified Ready</SelectItem>
                <SelectItem value="Delivered (Locked)">Delivered (Locked)</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="w-full md:w-48">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="h-11 rounded-xl border border-[#e2e8f0] bg-white">
                <SortAsc className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchQuery || filterStatus !== 'all') && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#f1f5f9]">
            <span className="text-xs text-[#64748b]">Active filters:</span>
            {searchQuery && (
              <Badge variant="outline" className="bg-[#f8fafc] text-xs">
                Search: "{searchQuery}"
              </Badge>
            )}
            {filterStatus !== 'all' && (
              <Badge variant="outline" className="bg-[#f8fafc] text-xs">
                Status: {filterStatus}
              </Badge>
            )}
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
              }}
              className="ml-auto text-xs text-[#0966CC] hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Continue Where You Left Off - Enhanced with Avatar & Progress (Moved after filters) */}
      {filteredCharts.filter(item => item.chart.status === 'Active').length > 0 && (
        <div className="bg-gradient-to-br from-[#F0F9FF] to-white rounded-2xl shadow-sm hover:shadow-md p-5 border border-[#DBEAFE] transition-all hover:ring-1 hover:ring-sky-200">
          <div className="flex items-center gap-2 mb-4">
            <Play className="w-4 h-4 text-[#0966CC]" />
            <h3 className="text-sm font-semibold text-slate-700">Continue where you left off</h3>
          </div>
          {(() => {
            const mostRecentActive = filteredCharts
              .filter(item => item.chart.status === 'Active')
              .sort((a, b) => new Date(b.chart.createdDate).getTime() - new Date(a.chart.createdDate).getTime())[0];
            if (!mostRecentActive) return null;
            
            // Calculate progress: until we have per-med verification states on dashboard, treat all meds as unverified.
            // Optionally we could fetch medications for this chart here for real-time progress.
            const totalMeds = mostRecentActive.chart.medicationCount;
            const verifiedMeds = mostRecentActive.chart.verifiedMedicationCount || 0;
            const progressPercent = totalMeds > 0 ? Math.min((verifiedMeds / totalMeds) * 100, 100) : 0;
            
            // Calculate time since last edit using proper formatting
            const lastEditTime = new Date(mostRecentActive.chart.createdDate);
            const timeAgo = formatLastEditedTime(lastEditTime);
            
            // Get patient initials
            const initials = mostRecentActive.patient.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase();
            
            return (
              <button
                onClick={() => {
                  handleSelectChart(mostRecentActive.patient.id, mostRecentActive.chart.id);
                }}
                className="w-full"
              >
                <div className="flex flex-col md:flex-row items-start gap-4">
                  {/* Patient Avatar */}
                  <Avatar className="w-12 h-12 border-2 border-sky-200 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-[#0966CC] to-[#0C4A6E] text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[15px] font-medium text-[#0f172a] mb-1">{mostRecentActive.patient.name}</p>
                    <div className="flex items-center gap-3 text-sm text-[#64748b] mb-2 flex-wrap">
                      <span>{mostRecentActive.chart.type}</span>
                      <span>•</span>
                      <span>{timeAgo}</span>
                    </div>
                    
                    {/* Progress Indicator */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#64748b]">{verifiedMeds} of {totalMeds} meds completed</span>
                        <span className="font-medium text-[#0966CC]">{Math.round(progressPercent)}%</span>
                      </div>
                      <Progress value={progressPercent} className="h-1.5" />
                    </div>
                  </div>
                  
                  {/* Resume CTA */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="px-4 py-2 bg-[#0966CC] hover:bg-[#0C4A6E] text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#0966CC]" />
                  </div>
                </div>
              </button>
            );
          })()}
        </div>
      )}

      {/* Charts List */}
      <div className="mt-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-sky-600" />
            <div>
              <h2 className="text-lg text-slate-900">All Charts ({filteredCharts.length})</h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Manage and review patient charts
              </p>
            </div>
          </div>

          {/* Sync Status Indicator */}
          <div className="flex items-center gap-2">
            {syncStatus === 'synced' ? (
              <div className="flex items-center gap-1.5 text-emerald-700 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Synced</span>
              </div>
            ) : syncStatus === 'syncing' ? (
              <div className="flex items-center gap-1.5 text-sky-700 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Syncing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-700 text-sm">
                <WifiOff className="w-4 h-4" />
                <span>Offline • 3 pending uploads</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Action Row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button
            onClick={() => navigation.navigate('NewPatientChart')}
            className="bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chart
          </Button>
          <Button
            onClick={() => setIsScanSheetOpen(true)}
            variant="outline"
            className="border-violet-200 text-violet-700 hover:bg-violet-50 shadow-sm"
          >
            <Camera className="w-4 h-4 mr-2" />
            Scan
          </Button>
          <Button
            onClick={() => handleScanOption('Import PDF')}
            variant="outline"
            className="border-amber-200 text-amber-700 hover:bg-amber-50 shadow-sm"
          >
            <FileUp className="w-4 h-4 mr-2" />
            Import PDF
          </Button>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="text-sm text-slate-600 mr-1">Quick filters:</span>
          {(['Active', 'Needs Reverification', 'Verified Ready', 'Archived'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => toggleQuickFilterChip(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                quickFilterChips.includes(status)
                  ? status === 'Needs Reverification'
                    ? 'bg-red-100 border-red-300 text-red-700'
                    : status === 'Active'
                    ? 'bg-sky-100 border-sky-300 text-sky-700'
                    : status === 'Verified Ready'
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                    : 'bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {status === 'Needs Reverification' ? 'Needs Review' : status}
            </button>
          ))}
          {quickFilterChips.length > 0 && (
            <button
              onClick={() => setQuickFilterChips([])}
              className="text-xs text-sky-600 hover:text-sky-700 font-medium ml-1"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Empty State */}
        {filteredCharts.length === 0 && (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center mx-auto mb-4">
              {searchQuery || filterStatus !== 'all' || quickFilterChips.length > 0 ? (
                <Search className="w-8 h-8 text-slate-300" />
              ) : (
                <FileText className="w-8 h-8 text-slate-300" />
              )}
            </div>
            <h3 className="text-xl text-slate-900 mb-2">
              {searchQuery || filterStatus !== 'all' || quickFilterChips.length > 0 ? 'No charts match your filters' : 'No patient charts yet'}
            </h3>
            <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
              {searchQuery || filterStatus !== 'all' || quickFilterChips.length > 0
                ? 'Try adjusting status or date range'
                : 'Get started by creating your first patient chart.'}
            </p>
            {!(searchQuery || filterStatus !== 'all' || quickFilterChips.length > 0) && (
              <Button
                onClick={() => navigation.navigate('NewPatientChart')}
                className="bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-600/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create new chart
              </Button>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-[#f1f5f9] rounded w-1/3"></div>
                    <div className="h-4 bg-[#f1f5f9] rounded w-1/4"></div>
                    <div className="h-3 bg-[#f1f5f9] rounded w-2/3"></div>
                  </div>
                  <div className="h-10 w-10 bg-[#f1f5f9] rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {hasError && !isLoading && (
          <div className="bg-white rounded-3xl border border-dashed border-[#FEE2E2] p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FEE2E2] to-[#FECACA] flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-[#DC2626]" />
            </div>
            <h3 className="text-xl text-[#0f172a] mb-2">Unable to load charts</h3>
            <p className="text-sm text-[#64748b] mb-6 max-w-md mx-auto leading-relaxed">
              There was a problem loading your patient charts. Please try again.
            </p>
            <Button
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 1000);
              }}
              className="bg-[#0966CC] hover:bg-[#0C4A6E] text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {/* Charts Table with Striped Rows */}
        {!isLoading && !hasError && filteredCharts.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
              <div className="col-span-5">Patient</div>
              <div className="col-span-2 hidden md:block">
                <button
                  onClick={() => handleColumnSort('created')}
                  className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                >
                  Created
                  {sortByColumn === 'created' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="w-3.5 h-3.5 text-sky-600" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-sky-600" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />
                  )}
                </button>
              </div>
              <div className="col-span-3 hidden md:block">Medications</div>
              <div className="col-span-2">
                <button
                  onClick={() => handleColumnSort('status')}
                  className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                >
                  Status
                  {sortByColumn === 'status' ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="w-3.5 h-3.5 text-sky-600" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-sky-600" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />
                  )}
                </button>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-slate-100">
              {filteredCharts.map(({ patient, chart }, index) => {
                // Get patient initials
                const initials = patient.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <TooltipProvider key={`${patient.id}-${chart.id}`}>
                    <button
                      onClick={() => handleSelectChart(patient.id, chart.id)}
                      className={`w-full grid grid-cols-12 gap-4 px-6 py-4 text-left transition-all cursor-pointer hover:bg-slate-50 active:scale-[0.998] group ${
                        index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                      } ${
                        chart.status === 'Needs Reverification' ? 'border-l-4 border-l-red-400 pl-5' : ''
                      }`}
                    >
                      {/* Patient Info */}
                      <div className="col-span-5 flex items-center gap-3 min-w-0">
                        <Avatar className="w-10 h-10 border-2 border-slate-200 flex-shrink-0">
                          <AvatarFallback className={`text-sm ${
                            chart.status === 'Needs Reverification'
                              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                              : 'bg-gradient-to-br from-sky-500 to-sky-600 text-white'
                          }`}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-medium text-slate-900 truncate">{patient.name}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            DOB: {new Date(patient.dob).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="col-span-2 hidden md:flex flex-col justify-center">
                        <p className="text-sm text-slate-700">
                          {new Date(chart.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{chart.createdBy}</p>
                      </div>

                      {/* Medications */}
                      <div className="col-span-3 hidden md:flex flex-col justify-center">
                        <p className="text-sm text-slate-700">{chart.medicationCount} medication{chart.medicationCount !== 1 ? 's' : ''}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{chart.type}</p>
                      </div>

                      {/* Status with Tooltip */}
                      <div className="col-span-2 flex items-center justify-between gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Badge className={`${getStatusColor(chart.status)} flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border`}>
                                {getStatusIcon(chart.status)}
                                <span className="whitespace-nowrap">{getStatusLabel(chart.status)}</span>
                              </Badge>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <p>{getStatusTooltip(chart.status)}</p>
                          </TooltipContent>
                        </Tooltip>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </div>
                    </button>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Profile Tab Content
  const handleEditProfile = () => {
    setIsEditDialogOpen(true);
  };

  const handleSaveProfile = () => {
    toast.success('Profile updated successfully');
    setIsEditDialogOpen(false);
  };

  // Password strength calculation
  const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const labels = ['Very Weak', 'Weak', 'Fair', 'Strong'];
    const colors = ['text-red-600', 'text-yellow-600', 'text-blue-600', 'text-green-600'];
    
    return {
      score,
      label: labels[score] || labels[0],
      color: colors[score] || colors[0]
    };

    if (score === 0 || password.length < 8) return { score: 0, label: 'Weak', color: 'bg-red-500' };
    if (score <= 2) return { score: 1, label: 'Moderate', color: 'bg-yellow-500' };
    if (score === 3) return { score: 2, label: 'Good', color: 'bg-blue-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  // Password validation rules already defined above

  // Handle password update
  const handlePasswordUpdate = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all fields');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError('New password cannot match current password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    const strength = calculatePasswordStrength(newPassword);
    if (strength.score < 2) {
      setPasswordError('Password is too weak. Please choose a stronger password');
      return;
    }

    // Simulate API call
    setIsUpdatingPassword(true);
    setTimeout(() => {
      setIsUpdatingPassword(false);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
      
      // Clear success message after 5 seconds
      setTimeout(() => setPasswordSuccess(false), 5000);
    }, 1500);
  };

  const isPasswordFormValid = () => {
    if (!currentPassword || !newPassword || !confirmPassword) return false;
    const strength = calculatePasswordStrength(newPassword);
    return strength.score >= 2 && newPassword === confirmPassword && newPassword !== currentPassword;
  };

  const renderProfile = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative">
            <Avatar className="w-24 h-24">
              <AvatarFallback className="bg-gradient-to-br from-[#0966CC] to-[#0C4A6E] text-white text-2xl">
                AC
              </AvatarFallback>
            </Avatar>
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors border border-slate-200">
              <Upload className="w-4 h-4 text-slate-600" />
            </button>
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-2">
              <div>
                <h2 className="text-2xl text-[#0f172a] mb-1">
                  Anna Clinician<span className="text-[#64748b] text-lg ml-2">RN, BSN</span>
                </h2>
                <p className="text-sm text-[#64748b] mb-2">she/her</p>
              </div>
              <Button
                onClick={handleEditProfile}
                size="sm"
                variant="outline"
                className="mx-auto md:mx-0"
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Edit Profile
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
              <Badge className="bg-[#E0F2FE] text-[#0966CC] border-[#BFDBFE]">
                Registered Nurse
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 flex items-center gap-1">
                <BadgeCheck className="w-3 h-3" />
                Verified Clinician
              </Badge>
            </div>
            <p className="text-sm text-[#64748b] flex items-center justify-center md:justify-start gap-2">
              <Building2 className="w-3.5 h-3.5" />
              Home Health Services • Luminous Home Health
            </p>
            <p className="text-sm text-[#64748b]">Geriatric Medicine</p>
          </div>
        </div>
      </div>

      {/* Stats - Reordered */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#E0F2FE] flex items-center justify-center mb-3 mx-auto">
            <Users className="w-6 h-6 text-[#0966CC]" />
          </div>
          <p className="text-2xl text-[#0f172a] mb-1">{totalPatients}</p>
          <p className="text-sm text-[#64748b]">Patients</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#DBEAFE] flex items-center justify-center mb-3 mx-auto">
            <FileText className="w-6 h-6 text-[#0966CC]" />
          </div>
                   <p className="text-2xl text-[#0f172a] mb-1">
            {patients.reduce((sum, p) => sum + (p.charts?.length || 0), 0)}
          </p>
          <p className="text-sm text-[#64748b]">Charts</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 text-center cursor-help">
                <div className="w-12 h-12 rounded-xl bg-[#D1FAE5] flex items-center justify-center mb-3 mx-auto relative">
                  <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
                  <svg className="absolute inset-0 w-12 h-12 -rotate-90">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#D1FAE5" strokeWidth="2.5" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#10B981" strokeWidth="2.5" strokeDasharray="123 125.6" />
                  </svg>
                </div>
                <p className="text-2xl text-[#0f172a] mb-1">98%</p>
                <p className="text-sm text-[#64748b]">Accuracy</p>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-sm">% of medication scans verified correctly on first attempt</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Separator />

      {/* Contact Information */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <h3 className="text-lg text-[#0f172a] mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-[#0966CC]" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-[#64748b]">Email</Label>
              <p className="text-sm text-[#0f172a] mt-1">anna.clinician@luminous.com</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-[#0966CC]" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-[#64748b]">Phone</Label>
              <p className="text-sm text-[#0f172a] mt-1">(555) 123-4567</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-[#0966CC]" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-[#64748b]">Address</Label>
              <p className="text-sm text-[#0f172a] mt-1">123 Medical Plaza, Healthcare City, HC 12345</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-[#0966CC]" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-[#64748b]">Agency</Label>
              <p className="text-sm text-[#0f172a] mt-1">Luminous Home Health</p>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Professional Information */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <h3 className="text-lg text-[#0f172a] mb-4">Professional Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-[#64748b]">License Number</Label>
              <p className="text-sm text-[#0f172a] mt-1 flex items-center gap-2">
                RN-987654321
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs py-0 px-1.5">
                  <CheckCircle2 className="w-3 h-3 mr-0.5" />
                  Verified
                </Badge>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-[#64748b]">NPI Number</Label>
              <p className="text-sm text-[#0f172a] mt-1">1234567890</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-[#64748b]">Specialization</Label>
              <p className="text-sm text-[#0f172a] mt-1">Geriatric Medicine</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-[#64748b]">Certifications</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                  WOCN Certified
                </Badge>
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                  Geriatrics Specialist
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-[#64748b]">Years of Practice</Label>
              <p className="text-sm text-[#0f172a] mt-1">8 years</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-[#64748b]">Joined</Label>
              <p className="text-sm text-[#0f172a] mt-1">January 15, 2024</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Trust Signals */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
        <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span className="font-medium text-emerald-700">HIPAA-Compliant</span>
          <span className="text-slate-400">•</span>
          <span>Encrypted</span>
          <span className="text-slate-400">•</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Secure Session
          </span>
        </div>
      </div>

      {/* Audit Metadata */}
      <div className="text-xs text-slate-500 space-y-1 px-2">
        <p>Account created: January 2025</p>
        <p>Last updated: Today at 2:03 PM</p>
      </div>
    </div>
  );

  // Charts Tab Content
  const renderCharts = () => {
    const filteredAndSortedCharts = getFilteredAndSortedCharts();

    return (
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
              <Input
                placeholder="Search by patient name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-11 rounded-xl border border-[#e2e8f0] bg-white focus:bg-white"
              />
            </div>

            {/* Filter by Status */}
            <div className="w-full md:w-48">
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
                <SelectTrigger className="h-11 rounded-xl border border-[#e2e8f0] bg-white">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Needs Reverification">Needs Reverification</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Verified Ready">Verified Ready</SelectItem>
                  <SelectItem value="Delivered (Locked)">Delivered (Locked)</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="w-full md:w-48">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="h-11 rounded-xl border border-[#e2e8f0] bg-white">
                  <SortAsc className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Charts List */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
          <div className="p-4 border-b border-[#e2e8f0]">
            <h2 className="text-lg text-[#0f172a]">
              All Charts ({filteredAndSortedCharts.length})
            </h2>
          </div>

          {filteredAndSortedCharts.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-[#cbd5e1] mx-auto mb-3" />
              <p className="text-[#64748b]">No charts found</p>
            </div>
          ) : (
            <div className="divide-y divide-[#e2e8f0]">
              {filteredAndSortedCharts.map(({ patient, chart }) => {
                const initials = patient.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase();

                return (
                  <button
                    key={chart.id}
                    onClick={() => navigation.navigate('ChartDetail', { chartId: chart.id })}
                    className="w-full p-4 hover:bg-[#f8fafc] transition-colors text-left flex items-center gap-4"
                  >
                    <Avatar className="w-12 h-12 border-2 border-slate-200 flex-shrink-0">
                      <AvatarFallback className={`text-sm ${
                        chart.status === 'Needs Reverification'
                          ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                          : 'bg-gradient-to-br from-sky-500 to-sky-600 text-white'
                      }`}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm text-slate-900 truncate">{patient.name}</h3>
                      <p className="text-xs text-slate-500">
                        DOB: {new Date(patient.dob).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {chart.medicationCount} medication{chart.medicationCount !== 1 ? 's' : ''} • {chart.type}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={`${getStatusColor(chart.status)} flex items-center gap-1.5 px-2.5 py-1 text-xs border`}>
                        {getStatusIcon(chart.status)}
                        <span className="whitespace-nowrap">{getStatusLabel(chart.status)}</span>
                      </Badge>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Settings Tab Content
  const renderSettings = () => {
    const actions = [
      { name: 'My Patients', icon: Users, action: () => setActiveTab('dashboard'), color: '#0966CC' },
      { name: 'View All Charts', icon: FileText, action: () => setActiveTab('charts'), color: '#F59E0B' },
      { name: 'Scan Medications', icon: Scan, action: () => navigation.navigate('CaptureSourceSelection'), color: '#8B5CF6' },
    ];
    

    return (
      <div className="max-w-4xl space-y-5">
        {/* Back to Profile Breadcrumb */}
        <button
          onClick={() => setActiveTab('profile')}
          className="flex items-center gap-2 text-sm text-[#0966CC] hover:text-[#0C4A6E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </button>

        {/* Quick Actions Section */}
        <div>
          <h3 className="text-sm text-[#64748b] mb-3 px-2">QUICK ACTIONS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  onClick={action.action}
                  variant="outline"
                  className="h-auto p-4 flex items-center justify-start gap-3 hover:border-[#0966CC] hover:bg-[#E0F2FE] transition-colors"
                >
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${action.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: action.color }} />
                  </div>
                  <span className="text-sm text-[#0f172a]">{action.name}</span>
                  <ChevronRight className="w-4 h-4 text-[#cbd5e1] ml-auto" />
                </Button>
              );
            })}
          </div>
        </div>

        {/* Security Section */}
        <div>
          <h3 className="text-sm text-[#64748b] mb-3 px-2">SECURITY</h3>
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5">
            <div className="space-y-4">
              {/* Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-[#0966CC]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#0f172a] mb-1">Password</p>
                    <p className="text-xs text-[#64748b] mb-2">Last changed 30 days ago</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswordDialog(true)}
                  className="text-[#0966CC] hover:text-[#075985] hover:bg-[#DBEAFE]"
                >
                  Change
                </Button>
              </div>

              <Separator />

              {/* MFA Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-[#0f172a]">Two-Factor Authentication</p>
                      <Badge variant="outline" className="border-[#10B981] text-[#10B981] text-xs h-5">
                        🔐 Enabled
                      </Badge>
                    </div>
                    <p className="text-xs text-[#64748b]">Extra security for your account</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Last Login */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#0f172a] mb-1">Last Login</p>
                  <p className="text-xs text-[#64748b] mb-1">📍 Phoenix, AZ</p>
                  <p className="text-xs text-[#64748b]">🕒 Today at 9:42 AM</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h3 className="text-sm text-[#64748b] mb-3 px-2">NOTIFICATIONS</h3>
          <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[#10B981]" />
                </div>
                <div>
                  <p className="text-sm text-[#0f172a]">Email Notifications</p>
                  <p className="text-xs text-[#64748b]">Receive email updates</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                  <Bell className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div>
                  <p className="text-sm text-[#0f172a]">Push Notifications</p>
                  <p className="text-xs text-[#64748b]">Receive app notifications</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#0966CC]" />
                </div>
                <div>
                  <p className="text-sm text-[#0f172a]">Chart Alerts</p>
                  <p className="text-xs text-[#64748b]">Updates on your charts</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e8f0] p-8" style={{ display: 'none' }}>
          <div className="flex items-start gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
              <Lock className="w-6 h-6 text-[#0966CC]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg text-slate-900 mb-1">Change Password</h3>
              <p className="text-sm text-slate-600">Update your password regularly for security</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Current Password */}
            <div>
              <Label htmlFor="current-password" className="text-sm text-slate-700 mb-2 block">
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setPasswordError('');
                    setPasswordSuccess(false);
                  }}
                  placeholder="Enter current password"
                  className="h-12 rounded-xl border-2 border-slate-200 bg-slate-50 pr-12 focus:border-sky-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <Separator className="my-6" />

            {/* New Password */}
            <div>
              <Label htmlFor="new-password" className="text-sm text-slate-700 mb-2 block">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError('');
                    setPasswordSuccess(false);
                  }}
                  onFocus={() => setNewPasswordFocused(true)}
                  onBlur={() => setNewPasswordFocused(false)}
                  placeholder="Enter new password"
                  className="h-12 rounded-xl border-2 border-slate-200 bg-slate-50 pr-12 focus:border-sky-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && passwordStrength && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Password strength:</span>
                    <span className={`text-xs font-medium ${
                      passwordStrength.score === 0 ? 'text-red-600' :
                      passwordStrength.score === 1 ? 'text-yellow-600' :
                      passwordStrength.score === 2 ? 'text-blue-600' :
                      'text-green-600'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all ${
                          i <= passwordStrength.score
                            ? passwordStrength.color
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Password Rules - Show on focus or when typing */}
              {(newPasswordFocused || newPassword) && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-700 mb-2 font-medium">Must include:</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      {passwordRules?.length ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                      )}
                      <span className={passwordRules?.length ? 'text-emerald-700' : 'text-slate-600'}>
                        At least 8 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {passwordRules?.upperLower ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                      )}
                      <span className={passwordRules?.upperLower ? 'text-emerald-700' : 'text-slate-600'}>
                        Upper & lowercase letters
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {passwordRules?.numberOrSymbol ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                      )}
                      <span className={passwordRules?.numberOrSymbol ? 'text-emerald-700' : 'text-slate-600'}>
                        Number or special symbol
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirm-password" className="text-sm text-slate-700 mb-2 block">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError('');
                    setPasswordSuccess(false);
                  }}
                  placeholder="Confirm new password"
                  className="h-12 rounded-xl border-2 border-slate-200 bg-slate-50 pr-12 focus:border-sky-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  Passwords do not match
                </p>
              )}
              {confirmPassword && newPassword === confirmPassword && newPassword.length >= 8 && (
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Passwords match
                </p>
              )}
            </div>

            {/* Update Button */}
            <div className="pt-2">
              <Button
                onClick={handlePasswordUpdate}
                disabled={!isPasswordFormValid() || isUpdatingPassword}
                className={`h-12 px-6 rounded-xl transition-all ${
                  passwordSuccess
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-sky-600 hover:bg-sky-700'
                } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : passwordSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Password Updated
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Update Password
                  </>
                )}
              </Button>
            </div>

            {/* Security Reassurance */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-start gap-2 text-xs text-slate-600">
                <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p>
                  <span className="font-medium text-emerald-700">HIPAA-compliant & encrypted:</span> Your password is securely encrypted and never stored in plain text.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Change Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Choose a strong password to keep your account secure
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="current-password-dialog">Current Password</Label>
                <Input
                  id="current-password-dialog"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password-dialog">New Password</Label>
                <Input
                  id="new-password-dialog"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="h-11 rounded-xl"
                />
                <p className="text-xs text-[#64748b]">Must be at least 8 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password-dialog">Confirm New Password</Label>
                <Input
                  id="confirm-password-dialog"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowPasswordDialog(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}>
                Cancel
              </Button>
              <Button
                className="bg-[#0966CC] hover:bg-[#075985]"
                onClick={() => {
                  if (!currentPassword || !newPassword || !confirmPassword) {
                    toast.error('Please fill in all fields');
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    toast.error('New passwords do not match');
                    return;
                  }
                  if (newPassword.length < 8) {
                    toast.error('Password must be at least 8 characters');
                    return;
                  }
                  toast.success('Password changed successfully!');
                  setShowPasswordDialog(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                Update Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
};

return (
    <div className="h-screen flex bg-[#f8fafc] overflow-hidden">
      {/* Desktop Sidebar - Always visible on md+ */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-[#e2e8f0]">
        {/* Sidebar Header */}
        <div className="border-b border-[#e2e8f0] p-6">
          <div className="mb-1 text-sm text-[#64748b]">{user?.agency_name}</div>
          <div className="text-lg text-[#0f172a]">Clinician Portal</div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 py-4 px-3 overflow-y-auto">
          {renderSidebarNav()}
        </div>

        {/* Sidebar Footer - Logout Button */}
        <div className="border-t border-[#e2e8f0] p-4">
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full border-[#DC2626] text-[#DC2626] hover:bg-[#FEE2E2]"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0 flex flex-col">
          <SheetHeader className="border-b border-[#e2e8f0] p-6">
            <SheetTitle className="text-left">
              <div className="mb-1 text-sm text-[#64748b]">{user?.agency_name}</div>
              <div className="text-lg text-[#0f172a]">Clinician Portal</div>
            </SheetTitle>
            <SheetDescription className="sr-only">
              Navigation menu for Clinician Portal
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 py-4 px-3 overflow-y-auto">
            {renderSidebarNav()}
          </div>

          {/* Mobile Drawer Footer - Logout Button */}
          <div className="border-t border-[#e2e8f0] p-4">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full border-[#DC2626] text-[#DC2626] hover:bg-[#FEE2E2]"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-[#e2e8f0] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="md:hidden w-10 h-10 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] flex items-center justify-center transition-colors"
              >
                <Menu className="w-5 h-5 text-[#64748b]" />
              </button>

              <div>
                <h1 className="text-xl text-[#0f172a]">
                  {activeTab === 'dashboard' && 'Dashboard'}
                  {activeTab === 'charts' && 'My Charts'}
                  {activeTab === 'profile' && 'My Profile'}
                  {activeTab === 'settings' && 'Settings'}
                </h1>
                <p className="text-sm text-[#64748b]">
                  {activeTab === 'dashboard' && `Welcome back, ${user?.first_name}!`}
                  {activeTab === 'charts' && 'View and manage all patient charts'}
                  {activeTab === 'profile' && 'View and manage your profile'}
                  {activeTab === 'settings' && 'Manage your account settings'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Online/Offline Indicator */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f8fafc]">
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-[#10B981]" />
                    <span className="text-xs text-[#10B981]">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-[#DC2626]" />
                    <span className="text-xs text-[#DC2626]">Offline</span>
                  </>
                )}
              </div>

              {/* Test Notification Button - Remove after testing */}
              <Button
                onClick={async () => {
                  console.log('🧪 Testing notification system...');
                  console.log('User:', user);
                  console.log('User ID:', user?.id);
                  
                  if (!user?.id) {
                    toast.error('User not logged in - user.id is missing');
                    console.error('No user ID found!');
                    return;
                  }
                  
                  try {
                    console.log('Creating notification for user:', user.id);
                    const result = await notificationService.createNotification(
                      user.id,
                      'clinician',
                      'chart_review',
                      '✅ Chart Approved',
                      'Your chart for patient John Smith has been approved by the admin.',
                      'medium',
                      { chartId: '123', patientName: 'John Smith' },
                      '/charts/123',
                      'View Chart'
                    );
                    console.log('✅ Notification created successfully:', result);
                    toast.success('Test notification created! Check the bell icon.');
                  } catch (error: any) {
                    console.error('❌ Failed to create notification:', error);
                    console.error('Error message:', error?.message);
                    console.error('Error details:', error?.details || error?.hint || error);
                    toast.error(`Failed: ${error?.message || 'Unknown error'}`);
                  }
                }}
                variant="outline"
                size="sm"
                className="text-xs border-purple-300 text-purple-600 hover:bg-purple-50"
              >
                🧪 Test Notification
              </Button>

              <NotificationCenter 
                userId={user?.id || ''}
                userRole="clinician"
                onNavigate={(url) => {
                  if (url.includes('/charts')) {
                    setActiveTab('charts');
                  } else if (url.includes('/patients')) {
                    setActiveTab('dashboard');
                  }
                }}
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'charts' && renderCharts()}
          {activeTab === 'profile' && renderProfile()}
          {activeTab === 'settings' && renderSettings()}
        </main>
      </div>
      <Toaster position="top-right" />

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your contact information and preferences.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editedPhone}
                onChange={(e) => setEditedPhone(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} className="bg-sky-600 hover:bg-sky-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
