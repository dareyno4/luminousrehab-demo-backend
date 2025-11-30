//allows functional components to manage and update state; 
// represents data that can change over time and trigger re-renders of a component
import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Users,
  FileText,
  Search,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Bell,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  User,
  ChevronRight,
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
  Zap,
  TrendingUp,
  CheckCircle2,
  Wifi,
  WifiOff,
  Filter,
  Download,
  Upload,
  BarChart3,
  Lock,
  DollarSign,
  MoreVertical,
  UserPlus,
  ArrowLeft,
  Paperclip,
  UserCheck,
  MessageSquare,
  History,
  RefreshCw,
  AlertTriangle,
  X,
  Check,
  XCircle,
  SlidersHorizontal,
  Undo2,
  Info,
  Hourglass,
  Archive,
  Camera,
  Trash2,
  Smartphone,
  MapPinned,
  Key,
  Monitor,
  ExternalLink,
  Edit,
  Shield,
  HelpCircle,
  Palette,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import { Switch } from '../../components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { Checkbox } from '../../components/ui/checkbox';
import NotificationCenter from '../../components/NotificationCenter';
import { notificationService } from '../../services/notificationService';
import { Textarea } from '../../components/ui/textarea';
import { Screen, NavigationParams } from '../../App';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';
import ClinicianDetailView from './ClinicianDetailView';
import AgencyPatientsView from './AgencyPatientsView';
import AgencyUsersView from './AgencyUsersView';
import {
  fetchAllChartsForAdmin,
  fetchAllUsers,
  getAgencyAdminStats,
  approveChart,
  rejectChart,
  bulkApproveCharts,
  archiveChart,
} from '../../services/agencyAdminService';
import { fetchAllPatients } from '../../services/schedulerService';

//handle navigation and screen transitions
interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
}
//navigation/hamburger menu tabs
type TabType = 'charts' | 'patients' | 'clinicians' | 'users' | 'profile' | 'settings';

//definitions for patient
interface Patient {
  id: string;
  name: string;
  dob: string;
  address: string;
  phone: string;
  chartCount: number;
  addedBy?: 'agency' | 'clinician';
}
//definitions for chart
interface Chart {
  id: string;
  patientName: string;
  patientDob: string;
  status: 'Active' | 'Verified' | 'Delivered' | 'Pending Review' | 'Needs Reverification' | 'Archived';
  type: 'Bottle Scan' | 'PDF Import' | 'Manual Entry' | 'Empty Chart';
  medicationCount: number;
  createdDate: string;
  createdBy: string;
  finalizedDate?: string;
  lowestConfidence?: number;
  verifiedBy?: string;
  reviewedBy?: string;
  deliveryTimestamp?: string;
  daysOld?: number;
  hasLowConfidence?: boolean;
  archivedDate?: string;
}
//definitions for clinician
interface Clinician {
  id: string;
  name: string;
  email: string;
  phone?: string;
  patientCount: number;
  chartCount: number;
  assignedPatients: { name: string; dob: string; chartCount: number }[];
}

//mock data, should be replaced with real backend API data
const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'Jane Test',
    dob: '1969-12-31',
    address: '101 Test Ave, Test City, CA',
    phone: '555-1001',
    chartCount: 2,
  },
  {
    id: '2',
    name: 'John Sample',
    dob: '1972-02-01',
    address: '202 Sample St, Sample Town, CA',
    phone: '555-1002',
    chartCount: 1,
  },
  {
    id: '3',
    name: 'Sarah Martinez',
    dob: '1955-07-12',
    address: '303 Demo Rd, Demo City, CA',
    phone: '555-1003',
    chartCount: 0,
  },
];

const mockCharts: Chart[] = [
  {
    id: 'c1',
    patientName: 'Jane Test',
    patientDob: '1969-12-31',
    status: 'Pending Review',
    type: 'Bottle Scan',
    medicationCount: 3,
    createdDate: '2025-01-17',
    createdBy: 'Anna Clinician',
    finalizedDate: '2025-01-17',
    lowestConfidence: 72,
    verifiedBy: 'Anna Clinician',
    daysOld: 3,
    hasLowConfidence: true,
  },
  {
    id: 'c2',
    patientName: 'Jane Test',
    patientDob: '1969-12-31',
    status: 'Verified',
    type: 'Manual Entry',
    medicationCount: 2,
    createdDate: '2025-01-15',
    createdBy: 'Anna Clinician',
    finalizedDate: '2025-01-16',
    lowestConfidence: 95,
    verifiedBy: 'Anna Clinician',
    reviewedBy: 'John Jones',
    daysOld: 1,
    hasLowConfidence: false,
  },
  {
    id: 'c3',
    patientName: 'John Sample',
    patientDob: '1972-02-01',
    status: 'Active',
    type: 'PDF Import',
    medicationCount: 1,
    createdDate: '2025-01-18',
    createdBy: 'Bob Clinician',
    daysOld: 0,
    lowestConfidence: 88,
    hasLowConfidence: false,
  },
  {
    id: 'c4',
    patientName: 'Sarah Martinez',
    patientDob: '1955-07-12',
    status: 'Delivered',
    type: 'Bottle Scan',
    medicationCount: 5,
    createdDate: '2025-01-10',
    createdBy: 'Anna Clinician',
    finalizedDate: '2025-01-12',
    deliveryTimestamp: '2025-01-12T16:23:00',
    verifiedBy: 'Anna Clinician',
    reviewedBy: 'John Jones',
    lowestConfidence: 91,
    daysOld: 8,
    hasLowConfidence: false,
  },
  {
    id: 'c5',
    patientName: 'Jane Test',
    patientDob: '1969-12-31',
    status: 'Archived',
    type: 'Bottle Scan',
    medicationCount: 4,
    createdDate: '2024-12-15',
    createdBy: 'Anna Clinician',
    finalizedDate: '2024-12-16',
    deliveryTimestamp: '2024-12-20T10:00:00',
    archivedDate: '2025-01-10',
    verifiedBy: 'Anna Clinician',
    reviewedBy: 'John Jones',
    lowestConfidence: 94,
    daysOld: 34,
    hasLowConfidence: false,
  },
  {
    id: 'c6',
    patientName: 'John Sample',
    patientDob: '1972-02-01',
    status: 'Archived',
    type: 'Manual Entry',
    medicationCount: 2,
    createdDate: '2024-11-20',
    createdBy: 'Bob Clinician',
    finalizedDate: '2024-11-21',
    deliveryTimestamp: '2024-11-22T14:30:00',
    archivedDate: '2024-12-22',
    verifiedBy: 'Bob Clinician',
    reviewedBy: 'John Jones',
    lowestConfidence: 89,
    daysOld: 59,
    hasLowConfidence: false,
  },
  {
    id: 'c7',
    patientName: 'Robert Davis',
    patientDob: '1980-06-15',
    status: 'Needs Reverification',
    type: 'Bottle Scan',
    medicationCount: 4,
    createdDate: '2025-01-16',
    createdBy: 'Anna Clinician',
    finalizedDate: '2025-01-17',
    verifiedBy: 'Anna Clinician',
    lowestConfidence: 68,
    daysOld: 2,
    hasLowConfidence: true,
  },
];

const mockClinicians: Clinician[] = [
  {
    id: '1',
    name: 'Anna Clinician',
    email: 'clin.anna@hha.test',
    phone: '555-2001',
    patientCount: 1,
    chartCount: 2,
    assignedPatients: [
      { name: 'Jane Test', dob: '1969-12-31', chartCount: 2 },
    ],
  },
  {
    id: '2',
    name: 'Bob Clinician',
    email: 'clin.bob@hha.test',
    phone: '555-2002',
    patientCount: 1,
    chartCount: 1,
    assignedPatients: [
      { name: 'John Sample', dob: '1972-02-01', chartCount: 1 },
    ],
  },
];
//mock data ends here 

export default function AgencyAdminDashboard({ navigation }: Props) {
  const { logout, user } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('charts');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  const [reopenReason, setReopenReason] = useState('');
  const [returnNote, setReturnNote] = useState('');
  const [reassignClinician, setReassignClinician] = useState('');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'ytd'>('7d');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedClinicianId, setSelectedClinicianId] = useState<string | null>(null);
  
  // Real data state
  const [charts, setCharts] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tenantName, setTenantName] = useState('Loading...');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalCharts: 0,
    pendingReviewCharts: 0,
    needsReverificationCharts: 0,
    deliveredCharts: 0,
    totalPatients: 0,
  });
  
  // Profile dialog states
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [showDevicesDialog, setShowDevicesDialog] = useState(false);
  const [showAgencyDialog, setShowAgencyDialog] = useState(false);
  //filteering and advanced search states
  const [advancedFilters, setAdvancedFilters] = useState({
    patientName: '',
    clinicianName: '',
    dateFrom: '',
    dateTo: '',
    scanSource: '',
    confidenceIssues: false,
  });
//create new patient states
  const [newPatient, setNewPatient] = useState({
    name: '',
    dob: '',
    address: '',
    phone: '',
  });

  // Load data on mount
  useEffect(() => {
    if (user?.tenant_id) {
      loadData();
    }
  }, [user?.tenant_id]);

  const loadData = useCallback(async () => {
    if (!user?.tenant_id) return;
    
    setLoading(true);
    try {
      // Fetch tenant info
      const { supabaseClient } = await import('../../lib/supabase');
      const { data: tenantData } = await supabaseClient
        .from('tenants')
        .select('name')
        .eq('id', user.tenant_id)
        .single();
      
      if (tenantData) {
        setTenantName(tenantData.name);
      }

      const [chartsData, patientsData, usersData, statsData] = await Promise.all([
        fetchAllChartsForAdmin(user.tenant_id),
        fetchAllPatients(user.tenant_id),
        fetchAllUsers(user.tenant_id),
        getAgencyAdminStats(user.tenant_id),
      ]);

      setCharts(chartsData);
      setPatients(patientsData);
      setUsers(usersData);
      setStats(statsData);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading agency admin data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id]);

  // Transform charts to UI format
  const transformedCharts = charts.map(chart => {
    const createdDate = new Date(chart.created_at);
    const daysOld = Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      id: chart.id,
      patientName: `${chart.patient?.first_name || ''} ${chart.patient?.last_name || ''}`.trim(),
      patientDob: chart.patient?.date_of_birth || '',
      status: chart.status === 'verified_ready' ? 'Verified' :
              chart.status === 'delivered_locked' ? 'Delivered' :
              chart.status === 'needs_reverification' ? 'Needs Reverification' :
              chart.status === 'archived' ? 'Archived' :
              chart.status === 'active' ? 'Active' : 'Pending Review',
      type: chart.source === 'bottle_scan' ? 'Bottle Scan' :
            chart.source === 'pdf_import' ? 'PDF Import' :
            chart.source === 'image_upload' ? 'Manual Entry' : 'Empty Chart',
      medicationCount: chart.medication_count || 0,
      createdDate: chart.created_at,
      createdBy: chart.created_by_user ? `${chart.created_by_user.first_name} ${chart.created_by_user.last_name}` : 'Unknown',
      finalizedDate: chart.finalized_at,
      verifiedBy: chart.finalized_by_user ? `${chart.finalized_by_user.first_name} ${chart.finalized_by_user.last_name}` : undefined,
      reviewedBy: chart.finalized_by_user ? `${chart.finalized_by_user.first_name} ${chart.finalized_by_user.last_name}` : undefined,
      deliveryTimestamp: chart.status === 'delivered_locked' ? chart.finalized_at : undefined,
      archivedDate: chart.status === 'archived' ? chart.updated_at : undefined,
      lowestConfidence: undefined, // Would need to calculate from medications
      daysOld,
      hasLowConfidence: false, // You can add this logic based on medication confidence if needed
    };
  });

  // Calculate stats from real data
  const totalPatients = stats.totalPatients;
  const totalCharts = stats.totalCharts;
  const pendingReview = stats.pendingReviewCharts;
  const verifiedCharts = transformedCharts.filter(c => c.status === 'Verified').length;
  const activeCharts = transformedCharts.filter(c => c.status === 'Active').length;
  const deliveredCharts = stats.deliveredCharts;
  const archivedCharts = transformedCharts.filter(c => c.status === 'Archived').length;
  const needsReverification = stats.needsReverificationCharts;
  const pendingOver48h = transformedCharts.filter(c => c.status === 'Pending Review' && c.daysOld && c.daysOld > 2).length;
  const today = new Date().toISOString().split('T')[0];
  const chartsToday = transformedCharts.filter(c => c.createdDate?.startsWith(today)).length;
  
  // Calculate average turnaround time from verified/delivered charts
  const completedCharts = charts.filter(c => 
    ['verified_ready', 'delivered_locked'].includes(c.status) && c.finalized_at
  );
  const avgTurnaroundTime = completedCharts.length > 0
    ? (completedCharts.reduce((sum, chart) => {
        const created = new Date(chart.created_at).getTime();
        const finalized = new Date(chart.finalized_at).getTime();
        const days = (finalized - created) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0) / completedCharts.length).toFixed(1)
    : '0.0';

  // Calculate total medications scanned
  const totalMedications = charts.reduce((sum, chart) => sum + (chart.medication_count || 0), 0);

  // Calculate trend based on timeframe
  const timeframeDays = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 365;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeframeDays);
  
  const recentCharts = charts.filter(c => new Date(c.created_at) >= cutoffDate);
  const olderCharts = charts.filter(c => new Date(c.created_at) < cutoffDate && new Date(c.created_at) >= new Date(cutoffDate.getTime() - timeframeDays * 24 * 60 * 60 * 1000));
  
  const trendPercentage = olderCharts.length > 0
    ? Math.abs(((recentCharts.length - olderCharts.length) / olderCharts.length) * 100).toFixed(0)
    : 0;
  const trendDirection = recentCharts.length >= olderCharts.length ? '↑' : '↓';


//logout function
  const handleLogout = () => {
    logout();
    navigation.navigate('Landing');
  };
//handle tab changes in sidebar navigation
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setIsDrawerOpen(false);
  };
//handle adding new patient
  const handleAddPatient = () => {
    if (!newPatient.name || !newPatient.dob) {
      toast.error('Please fill in required fields');
      return;
    }
    toast.success(`Patient "${newPatient.name}" added successfully`);
    setIsAddPatientModalOpen(false);
    setNewPatient({ name: '', dob: '', address: '', phone: '' });
  };
//view chart details
  const handleViewChart = (chartId: string, patientName: string) => {
    navigation.navigate('ChartDetailView', { chartId, patientName, mode: 'review' });
  };

  const handleChartSelect = (chartId: string) => {
    setSelectedCharts(prev =>
      prev.includes(chartId) ? prev.filter(id => id !== chartId) : [...prev, chartId]
    );
  };

  const handleSelectAll = () => {
    const filteredCharts = getFilteredCharts();
    if (selectedCharts.length === filteredCharts.length) {
      setSelectedCharts([]);
    } else {
      setSelectedCharts(filteredCharts.map(c => c.id));
    }
  };

  const handleBulkApprove = () => {
    toast.success(`${selectedCharts.length} chart(s) approved and finalized`);
    setSelectedCharts([]);
  };

  const handleBulkReturn = () => {
    setIsReturnModalOpen(true);
  };

  const handleReturnToClinicianConfirm = () => {
    if (!returnNote.trim()) {
      toast.error('Please provide a reason for returning');
      return;
    }
    toast.success(`Chart returned to clinician with note`);
    setIsReturnModalOpen(false);
    setReturnNote('');
    setSelectedChartId(null);
  };

  const handleReassignConfirm = () => {
    if (!reassignClinician) {
      toast.error('Please select a clinician');
      return;
    }
    toast.success(`Chart reassigned to ${reassignClinician}`);
    setIsReassignModalOpen(false);
    setReassignClinician('');
    setSelectedChartId(null);
  };

  const handleReopenChart = (chartId: string) => {
    setSelectedChartId(chartId);
    setIsReopenModalOpen(true);
  };

  const handleReopenConfirm = () => {
    if (!reopenReason.trim()) {
      toast.error('Please provide a reason for reopening');
      return;
    }
    toast.success('Chart reopened for editing');
    setIsReopenModalOpen(false);
    setReopenReason('');
    setSelectedChartId(null);
  };

  const handleDownloadPDF = async (chartId: string) => {
    try {
      // Find the chart
      const chart = transformedCharts.find(c => c.id === chartId);
      if (!chart) {
        toast.error('Chart not found');
        return;
      }

      // Fetch chart details with medications from database
      const { supabaseClient } = await import('../../lib/supabase');
      
      const { data: medications, error: medsError } = await supabaseClient
        .from('medications')
        .select('*')
        .eq('chart_id', chartId)
        .order('created_at', { ascending: true });

      if (medsError) {
        console.error('Error fetching medications:', medsError);
        toast.error('Failed to load medications');
        return;
      }

      // Generate PDF
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });

      // Layout constants
      const margin = 48;
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const innerW = pageW - margin * 2;
      let y = margin;

      const ensureSpace = (needed: number) => {
        if (y + needed > pageH - margin) {
          doc.addPage();
          y = margin;
        }
      };

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Patient Medication Chart', margin, y); y += 30;

      // Patient Info
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Patient: ${chart.patientName}`, margin, y); y += 16;
      doc.text(`DOB: ${chart.patientDob || 'N/A'}`, margin, y); y += 16;
      doc.text(`Chart ID: ${chartId}`, margin, y); y += 16;
      doc.text(`Status: ${chart.status}`, margin, y); y += 16;
      doc.text(`Created: ${chart.createdDate}`, margin, y); y += 16;
      doc.text(`Created By: ${chart.createdBy}`, margin, y); y += 16;
      const genAt = new Date().toLocaleString();
      doc.text(`Generated: ${genAt}`, margin, y); y += 24;

      // Medications table header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      ensureSpace(24);
      doc.text('Medications', margin, y); y += 12;

      // Table columns
      const cols = [
        { key: 'drug_name', label: 'Drug', w: 140 },
        { key: 'strength', label: 'Strength', w: 80 },
        { key: 'route', label: 'Route', w: 60 },
        { key: 'frequency', label: 'Frequency', w: 80 },
        { key: 'prescriber', label: 'Prescriber', w: 90 },
        { key: 'created_at', label: 'Date', w: 70 },
      ];

      // Header row
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      ensureSpace(20);
      let xPos = margin;
      cols.forEach(col => {
        doc.text(col.label, xPos + 3, y);
        xPos += col.w;
      });
      y += 14;

      // Draw header line
      doc.setLineWidth(1);
      doc.line(margin, y - 12, margin + innerW, y - 12);

      // Table rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const rowLineH = 10;

      (medications || []).forEach((med: any) => {
        const cells = [
          String(med.drug_name || ''),
          String(med.strength || ''),
          String(med.route || ''),
          String(med.frequency || ''),
          String(med.prescriber || ''),
          med.created_at ? new Date(med.created_at).toLocaleDateString() : '',
        ];

        const linesPerCell = cells.map((text, i) => doc.splitTextToSize(text, cols[i].w - 6));
        const maxLines = Math.max(...linesPerCell.map((ln) => Array.isArray(ln) ? ln.length : 1));
        const rowH = Math.max(rowLineH, maxLines * rowLineH);
        ensureSpace(rowH + 4);

        xPos = margin;
        linesPerCell.forEach((lines, i) => {
          const textLines = Array.isArray(lines) ? lines : [lines];
          textLines.forEach((line, lineIdx) => {
            doc.text(line, xPos + 3, y + 10 + lineIdx * rowLineH);
          });
          xPos += cols[i].w;
        });

        y += rowH;
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin + innerW, y);
        y += 4;
      });

      // Footer
      ensureSpace(30);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `This document contains ${medications?.length || 0} medication(s) for ${chart.patientName}.`,
        margin,
        y + 20
      );

      // Download
      doc.save(`chart-${chartId}-${chart.patientName.replace(/\s+/g, '-')}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleViewAuditLog = (chartId: string) => {
    toast.info('Audit log view coming soon');
  };

  const getFilteredCharts = () => {
    return transformedCharts.filter(chart => {
      const matchesSearch = chart.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           chart.createdBy.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || chart.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const getClinician = (id: string) => {
    const user = users.find(u => u.id === id && u.role === 'clinician');
    if (!user) return null;
    return {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      phone: user.phone,
      patientCount: user.assigned_chart_count || 0,
      chartCount: user.assigned_chart_count || 0,
      assignedPatients: [], // Would need to fetch this separately if needed
    };
  };

  // Sidebar Navigation Component
  const renderSidebarNav = () => (
    <nav className="space-y-1">
      <button
        onClick={() => handleTabChange('charts')}
        className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors ${
          activeTab === 'charts'
            ? 'bg-[#D1FAE5] text-[#10B981]'
            : 'text-[#64748b] hover:bg-[#f8fafc]'
        }`}
      >
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5" />
          <span>Charts</span>
        </div>
        {pendingReview > 0 && (
          <Badge className="bg-[#F59E0B] text-white border-0 h-5 min-w-5 px-1.5 flex items-center justify-center">
            {pendingReview}
          </Badge>
        )}
      </button>
      <button
        onClick={() => handleTabChange('patients')}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
          activeTab === 'patients'
            ? 'bg-[#D1FAE5] text-[#10B981]'
            : 'text-[#64748b] hover:bg-[#f8fafc]'
        }`}
      >
        <Users className="w-5 h-5" />
        <span>Patients</span>
      </button>
      <button
        onClick={() => handleTabChange('clinicians')}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
          activeTab === 'clinicians'
            ? 'bg-[#D1FAE5] text-[#10B981]'
            : 'text-[#64748b] hover:bg-[#f8fafc]'
        }`}
      >
        <User className="w-5 h-5" />
        <span>Clinicians</span>
      </button>
      <button
        onClick={() => handleTabChange('users')}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
          activeTab === 'users'
            ? 'bg-[#D1FAE5] text-[#10B981]'
            : 'text-[#64748b] hover:bg-[#f8fafc]'
        }`}
      >
        <UserPlus className="w-5 h-5" />
        <span>Users</span>
      </button>
      <button
        onClick={() => handleTabChange('profile')}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
          activeTab === 'profile'
            ? 'bg-[#D1FAE5] text-[#10B981]'
            : 'text-[#64748b] hover:bg-[#f8fafc]'
        }`}
      >
        <User className="w-5 h-5" />
        <span>Profile</span>
      </button>
      <button
        onClick={() => handleTabChange('settings')}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
          activeTab === 'settings'
            ? 'bg-[#D1FAE5] text-[#10B981]'
            : 'text-[#64748b] hover:bg-[#f8fafc]'
        }`}
      >
        <SettingsIcon className="w-5 h-5" />
        <span>Settings</span>
      </button>
    </nav>
  );

  // Charts Tab Content
  const renderChartsTab = () => {
    const filteredCharts = getFilteredCharts();
    const hasActiveFilters = statusFilter !== 'all';

    return (
      <div className="space-y-6 pb-24">
        {/* Section Header + KPIs Grouped */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-1">Chart Performance Metrics</h2>
              <p className="text-xs text-slate-500">Real-time overview of chart activity</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Timeframe Selector */}
              <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-slate-200">
                <button
                  onClick={() => setTimeframe('7d')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    timeframe === '7d' ? 'bg-[#10B981] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  7d
                </button>
                <button
                  onClick={() => setTimeframe('30d')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    timeframe === '30d' ? 'bg-[#10B981] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  30d
                </button>
                <button
                  onClick={() => setTimeframe('ytd')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    timeframe === 'ytd' ? 'bg-[#10B981] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  YTD
                </button>
              </div>
              {/* Auto-refresh indicator */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-slate-600">Live data</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Updated {Math.floor((new Date().getTime() - lastRefresh.getTime()) / 60000)} min ago</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* KPI Cards - Now feels grouped */}
          <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-[#10B981] cursor-help hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-[#64748b]">Avg Turnaround</p>
                        <Clock className="w-4 h-4 text-[#10B981]" />
                      </div>
                      <p className="text-2xl text-[#0f172a] font-semibold">{avgTurnaroundTime} days</p>
                      <p className="text-xs text-[#10B981] mt-1">{trendDirection} {trendPercentage}% from last period</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">Average chart verification time</p>
                    <p className="text-xs text-[#94a3b8]">Past {timeframe === '7d' ? '7' : timeframe === '30d' ? '30' : 'year-to-date'} days</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-[#0966CC] cursor-help hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-[#64748b]">Total Charts</p>
                        <TrendingUp className="w-4 h-4 text-[#0966CC]" />
                      </div>
                      <p className="text-2xl text-[#0f172a] font-semibold">{totalCharts}</p>
                      <p className="text-xs text-[#64748b] mt-1">Entire organization</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">Total number of charts</p>
                    <p className="text-xs text-[#94a3b8]">All charts in the system</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-[#DC2626] cursor-help hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-[#64748b]">Pending &gt;48h</p>
                        <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                      </div>
                      <p className="text-2xl text-[#0f172a] font-semibold">{pendingOver48h}</p>
                      <p className="text-xs text-[#DC2626] mt-1">Needs urgent review</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">Charts waiting more than 48 hours</p>
                    <p className="text-xs text-[#94a3b8]">Escalated priority — action required</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-[#F59E0B] cursor-help hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-[#64748b]">Medications Scanned</p>
                        <TrendingUp className="w-4 h-4 text-[#F59E0B]" />
                      </div>
                      <p className="text-2xl text-[#0f172a] font-semibold">{totalMedications}</p>
                      <p className="text-xs text-[#64748b] mt-1">Organization total</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">Total medications scanned</p>
                    <p className="text-xs text-[#94a3b8]">All medications scanned across organization</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Sticky Stats Summary - Softened */}
        <div className="sticky top-0 z-10 bg-[#F0FDF4] rounded-xl shadow-sm p-4 border border-[#10B981]/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#F59E0B] animate-pulse" />
                <span className="text-sm">
                  <span className="font-semibold text-[#0f172a]">{pendingReview}</span>
                  <span className="text-[#64748b]"> Pending</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                <span className="text-sm">
                  <span className="font-semibold text-[#0f172a]">{verifiedCharts}</span>
                  <span className="text-[#64748b]"> Verified</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#DC2626]" />
                <span className="text-sm">
                  <span className="font-semibold text-[#0f172a]">{needsReverification}</span>
                  <span className="text-[#64748b]"> Needs Reverification</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#0966CC]" />
                <span className="text-sm">
                  <span className="font-semibold text-[#0f172a]">{activeCharts}</span>
                  <span className="text-[#64748b]"> Active</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#4F46E5]" />
                <span className="text-sm">
                  <span className="font-semibold text-[#0f172a]">{deliveredCharts}</span>
                  <span className="text-[#64748b]"> Delivered</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#64748b]" />
                <span className="text-sm">
                  <span className="font-semibold text-[#0f172a]">{archivedCharts}</span>
                  <span className="text-[#64748b]"> Archived</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedCharts.length > 0 && (
                <Badge className="bg-[#10B981] text-white border-0">
                  {selectedCharts.length} selected
                </Badge>
              )}
              {/* Status Indicators Legend */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border border-[#10B981]/30 hover:bg-[#D1FAE5] transition-colors">
                    <Info className="w-3.5 h-3.5 text-[#10B981]" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs" side="left">
                    <div className="space-y-1.5">
                      <p className="font-semibold mb-2">Status Key</p>
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="w-3 h-3 text-[#F59E0B]" />
                        <span>Pending Review</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <AlertTriangle className="w-3 h-3 text-[#DC2626]" />
                        <span>Pending &gt;48h (Overdue)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />
                        <span>Low Confidence (&lt;75%)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <RefreshCw className="w-3 h-3 text-[#64748b]" />
                        <span>Reopened</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Lock className="w-3 h-3 text-[#4F46E5]" />
                        <span>Delivered (Locked)</span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Filter Summary Pill */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <div className="bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#0EA5E9]" />
              <span className="text-xs font-medium text-[#0EA5E9]">
                Filtering: {statusFilter} ({filteredCharts.length})
              </span>
              <button
                onClick={() => setStatusFilter('all')}
                className="ml-1 text-[#0EA5E9] hover:text-[#0284C7]"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Status Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className={statusFilter === 'all' ? 'bg-[#10B981] hover:bg-[#059669]' : ''}
            >
              All Charts
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              variant={statusFilter === 'Pending Review' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('Pending Review')}
              className={statusFilter === 'Pending Review' ? 'bg-[#F59E0B] hover:bg-[#D97706]' : 'border-[#F59E0B] text-[#F59E0B]'}
            >
              <Clock className="w-3 h-3 mr-1" />
              Pending Review
              {pendingReview > 0 && (
                <Badge className="ml-2 bg-white text-[#F59E0B] border-0 h-5 px-1.5">
                  {pendingReview}
                </Badge>
              )}
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              variant={statusFilter === 'Verified' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('Verified')}
              className={statusFilter === 'Verified' ? 'bg-[#10B981] hover:bg-[#059669]' : 'border-[#10B981] text-[#10B981]'}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Ready to Deliver
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              variant={statusFilter === 'Needs Reverification' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('Needs Reverification')}
              className={statusFilter === 'Needs Reverification' ? 'bg-[#DC2626] hover:bg-[#B91C1C]' : 'border-[#DC2626] text-[#DC2626]'}
            >
              <Undo2 className="w-3 h-3 mr-1" />
              Needs Reverification
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              variant={statusFilter === 'Delivered' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('Delivered')}
              className={statusFilter === 'Delivered' ? 'bg-[#4F46E5] hover:bg-[#4338CA]' : 'border-[#4F46E5] text-[#4F46E5]'}
            >
              <Lock className="w-3 h-3 mr-1" />
              Delivered
            </Button>
          </motion.div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="inline-flex">
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    variant={statusFilter === 'Active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('Active')}
                    className={statusFilter === 'Active' ? 'bg-[#0966CC] hover:bg-[#075985]' : 'border-[#0966CC] text-[#0966CC]'}
                  >
                    <Activity className="w-3 h-3 mr-1" />
                    Active
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Chart is in progress</p>
                <p className="text-xs text-[#94a3b8]">Requires clinician completion</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="inline-flex">
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    variant={statusFilter === 'Archived' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('Archived')}
                    className={statusFilter === 'Archived' ? 'bg-[#64748b] hover:bg-[#475569]' : 'border-[#64748b] text-[#64748b]'}
                  >
                    <Archive className="w-3 h-3 mr-1" />
                    Archived
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                <p>View archived charts</p>
                <p className="text-xs text-[#94a3b8]">Historical records</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Charts List Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">All Charts ({filteredCharts.length})</h3>
            </div>
          </div>

          {/* Search Bar with Select All and Advanced Search */}
          <div className="flex flex-col gap-3 mb-5">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Select All - Left aligned */}
              {filteredCharts.length > 0 && (
                <div className="flex items-center gap-2 px-4 h-12 rounded-xl border-2 border-[#e2e8f0] bg-white">
                  <Checkbox
                    checked={selectedCharts.length === filteredCharts.length}
                    onCheckedChange={handleSelectAll}
                    className="border-[#10B981] data-[state=checked]:bg-[#10B981]"
                  />
                  <span className="text-sm text-[#64748b] whitespace-nowrap">Select All</span>
                </div>
              )}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
                <Input
                  placeholder="Search by patient or clinician name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 rounded-xl border-2 border-[#e2e8f0] bg-white"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdvancedSearchOpen(true)}
                className="h-12 border-[#10B981] text-[#10B981] hover:bg-[#D1FAE5]"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Advanced Search
              </Button>
            </div>
          </div>

          {/* Charts List */}
          <div className="space-y-3">
            {filteredCharts.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 mb-1">No charts found</p>
                <p className="text-sm text-slate-400">Try adjusting your search or filters</p>
              </div>
            ) : (
              filteredCharts.map((chart) => {
                const clinician = getClinician(chart.createdBy);
                const isOverdue = chart.status === 'Pending Review' && chart.daysOld && chart.daysOld > 2;
                const isSelected = selectedCharts.includes(chart.id);
                const isHighRisk = isOverdue || (chart.hasLowConfidence && chart.lowestConfidence && chart.lowestConfidence < 75);
                
                return (
                  <motion.div
                    key={chart.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`bg-white rounded-xl border-2 transition-all duration-200 group relative hover:shadow-lg ${
                      isSelected 
                        ? 'border-[#10B981] shadow-lg ring-2 ring-[#10B981]/20' 
                        : 'border-[#e2e8f0] hover:border-[#10B981]/30'
                    } ${isHighRisk ? 'border-l-4 border-l-rose-200' : ''}`}
                  >
                    {/* Overdue Indicator */}
                    {isOverdue && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="rounded-full">
                              <div className="w-8 h-8 rounded-full bg-[#DC2626] flex items-center justify-center animate-pulse shadow-lg">
                                <AlertTriangle className="w-4 h-4 text-white" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="font-semibold">Overdue</p>
                              <p className="text-xs">Pending &gt;48h - needs urgent review</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}

                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <div className="pt-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleChartSelect(chart.id)}
                            className="border-[#10B981] data-[state=checked]:bg-[#10B981]"
                          />
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="text-lg text-[#0f172a]">{chart.patientName}</h3>
                                <Badge
                                  className={
                                    chart.status === 'Delivered'
                                      ? 'bg-[#E0E7FF] text-[#4F46E5] border-[#C7D2FE]'
                                      : chart.status === 'Verified'
                                      ? 'bg-[#D1FAE5] text-[#10B981] border-[#A7F3D0]'
                                      : chart.status === 'Active'
                                      ? 'bg-[#DBEAFE] text-[#0966CC] border-[#BFDBFE]'
                                      : chart.status === 'Archived'
                                      ? 'bg-[#F1F5F9] text-[#64748b] border-[#CBD5E1]'
                                      : 'bg-[#FEF3C7] text-[#F59E0B] border-[#FDE68A]'
                                  }
                                >
                                  {chart.status === 'Delivered' ? (
                                    <><Lock className="w-3 h-3 mr-1" /> Delivered (Locked)</>
                                  ) : chart.status === 'Verified' ? (
                                    <><CheckCircle2 className="w-3 h-3 mr-1" /> Verified (Ready to Deliver)</>
                                  ) : chart.status === 'Active' ? (
                                    <><Activity className="w-3 h-3 mr-1" /> {chart.status}</>
                                  ) : chart.status === 'Archived' ? (
                                    <><Archive className="w-3 h-3 mr-1" /> Archived</>
                                  ) : (
                                    <><Clock className="w-3 h-3 mr-1" /> {chart.status}</>
                                  )}
                                </Badge>
                                {chart.daysOld !== undefined && chart.daysOld > 0 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge
                                          variant="outline"
                                          className={`text-xs ${
                                            chart.daysOld > 2 
                                              ? 'border-[#DC2626] text-[#DC2626] bg-[#DC2626]/5' 
                                              : chart.daysOld > 1
                                              ? 'border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/5'
                                              : 'border-[#64748b] text-[#64748b]'
                                          }`}
                                        >
                                          <Clock className="w-3 h-3 mr-1" />
                                          {chart.daysOld} day{chart.daysOld !== 1 ? 's' : ''} old
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="space-y-1">
                                          <p className="font-semibold">Chart Age</p>
                                          <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div 
                                              className={`h-full rounded-full ${
                                                chart.daysOld > 2 ? 'bg-[#DC2626]' : chart.daysOld > 1 ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
                                              }`}
                                              style={{ width: `${Math.min((chart.daysOld / 3) * 100, 100)}%` }}
                                            />
                                          </div>
                                          <p className="text-xs text-slate-500">
                                            {chart.daysOld > 2 ? 'Urgent - Review required' : chart.daysOld > 1 ? 'Needs attention' : 'Normal timeline'}
                                          </p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {chart.hasLowConfidence && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger className="inline-flex">
                                        <Badge variant="outline" className="border-[#F59E0B] text-[#F59E0B] text-xs">
                                          <AlertTriangle className="w-3 h-3 mr-1" />
                                          Low Confidence
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Lowest confidence: {chart.lowestConfidence}%</p>
                                        <p className="text-xs text-[#94a3b8]">May need manual review</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              <p className="text-sm text-[#64748b] mb-2">
                                DOB: {new Date(chart.patientDob).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>

                            {/* Kebab Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 p-0 rounded-md hover:bg-accent hover:text-accent-foreground">
                                <MoreVertical className="w-4 h-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Chart Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleViewChart(chart.id, chart.patientName)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Chart
                                </DropdownMenuItem>
                                {chart.status !== 'Delivered' && (
                                  <>
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedChartId(chart.id);
                                      setIsReassignModalOpen(true);
                                    }}>
                                      <UserCheck className="w-4 h-4 mr-2" />
                                      Reassign Clinician
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedChartId(chart.id);
                                      setIsReturnModalOpen(true);
                                    }}>
                                      <ArrowLeft className="w-4 h-4 mr-2" />
                                      Return for Edits
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem onClick={() => toast.info('Add note feature coming soon')}>
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Add Admin Note
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDownloadPDF(chart.id)}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewAuditLog(chart.id)}>
                                  <History className="w-4 h-4 mr-2" />
                                  View Audit Trail
                                </DropdownMenuItem>
                                {chart.status === 'Delivered' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleReopenChart(chart.id)}
                                      className="text-[#DC2626]"
                                    >
                                      <Undo2 className="w-4 h-4 mr-2" />
                                      Reopen Chart
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Chart Details */}
                          <div className="flex flex-wrap items-center gap-3 text-sm text-[#64748b] mb-3">
                            <span>{chart.type}</span>
                            {chart.medicationCount > 0 && (
                              <>
                                <span>•</span>
                                <span>{chart.medicationCount} medication{chart.medicationCount !== 1 ? 's' : ''}</span>
                              </>
                            )}
                            {chart.lowestConfidence && (
                              <>
                                <span>•</span>
                                <span className={chart.hasLowConfidence ? 'text-[#F59E0B] font-medium' : ''}>
                                  Confidence: {chart.lowestConfidence}%
                                </span>
                              </>
                            )}
                          </div>

                          {/* Tightened Metadata with Tooltip */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="inline-flex text-xs text-[#94a3b8] mb-3 cursor-help">
                                <span>
                                  Created {new Date(chart.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  {chart.finalizedDate && (
                                    <> · Finalized {new Date(chart.finalizedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                                  )}
                                  {' · '}
                                  <span className="font-semibold text-[#0f172a]">{chart.createdBy}</span>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="space-y-2">
                                  <div>
                                    <p className="text-xs font-semibold text-[#94a3b8]">Created</p>
                                    <p>{new Date(chart.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                  </div>
                                  {clinician && (
                                    <div>
                                      <p className="text-xs font-semibold text-[#94a3b8]">Clinician</p>
                                      <p className="font-semibold">{clinician.name}</p>
                                      <p className="text-xs flex items-center gap-1">
                                        <Mail className="w-3 h-3" />
                                        {clinician.email}
                                      </p>
                                      {clinician.phone && (
                                        <p className="text-xs flex items-center gap-1">
                                          <Phone className="w-3 h-3" />
                                          {clinician.phone}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {chart.finalizedDate && (
                                    <div>
                                      <p className="text-xs font-semibold text-[#94a3b8]">Finalized</p>
                                      <p>{new Date(chart.finalizedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                    </div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {/* Audit Context */}
                          {(chart.verifiedBy || chart.reviewedBy || chart.deliveryTimestamp) && (
                            <div className="bg-[#f8fafc] rounded-lg p-3 space-y-1 text-xs opacity-70 hover:opacity-100 transition-opacity">
                              {chart.verifiedBy && (
                                <div className="flex items-center gap-2 text-[#64748b]">
                                  <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                                  <span>Verified by: <span className="text-[#0f172a] font-medium">{chart.verifiedBy}</span></span>
                                </div>
                              )}
                              {chart.reviewedBy && (
                                <div className="flex items-center gap-2 text-[#64748b]">
                                  <Eye className="w-3 h-3 text-[#0966CC]" />
                                  <span>Admin Reviewed: <span className="text-[#0f172a] font-medium">{chart.reviewedBy}</span></span>
                                </div>
                              )}
                              {chart.deliveryTimestamp && (
                                <div className="flex items-center gap-2 text-[#64748b]">
                                  <CheckCircle className="w-3 h-3 text-[#4F46E5]" />
                                  <span>Delivery: <span className="text-[#0f172a] font-medium">
                                    {new Date(chart.deliveryTimestamp).toLocaleString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      hour: 'numeric', 
                                      minute: '2-digit' 
                                    })}
                                  </span></span>
                                </div>
                              )}
                              <button
                                onClick={() => handleViewAuditLog(chart.id)}
                                className="text-[#10B981] hover:text-[#059669] flex items-center gap-1 font-medium mt-1"
                              >
                                <History className="w-3 h-3" />
                                View Audit Trail
                              </button>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {(chart.status === 'Verified' || chart.status === 'Pending Review') && (
                              <Button
                                size="sm"
                                onClick={() => handleViewChart(chart.id, chart.patientName)}
                                className="bg-[#10B981] hover:bg-[#059669] text-white"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Review Chart
                              </Button>
                            )}
                            {(chart.status === 'Active' || chart.status === 'Delivered') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewChart(chart.id, chart.patientName)}
                                className="border-[#64748b] text-[#64748b] hover:bg-[#f8fafc]"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Chart
                              </Button>
                            )}
                            {chart.status === 'Delivered' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="inline-flex">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReopenChart(chart.id)}
                                      className="border-[#DC2626] text-[#DC2626] hover:bg-[#FEE2E2]"
                                    >
                                      <Undo2 className="w-4 h-4 mr-2" />
                                      Reopen
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delivered charts are locked.</p>
                                    <p className="text-xs text-[#94a3b8]">Admins may reopen with audit reason.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Sticky Admin Action Bar */}
        {selectedCharts.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t-2 border-[#10B981] shadow-2xl p-4 z-20"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-[#10B981] text-white border-0 px-3 py-1">
                  {selectedCharts.length} Chart{selectedCharts.length !== 1 ? 's' : ''} Selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCharts([])}
                  className="text-[#64748b]"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    size="sm"
                    onClick={handleBulkApprove}
                    className="bg-[#10B981] hover:bg-[#059669] text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve & Finalize
                  </Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkReturn}
                    className="border-[#F59E0B] text-[#F59E0B] hover:bg-[#FEF3C7]"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Return to Clinician
                  </Button>
                </motion.div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info('Bulk attach feature coming soon')}
                  className="border-[#64748b] text-[#64748b] hover:bg-[#f8fafc]"
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Attach Docs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReassignModalOpen(true)}
                  className="border-[#0966CC] text-[#0966CC] hover:bg-[#DBEAFE]"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Reassign
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  // Patients Tab Content
  const renderPatientsTab = () => {
    const filteredPatients = mockPatients.filter(patient =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#D1FAE5] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <p className="text-2xl text-[#0f172a] font-semibold">{totalPatients}</p>
                <p className="text-xs font-semibold text-[#64748b]">Total Patients</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#DBEAFE] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#0966CC]" />
              </div>
              <div>
                <p className="text-2xl text-[#0f172a] font-semibold">5</p>
                <p className="text-xs font-semibold text-[#64748b]">New This Month</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-2xl text-[#0f172a] font-semibold">2.3</p>
                <p className="text-xs font-semibold text-[#64748b]">Avg Charts/Patient</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
            <Input
              placeholder="Search patients by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-xl border-2 border-[#e2e8f0] bg-white"
            />
          </div>
          <Button
            onClick={() => setIsAddPatientModalOpen(true)}
            className="bg-[#10B981] hover:bg-[#059669] text-white h-12 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Patient
          </Button>
        </div>

        {/* Patients List */}
        <div className="space-y-3">
          {filteredPatients.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 mb-1">No patients found</p>
              <p className="text-sm text-slate-400">Try adjusting your search</p>
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className="bg-white rounded-xl border border-[#e2e8f0] p-5 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg text-[#0f172a] mb-2">{patient.name}</h3>
                    <div className="space-y-1 text-sm text-[#64748b]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>DOB: {new Date(patient.dob).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{patient.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{patient.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{patient.chartCount} chart{patient.chartCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info('Patient detail view coming soon')}
                    className="border-[#10B981] text-[#10B981] hover:bg-[#D1FAE5]"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Clinicians Tab Content
  const renderCliniciansTab = () => {
    // If a clinician is selected, show detail view
    if (selectedClinicianId) {
      return (
        <ClinicianDetailView
          clinicianId={selectedClinicianId}
          onBack={() => setSelectedClinicianId(null)}
          navigation={navigation}
        />
      );
    }

    return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#D1FAE5] flex items-center justify-center">
                <User className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <p className="text-2xl text-[#0f172a] font-semibold">
                  {users.filter(u => u.role === 'clinician').length}
                </p>
                <p className="text-xs font-semibold text-[#64748b]">Total Clinicians</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#DBEAFE] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-[#0966CC]" />
              </div>
              <div>
                <p className="text-2xl text-[#0f172a] font-semibold">
                  {users.filter(u => u.role === 'clinician' && u.active).length}
                </p>
                <p className="text-xs font-semibold text-[#64748b]">Active</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-2xl text-[#0f172a] font-semibold">
                  {users.filter(u => u.role === 'clinician').reduce((sum, c) => sum + (c.assigned_chart_count || 0), 0)}
                </p>
                <p className="text-xs font-semibold text-[#64748b]">Total Charts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Clinicians List */}
        <div className="space-y-3">
          {users.filter(u => u.role === 'clinician').map((clinician) => {
            const clinicianName = `${clinician.first_name} ${clinician.last_name}`;
            const clinicianInitials = `${clinician.first_name[0]}${clinician.last_name[0]}`;
            const assignedPatients = patients.filter(p => p.assigned_clinician_id === clinician.id);
            
            return (
              <div
                key={clinician.id}
                className="bg-white rounded-xl border border-[#e2e8f0] p-5 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-[#D1FAE5] text-[#10B981]">
                          {clinicianInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg text-[#0f172a]">{clinicianName}</h3>
                        <div className="flex items-center gap-2 text-sm text-[#64748b]">
                          <Mail className="w-4 h-4" />
                          <span>{clinician.email}</span>
                        </div>
                        {clinician.phone_number && (
                          <div className="flex items-center gap-2 text-sm text-[#64748b]">
                            <Phone className="w-4 h-4" />
                            <span>{clinician.phone_number}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-[#64748b]">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{assignedPatients.length} patient{assignedPatients.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{clinician.assigned_chart_count || 0} chart{clinician.assigned_chart_count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedClinicianId(clinician.id)}
                    className="border-[#10B981] text-[#10B981] hover:bg-[#D1FAE5]"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Profile
                  </Button>
                </div>

                {/* Assigned Patients */}
                {assignedPatients.length > 0 && (
                  <div className="pt-3 border-t border-[#e2e8f0]">
                    <p className="text-xs text-[#64748b] mb-2">Assigned Patients:</p>
                    <div className="flex flex-wrap gap-2">
                      {assignedPatients.slice(0, 5).map((patient) => (
                        <Badge key={patient.id} variant="outline" className="text-xs">
                          {patient.first_name} {patient.last_name}
                        </Badge>
                      ))}
                      {assignedPatients.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{assignedPatients.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Shared handlers for Settings and Profile
  const loginSessions = [
    {
      id: '1',
      device: 'Chrome on Windows',
      location: 'Phoenix, AZ',
      ip: '192.168.1.1',
      lastActive: 'Active now',
      current: true,
    },
    {
      id: '2',
      device: 'Safari on iPhone',
      location: 'Phoenix, AZ',
      ip: '192.168.1.45',
      lastActive: '2 hours ago',
      current: false,
    },
    {
      id: '3',
      device: 'Chrome on MacBook',
      location: 'Scottsdale, AZ',
      ip: '10.0.0.23',
      lastActive: 'Yesterday',
      current: false,
    },
  ];

  const handleToggleMFA = (enabled: boolean) => {
    setMfaEnabled(enabled);
    if (enabled) {
      setShowMFADialog(true);
    } else {
      toast.info('Two-factor authentication disabled');
    }
  };

  const handleRevokeSession = (sessionId: string) => {
    toast.success('Session revoked successfully');
  };

  // Profile Tab
  const renderProfile = () => {
    const profileData = {
      name: 'Jennifer Martinez',
      role: 'Agency Administrator',
      email: 'admin@qa-hha.test',
      phone: '+1 (555) 123-4567',
      address: '456 Admin Building, Healthcare City, HC 12345',
      agency: 'Luminous QA – Test HHA',
      agencyLicense: 'HHA-789456',
      agencyNPI: '1234567890',
      agencyAddress: '123 Healthcare Blvd, Medical City, HC 12345',
      agencyPhone: '(555) 123-4567',
      supportEmail: 'support@healthcarepartners.com',
      joinDate: 'March 10, 2024',
      accountCreated: 'Jan 07, 2025',
      lastUpdated: 'Feb 01, 2025',
      lastPasswordChange: '30 days ago',
      lastLogin: 'Phoenix, AZ',
      lastLoginTime: 'Today at 9:42 AM',
      totalUsers: 24,
      totalClinicians: 18,
      totalPatients: 156,
      chartsThisMonth: 37,
      avgTurnaround: '2.1 days',
    };

    const handleAvatarUpload = () => {
      toast.success('Avatar upload feature coming soon');
    };

    const handleAvatarRemove = () => {
      toast.info('Avatar removed');
    };

    return (
      <div className="max-w-4xl space-y-5">
        {/* Profile Header Card */}
        <Card className="p-6 bg-gradient-to-r from-[#10B981] to-[#059669] border-0 text-white">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-white/30">
                <AvatarFallback className="bg-white text-[#10B981] text-2xl">
                  JM
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleAvatarUpload}
                        className="w-8 h-8 rounded-full bg-white text-[#10B981] flex items-center justify-center shadow-lg hover:bg-slate-50 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Upload photo</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleAvatarRemove}
                        className="w-8 h-8 rounded-full bg-white text-red-600 flex items-center justify-center shadow-lg hover:bg-slate-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove photo</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl mb-1">{profileData.name}</h2>
              <Badge className="bg-white/20 text-white border-white/30 mb-2">
                {profileData.role}
              </Badge>
              <button
                onClick={() => setShowAgencyDialog(true)}
                className="text-sm text-white/90 hover:text-white flex items-center gap-1 transition-colors mx-auto md:mx-0"
              >
                {profileData.agency}
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </Card>

        {/* Quick Stats Row */}
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-[#10B981]" />
            <h3 className="text-sm font-semibold text-[#0f172a]">Agency Overview</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-2xl text-[#10B981] font-semibold">{profileData.totalUsers}</p>
              <p className="text-xs text-[#64748b]">Agency Users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl text-[#0966CC] font-semibold">{profileData.totalClinicians}</p>
              <p className="text-xs text-[#64748b]">Clinicians</p>
            </div>
            <div className="text-center">
              <p className="text-2xl text-[#F59E0B] font-semibold">{profileData.chartsThisMonth}</p>
              <p className="text-xs text-[#64748b]">Charts this month</p>
            </div>
            <div className="text-center">
              <p className="text-2xl text-[#10B981] font-semibold">{profileData.avgTurnaround}</p>
              <p className="text-xs text-[#64748b]">Avg turnaround</p>
            </div>
          </div>
        </div>

        {/* User Details Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#10B981]" />
              <h3 className="text-sm font-semibold text-[#0f172a]">User Details</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('Edit profile coming soon')}
              className="border-[#10B981] text-[#10B981] hover:bg-[#D1FAE5]"
            >
              <Edit className="w-3 h-3 mr-2" />
              Edit
            </Button>
          </div>
          
          <Card className="p-5">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-[#10B981]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[#64748b] mb-1">Email Address</p>
                  <p className="text-sm text-[#0f172a]">{profileData.email}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-[#10B981]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[#64748b] mb-1">Phone Number</p>
                  <p className="text-sm text-[#0f172a]">{profileData.phone}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Agency Information Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#10B981]" />
              <h3 className="text-sm font-semibold text-[#0f172a]">Agency Information</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAgencyDialog(true)}
              className="text-[#10B981] hover:text-[#059669] hover:bg-[#D1FAE5]"
            >
              View Details
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <Card className="p-5">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-[#10B981]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[#64748b] mb-1">Agency Name</p>
                  <p className="text-sm text-[#0f172a]">{profileData.agency}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-[#10B981]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[#64748b] mb-1">License Number</p>
                  <p className="text-sm text-[#0f172a]">{profileData.agencyLicense}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Contact Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#10B981]" />
            <h3 className="text-sm font-semibold text-[#0f172a]">Contact Information</h3>
          </div>

          <Card className="p-5">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-[#10B981]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[#64748b] mb-1">Address</p>
                  <p className="text-sm text-[#0f172a]">{profileData.address}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Audit Metadata */}
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-start gap-2 text-xs text-[#64748b]">
            <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p>🕑 Account created: {profileData.accountCreated}</p>
              <p>✏️ Last updated: {profileData.lastUpdated}</p>
            </div>
          </div>
        </Card>

        {/* Help & Support */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1 border-[#0966CC] text-[#0966CC] hover:bg-[#DBEAFE]"
            onClick={() => toast.info('Support contact coming soon')}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-[#64748b] text-[#64748b] hover:bg-slate-100"
            onClick={() => toast.info('Documentation coming soon')}
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            View Docs
          </Button>
        </div>

        {/* Agency Details Dialog */}
        <Dialog open={showAgencyDialog} onOpenChange={setShowAgencyDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Agency Details</DialogTitle>
              <DialogDescription>
                Complete information about your healthcare agency
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#64748b] mb-1">Agency Name</p>
                  <p className="text-sm text-[#0f172a] font-medium">{profileData.agency}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b] mb-1">License Number</p>
                  <p className="text-sm text-[#0f172a] font-medium">{profileData.agencyLicense}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b] mb-1">NPI Number</p>
                  <p className="text-sm text-[#0f172a] font-medium">{profileData.agencyNPI}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b] mb-1">Support Email</p>
                  <p className="text-sm text-[#0f172a] font-medium">{profileData.supportEmail}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-[#64748b] mb-1">Agency Address</p>
                <p className="text-sm text-[#0f172a]">{profileData.agencyAddress}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748b] mb-1">Agency Phone</p>
                <p className="text-sm text-[#0f172a]">{profileData.agencyPhone}</p>
              </div>
              <Separator />
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-2">
                  <Users className="w-4 h-4 text-[#10B981] mt-0.5" />
                  <p className="text-sm font-medium text-[#0f172a]">Facility Users</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xl text-[#10B981] font-semibold">{profileData.totalUsers}</p>
                    <p className="text-xs text-[#64748b]">Total Users</p>
                  </div>
                  <div>
                    <p className="text-xl text-[#0966CC] font-semibold">{profileData.totalClinicians}</p>
                    <p className="text-xs text-[#64748b]">Clinicians</p>
                  </div>
                  <div>
                    <p className="text-xl text-[#F59E0B] font-semibold">{profileData.totalPatients}</p>
                    <p className="text-xs text-[#64748b]">Patients</p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAgencyDialog(false)}>
                Close
              </Button>
              <Button
                className="bg-[#10B981] hover:bg-[#059669]"
                onClick={() => navigation.navigate('AgencyAdminSettings')}
              >
                Manage Agency
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // Settings Tab
  const renderSettings = () => {
    const actions = [
      { name: 'Manage Clinicians', icon: Users, action: () => setActiveTab('clinicians'), color: '#0966CC' },
      { name: 'Approve Charts', icon: FileText, action: () => setActiveTab('charts'), color: '#10B981' },
      { name: 'Manage Agency Settings', icon: Building2, action: () => toast.info('Agency settings coming soon'), color: '#F59E0B' },
      { name: 'Export Data', icon: Download, action: () => toast.success('Data export initiated'), color: '#06B6D4' },
    ];

    return (
      <div className="max-w-4xl space-y-5">
        {/* Account Section */}
        <div>
          <h3 className="text-sm text-[#64748b] mb-3 px-2">ACCOUNT</h3>
          <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
            <button 
              onClick={() => setActiveTab('profile')}
              className="w-full flex items-center justify-between p-4 hover:bg-[#f8fafc] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center">
                  <User className="w-5 h-5 text-[#10B981]" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-[#0f172a]">Profile</p>
                  <p className="text-xs text-[#64748b]">View your profile</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#cbd5e1]" />
            </button>
          </div>
        </div>

        {/* Account Security Section */}
        <div>
          <h3 className="text-sm text-[#64748b] mb-3 px-2">SECURITY</h3>
          <Card className="p-5">
            <div className="space-y-4">
              {/* Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-[#0966CC]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#0f172a] mb-1">Password</p>
                    <p className="text-xs text-[#64748b]">Last changed 30 days ago</p>
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
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-[#0f172a]">Two-Factor Authentication</p>
                      {mfaEnabled && (
                        <Badge variant="outline" className="border-[#10B981] text-[#10B981] text-xs h-5">
                          🔐 Enabled
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[#64748b]">
                      {mfaEnabled ? 'Extra security for your account' : 'Add extra layer of security'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={mfaEnabled}
                  onCheckedChange={handleToggleMFA}
                  className="data-[state=checked]:bg-[#10B981]"
                />
              </div>

              <Separator />

              {/* Last Login */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center flex-shrink-0">
                  <MapPinned className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#0f172a] mb-1">Last Login</p>
                  <p className="text-xs text-[#64748b]">📍 Phoenix, AZ</p>
                  <p className="text-xs text-[#64748b]">🕒 Today at 9:42 AM</p>
                </div>
              </div>

              <Separator />

              {/* Active Sessions */}
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E0E7FF] flex items-center justify-center flex-shrink-0">
                    <Monitor className="w-5 h-5 text-[#4F46E5]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#0f172a] mb-1">Active Sessions</p>
                    <p className="text-xs text-[#64748b]">3 devices signed in</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDevicesDialog(true)}
                  className="text-[#4F46E5] hover:text-[#4338CA] hover:bg-[#E0E7FF]"
                >
                  View
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions Section */}
        <div>
          <h3 className="text-sm text-[#64748b] mb-3 px-2">QUICK ACTIONS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  onClick={action.action}
                  variant="outline"
                  className="h-auto p-4 flex items-center justify-start gap-3 hover:border-[#10B981] hover:bg-[#D1FAE5] transition-colors"
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
              <Switch className="data-[state=checked]:bg-[#10B981]" defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div>
                  <p className="text-sm text-[#0f172a]">Chart Alerts</p>
                  <p className="text-xs text-[#64748b]">Pending review notifications</p>
                </div>
              </div>
              <Switch className="data-[state=checked]:bg-[#10B981]" defaultChecked />
            </div>
          </div>
        </div>

        {/* MFA Setup Dialog */}
        <Dialog open={showMFADialog} onOpenChange={setShowMFADialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Scan the QR code with your authenticator app
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="w-48 h-48 bg-slate-100 rounded-lg mx-auto flex items-center justify-center">
                <p className="text-sm text-slate-500">QR Code Here</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#0f172a]">Verification Code</label>
                <input
                  type="text"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  placeholder="Enter 6-digit code"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMFADialog(false)}>
                Cancel
              </Button>
              <Button
                className="bg-[#10B981] hover:bg-[#059669]"
                onClick={() => {
                  setShowMFADialog(false);
                  toast.success('Two-factor authentication enabled');
                }}
              >
                Verify & Enable
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Active Devices Dialog */}
        <Dialog open={showDevicesDialog} onOpenChange={setShowDevicesDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Active Sessions</DialogTitle>
              <DialogDescription>
                Manage devices where you're currently signed in
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4 max-h-96 overflow-y-auto">
              {loginSessions.map((session) => (
                <Card key={session.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] flex items-center justify-center flex-shrink-0">
                        <Monitor className="w-5 h-5 text-[#0966CC]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-[#0f172a]">{session.device}</p>
                          {session.current && (
                            <Badge variant="outline" className="border-[#10B981] text-[#10B981] text-xs h-5">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#64748b]">📍 {session.location}</p>
                        <p className="text-xs text-[#64748b]">IP: {session.ip}</p>
                        <p className="text-xs text-[#64748b]">{session.lastActive}</p>
                      </div>
                    </div>
                    {!session.current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeSession(session.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDevicesDialog(false)}>
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  toast.success('All other sessions revoked');
                  setShowDevicesDialog(false);
                }}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Revoke All Others
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Password Change Dialog */}
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
                <label className="text-sm font-medium text-[#0f172a]">Current Password</label>
                <input
                  type="password"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#0f172a]">New Password</label>
                <input
                  type="password"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#0f172a]">Confirm New Password</label>
                <input
                  type="password"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                Cancel
              </Button>
              <Button
                className="bg-[#10B981] hover:bg-[#059669]"
                onClick={() => {
                  setShowPasswordDialog(false);
                  toast.success('Password changed successfully');
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
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-[#e2e8f0]">
        <div className="border-b border-[#e2e8f0] p-6">
          <div className="mb-1 text-sm text-[#64748b]">{tenantName}</div>
          <div className="text-lg text-[#0f172a]">Agency Admin</div>
        </div>

        <div className="flex-1 py-4 px-3 overflow-y-auto">
          {renderSidebarNav()}
        </div>

        <div className="border-t border-[#e2e8f0] p-4">
          <Button
            onClick={handleLogout}
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
              <div className="mb-1 text-sm text-[#64748b]">{tenantName}</div>
              <div className="text-lg text-[#0f172a]">Agency Admin</div>
            </SheetTitle>
            <SheetDescription className="sr-only">
              Navigation menu for Agency Admin Portal
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 py-4 px-3 overflow-y-auto">
            {renderSidebarNav()}
          </div>

          <div className="border-t border-[#e2e8f0] p-4">
            <Button
              onClick={handleLogout}
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
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="md:hidden w-10 h-10 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] flex items-center justify-center transition-colors"
              >
                <Menu className="w-5 h-5 text-[#64748b]" />
              </button>

              <div>
                <h1 className="text-xl text-[#0f172a]">
                  {activeTab === 'charts' && 'Charts'}
                  {activeTab === 'patients' && 'Patients'}
                  {activeTab === 'clinicians' && 'Clinicians'}
                  {activeTab === 'users' && 'Users & Onboarding'}
                  {activeTab === 'profile' && 'My Profile'}
                  {activeTab === 'settings' && 'Settings'}
                </h1>
                <p className="text-sm text-[#64748b]">
                  {activeTab === 'charts' && 'Review and manage patient charts'}
                  {activeTab === 'patients' && 'Manage patient information'}
                  {activeTab === 'clinicians' && 'Manage clinician accounts'}
                  {activeTab === 'users' && 'Onboard and manage users'}
                  {activeTab === 'profile' && 'View and manage your profile'}
                  {activeTab === 'settings' && 'Manage your account settings'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
                  if (!user?.id) {
                    toast.error('User not logged in');
                    return;
                  }
                  
                  try {
                    await notificationService.createNotification(
                      user.id,
                      'agency_admin',
                      'chart_submitted',
                      '📥 New Chart for Review',
                      'Dr. Sarah Johnson submitted a chart for patient Emily Davis.',
                      'high',
                      { chartId: '456', clinicianName: 'Dr. Sarah Johnson', patientName: 'Emily Davis' },
                      '/admin/charts/456',
                      'Review Chart'
                    );
                    toast.success('Test notification created! Check the bell icon.');
                  } catch (error) {
                    console.error('Failed to create notification:', error);
                    toast.error('Failed to create notification');
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
                userRole="agency_admin"
                onNavigate={(url) => {
                  // Handle navigation based on URL
                  if (url.includes('/charts')) {
                    setActiveTab('charts');
                  } else if (url.includes('/patients')) {
                    setActiveTab('patients');
                  } else if (url.includes('/clinicians')) {
                    setActiveTab('clinicians');
                  }
                }}
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'charts' && renderChartsTab()}
          {activeTab === 'patients' && <AgencyPatientsView />}
          {activeTab === 'clinicians' && renderCliniciansTab()}
          {activeTab === 'users' && <AgencyUsersView />}
          {activeTab === 'profile' && renderProfile()}
          {activeTab === 'settings' && renderSettings()}
        </main>
      </div>

      <Toaster position="top-right" />

      {/* Add Patient Modal */}
      <Dialog open={isAddPatientModalOpen} onOpenChange={setIsAddPatientModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Patient</DialogTitle>
            <DialogDescription>
              Enter patient information to create a new record
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={newPatient.name}
                onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                placeholder="Jane Doe"
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-white"
              />
            </div>
            <div>
              <Label htmlFor="dob">Date of Birth *</Label>
              <Input
                id="dob"
                type="date"
                value={newPatient.dob}
                onChange={(e) => setNewPatient({ ...newPatient, dob: e.target.value })}
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-white"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={newPatient.address}
                onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                placeholder="123 Main St, City, State"
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-white"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newPatient.phone}
                onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0] bg-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddPatientModalOpen(false)}
              className="h-12 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPatient}
              className="h-12 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advanced Search Modal */}
      <Dialog open={isAdvancedSearchOpen} onOpenChange={setIsAdvancedSearchOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Advanced Search</DialogTitle>
            <DialogDescription>
              Search charts with multiple filters
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="adv-patient">Patient Name</Label>
                <Input
                  id="adv-patient"
                  value={advancedFilters.patientName}
                  onChange={(e) => setAdvancedFilters({ ...advancedFilters, patientName: e.target.value })}
                  placeholder="Search..."
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="adv-clinician">Clinician Name</Label>
                <Input
                  id="adv-clinician"
                  value={advancedFilters.clinicianName}
                  onChange={(e) => setAdvancedFilters({ ...advancedFilters, clinicianName: e.target.value })}
                  placeholder="Search..."
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="adv-date-from">Date From</Label>
                <Input
                  id="adv-date-from"
                  type="date"
                  value={advancedFilters.dateFrom}
                  onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateFrom: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="adv-date-to">Date To</Label>
                <Input
                  id="adv-date-to"
                  type="date"
                  value={advancedFilters.dateTo}
                  onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateTo: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="adv-source">Scan Source</Label>
                <Select
                  value={advancedFilters.scanSource}
                  onValueChange={(value) => setAdvancedFilters({ ...advancedFilters, scanSource: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="bottle">Bottle Scan</SelectItem>
                    <SelectItem value="pdf">PDF Import</SelectItem>
                    <SelectItem value="manual">Manual Entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="flex items-center space-x-2 pb-2">
                  <Checkbox
                    id="adv-confidence"
                    checked={advancedFilters.confidenceIssues}
                    onCheckedChange={(checked) =>
                      setAdvancedFilters({ ...advancedFilters, confidenceIssues: checked as boolean })
                    }
                  />
                  <Label htmlFor="adv-confidence" className="text-sm cursor-pointer">
                    Low confidence only
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAdvancedFilters({
                  patientName: '',
                  clinicianName: '',
                  dateFrom: '',
                  dateTo: '',
                  scanSource: '',
                  confidenceIssues: false,
                });
              }}
            >
              Clear Filters
            </Button>
            <Button
              onClick={() => {
                toast.info('Advanced search applied');
                setIsAdvancedSearchOpen(false);
              }}
              className="bg-[#10B981] hover:bg-[#059669] text-white"
            >
              <Search className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Chart Modal */}
      <Dialog open={isReopenModalOpen} onOpenChange={setIsReopenModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reopen Delivered Chart</DialogTitle>
            <DialogDescription>
              This chart is locked. Please provide a reason for reopening for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reopen-reason">Audit Reason *</Label>
            <Textarea
              id="reopen-reason"
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="e.g., Medication dosage correction needed, patient request..."
              className="mt-2 min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReopenModalOpen(false);
                setReopenReason('');
                setSelectedChartId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReopenConfirm}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
            >
              <Undo2 className="w-4 h-4 mr-2" />
              Reopen Chart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return to Clinician Modal */}
      <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Return Chart to Clinician</DialogTitle>
            <DialogDescription>
              Provide feedback for the clinician about what needs to be corrected.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="return-note">Feedback for Clinician *</Label>
            <Textarea
              id="return-note"
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              placeholder="e.g., Please verify medication dosages, missing prescription details..."
              className="mt-2 min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReturnModalOpen(false);
                setReturnNote('');
                setSelectedChartId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReturnToClinicianConfirm}
              className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return for Edits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Modal */}
      <Dialog open={isReassignModalOpen} onOpenChange={setIsReassignModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reassign Chart</DialogTitle>
            <DialogDescription>
              Select a clinician to reassign this chart to.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reassign-clinician">Clinician *</Label>
            <Select value={reassignClinician} onValueChange={setReassignClinician}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select clinician..." />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter(u => u.role === 'clinician')
                  .map((clinician) => (
                    <SelectItem key={clinician.id} value={clinician.id}>
                      {clinician.first_name} {clinician.last_name} ({clinician.assigned_chart_count || 0} patients)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReassignModalOpen(false);
                setReassignClinician('');
                setSelectedChartId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReassignConfirm}
              className="bg-[#0966CC] hover:bg-[#075985] text-white"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Reassign Chart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Bar - Slides in when charts selected */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ 
          y: selectedCharts.length > 0 ? 0 : 100, 
          opacity: selectedCharts.length > 0 ? 1 : 0 
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 ${
          selectedCharts.length === 0 ? 'pointer-events-none' : ''
        }`}
      >
        <div className="bg-white rounded-xl shadow-2xl border-2 border-[#10B981] px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
            <div className="w-10 h-10 rounded-lg bg-[#10B981] flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{selectedCharts.length} selected</p>
              <p className="text-xs text-slate-500">Bulk actions</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkReturn()}
                    className="border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Return to Clinician
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send selected charts back for corrections</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkApprove()}
                    className="border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve & Lock
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Approve and finalize selected charts</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsReassignModalOpen(true)}
                    className="border-[#0966CC] text-[#0966CC] hover:bg-[#0966CC]/10"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Bulk Assign
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Assign selected charts to a clinician</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info('Downloading PDFs...')}
                    className="border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDFs
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download PDFs for all selected charts</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedCharts([])}
              className="ml-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Offline/Sync Status Indicator */}
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-[#DC2626] text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Offline — some actions unavailable</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
