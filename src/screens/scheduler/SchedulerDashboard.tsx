import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Users,
  Search,
  Plus,
  FileText,
  Clock,
  Bell,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  User,
  ChevronRight,
  Camera,
  Download,
  Scan,
  UserPlus,
  CheckCircle2,
  Send,
  Eye,
  ChevronDown,
  Star,
  AlertCircle,
  TrendingUp,
  Loader2,
  Shield,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Edit,
  EyeOff,
  LightbulbIcon,
  HelpCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover';
import { Switch } from '../../components/ui/switch';
import NotificationCenter from '../../components/NotificationCenter';
import { notificationService } from '../../services/notificationService';
import { Screen, NavigationParams } from '../../App';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import SchedulerProfile from './SchedulerProfile';
import SchedulerSettings from './SchedulerSettings';
import DocumentLibrary from './DocumentLibrary';
import DocumentScanner from './DocumentScanner';
import DocumentCamera from '../../components/DocumentCamera';
import {
  fetchAllCharts,
  fetchUnassignedCharts,
  fetchClinicians,
  createPatientWithChart,
  assignChart,
  reassignChart,
  getDashboardStats,
  ChartWithPatient,
  Clinician as ClinicianType,
} from '../../services/schedulerService';
import { getDocumentStats } from '../../services/documentService';
import { transformChartsForUI, UIChart } from '../../utils/chartTransformers';

interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
}

type TabType = 'charts' | 'scan' | 'assign' | 'profile' | 'settings' | 'documents';

export default function SchedulerDashboard({ navigation }: Props) {
  const { user, logout } = useAuth();
  
  // UI State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('charts');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartFilter, setChartFilter] = useState<'all' | 'needs-assignment' | 'assigned' | 'completed'>('all');
  
  // Data State
  const [charts, setCharts] = useState<UIChart[]>([]);
  const [clinicians, setClinicians] = useState<ClinicianType[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalCharts: 0,
    unassignedCharts: 0,
    chartsWithDocuments: 0,
    newDocsToday: 0,
  });
  
  // Modal State
  const [isCreateChartModalOpen, setIsCreateChartModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isPatientSelectionOpen, setIsPatientSelectionOpen] = useState(false);
  const [selectedChart, setSelectedChart] = useState<UIChart | null>(null);
  const [selectedClinician, setSelectedClinician] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'camera' | 'file' | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showScanGuideModal, setShowScanGuideModal] = useState(false);
  const [showDocumentCamera, setShowDocumentCamera] = useState(false);
  const [selectedChartForScan, setSelectedChartForScan] = useState<string | null>(null);
  
  // Form State
  const [newChart, setNewChart] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    address_line1: '',
    phone: '',
  });

  // Load data on mount and when tenant changes
  useEffect(() => {
    if (user?.tenant_id) {
      loadData();
    }
  }, [user?.tenant_id]);

  const loadData = async () => {
    if (!user?.tenant_id) return;
    
    try {
      setLoading(true);
      const [chartsData, cliniciansData, statsData] = await Promise.all([
        fetchAllCharts(user.tenant_id),
        fetchClinicians(user.tenant_id),
        getDashboardStats(user.tenant_id),
      ]);
      
      console.log('Dashboard data loaded:', {
        charts: chartsData?.length,
        clinicians: cliniciansData?.length,
        cliniciansData,
      });
      
      // Transform charts to UI format
      setCharts(transformChartsForUI(chartsData));
      setClinicians(cliniciansData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigation.navigate('Landing');
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setIsDrawerOpen(false);
  };

  const handleCreateChart = async () => {
    if (!newChart.first_name || !newChart.last_name || !newChart.date_of_birth) {
      toast.error('Please fill in required fields (First Name, Last Name, Date of Birth)');
      return;
    }

    if (!user?.tenant_id || !user?.id) {
      toast.error('User information not available');
      return;
    }

    try {
      setCreating(true);
      const result = await createPatientWithChart(newChart, user.tenant_id, user.id);
      
      if (result.existingChartFound) {
        toast.error(`Patient ${result.patient.first_name} ${result.patient.last_name} already has a chart. Each patient can only have one chart.`);
      } else if (result.isNewPatient) {
        toast.success(`New patient and chart created for ${result.patient.first_name} ${result.patient.last_name}`);
      } else {
        toast.success(`Chart created for existing patient ${result.patient.first_name} ${result.patient.last_name}`);
      }
      
      setIsCreateChartModalOpen(false);
      setNewChart({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        address_line1: '',
        phone: '',
      });
      loadData(); // Reload data to show new chart
    } catch (error: any) {
      console.error('Error creating chart:', error);
      toast.error(error.message || 'Failed to create chart');
    } finally {
      setCreating(false);
    }
  };

  const handleAssignChart = async () => {
    if (!selectedClinician) {
      toast.error('Please select a clinician');
      return;
    }

    if (!selectedChart) {
      toast.error('No chart selected');
      return;
    }

    try {
      await assignChart(selectedChart.id, selectedClinician);
      const clinician = clinicians.find(c => c.id === selectedClinician);
      toast.success(`Chart assigned to ${clinician?.first_name} ${clinician?.last_name}!`);
      setIsAssignModalOpen(false);
      setSelectedChart(null);
      setSelectedClinician('');
      loadData(); // Reload data to reflect assignment
    } catch (error: any) {
      console.error('Error assigning chart:', error);
      toast.error(error.message || 'Failed to assign chart');
    }
  };

  const handleReassignChart = async (chartId: string, newClinicianId: string) => {
    try {
      await reassignChart(chartId, newClinicianId);
      const clinician = clinicians.find(c => c.id === newClinicianId);
      toast.success(`Chart reassigned to ${clinician?.first_name} ${clinician?.last_name}!`);
      loadData(); // Reload data to reflect reassignment
    } catch (error: any) {
      console.error('Error reassigning chart:', error);
      toast.error(error.message || 'Failed to reassign chart');
    }
  };

  // Helper function to map database status to display status
  const mapChartStatus = (dbStatus: string): string => {
    switch (dbStatus) {
      case 'needs_assignment':
        return 'Needs Assignment';
      case 'assigned':
        return 'Assigned';
      case 'active':
        return 'Docs Available';
      case 'verified_ready':
      case 'delivered_locked':
        return 'Completed';
      default:
        return 'Needs Assignment';
    }
  };

  // Helper function to check if a chart was created recently (within 24 hours)
  const isChartNew = (createdDate: string): boolean => {
    const created = new Date(createdDate);
    const now = new Date();
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  // Helper function to calculate waiting days
  const getWaitingDays = (createdDate: string, assignedTo?: string): number => {
    if (assignedTo) return 0; // Not waiting if assigned
    const created = new Date(createdDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff;
  };

  // Quick action handlers
  const handleQuickCameraScan = () => {
    setUploadMethod('camera');
    setIsPatientSelectionOpen(true);
  };

  const handleCameraCapture = async (file: File) => {
    if (!selectedChartForScan || !user?.id || !user?.tenant_id) {
      setShowDocumentCamera(false);
      return;
    }

    try {
      const { uploadDocument } = await import('../../services/documentService');
      await uploadDocument(file, selectedChartForScan, user.tenant_id, user.id);
      toast.success('Document captured and uploaded successfully');
      setShowDocumentCamera(false);
      setSelectedChartForScan(null);
      loadData();
    } catch (error: any) {
      console.error('Error uploading captured document:', error);
      toast.error('Failed to upload captured document');
    }
  };

  const handleQuickFileImport = () => {
    // Trigger file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';
    input.multiple = true;
    input.onchange = (e: any) => {
      const files = Array.from(e.target.files || []) as File[];
      if (files.length > 0) {
        setPendingFiles(files);
        setUploadMethod('file');
        setIsPatientSelectionOpen(true);
      }
    };
    input.click();
  };

  const handlePatientSelected = async (chartId: string) => {
    if (!user?.id || !user?.tenant_id) return;

    setUploading(true);
    try {
      const { uploadDocument } = await import('../../services/documentService');
      
      if (uploadMethod === 'file' && pendingFiles.length > 0) {
        // Upload files to the selected chart
        await Promise.all(
          pendingFiles.map(file => uploadDocument(file, chartId, user.tenant_id, user.id))
        );
        toast.success(`${pendingFiles.length} file(s) uploaded successfully`);
      } else if (uploadMethod === 'camera') {
        // Open camera scanner for this chart
        setSelectedChartForScan(chartId);
        setIsPatientSelectionOpen(false);
        setShowDocumentCamera(true);
        setUploading(false);
        return;
      }
      
      setIsPatientSelectionOpen(false);
      setPendingFiles([]);
      setUploadMethod(null);
      loadData(); // Refresh data
    } catch (error: any) {
      console.error('Error uploading documents:', error);
      toast.error(error.message || 'Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  // Sidebar Navigation Component
  const renderSidebarNav = () => (
    <nav className="space-y-1">
      <button
        onClick={() => handleTabChange('charts')}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
          activeTab === 'charts'
            ? 'bg-[#FEF3C7] text-[#F59E0B]'
            : 'text-[#64748b] hover:bg-[#f8fafc]'
        }`}
      >
        <FileText className="w-5 h-5" />
        <span>Patient Charts</span>
      </button>
      <button
        onClick={() => handleTabChange('scan')}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
          activeTab === 'scan'
            ? 'bg-[#FEF3C7] text-[#F59E0B]'
            : 'text-[#64748b] hover:bg-[#f8fafc]'
        }`}
      >
        <Camera className="w-5 h-5" />
        <span>Scan Documents</span>
      </button>
      <button
        onClick={() => handleTabChange('documents')}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
          activeTab === 'documents'
            ? 'bg-[#FEF3C7] text-[#F59E0B]'
            : 'text-[#64748b] hover:bg-[#f8fafc]'
        }`}
      >
        <FileText className="w-5 h-5" />
        <span>Document Library</span>
      </button>
      <button
        onClick={() => handleTabChange('assign')}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
          activeTab === 'assign'
            ? 'bg-[#FEF3C7] text-[#F59E0B]'
            : 'text-[#64748b] hover:bg-[#f8fafc]'
        }`}
      >
        <UserPlus className="w-5 h-5" />
        <span>Assign Charts</span>
      </button>
      <button
        onClick={() => handleTabChange('profile')}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
          activeTab === 'profile'
            ? 'bg-[#FEF3C7] text-[#F59E0B]'
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
            ? 'bg-[#FEF3C7] text-[#F59E0B]'
            : 'text-[#64748b] hover:bg-[#f8fafc]'
        }`}
      >
        <SettingsIcon className="w-5 h-5" />
        <span>Settings</span>
      </button>
    </nav>
  );

  // Patient Charts Tab
  const renderChartsTab = () => {
    const filteredCharts = charts
      .filter(chart => {
        // Filter by search query
        const matchesSearch = chart.patientName.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Filter by status tab
        const matchesFilter = 
          chartFilter === 'all' ? true :
          chartFilter === 'needs-assignment' ? (chart.status === 'Needs Assignment' || chart.status === 'Docs Available') :
          chartFilter === 'assigned' ? chart.status === 'Assigned' :
          chartFilter === 'completed' ? chart.status === 'Completed' :
          true;
        
        return matchesSearch && matchesFilter;
      });

    return (
      <div className="space-y-6">
        {/* Header with Create Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl text-[#0f172a]">Patient Charts</h2>
            <p className="text-sm text-[#64748b]">Create charts and manage patient records</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setIsCreateChartModalOpen(true)}
              className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Chart
            </Button>
            <Button
              onClick={handleQuickCameraScan}
              variant="outline"
              className="border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]"
            >
              <Camera className="w-4 h-4 mr-2" />
              Camera Scan
            </Button>
            <Button
              onClick={handleQuickFileImport}
              variant="outline"
              className="border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]"
            >
              <Download className="w-4 h-4 mr-2" />
              Import File
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
          <Input
            placeholder="Search charts by patient name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-xl border-2 border-[#e2e8f0] bg-white"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setChartFilter('all')}
            variant={chartFilter === 'all' ? 'default' : 'outline'}
            className={chartFilter === 'all' 
              ? 'bg-[#F59E0B] hover:bg-[#D97706] text-white' 
              : 'border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]'}
          >
            All Charts
          </Button>
          <Button
            onClick={() => setChartFilter('needs-assignment')}
            variant={chartFilter === 'needs-assignment' ? 'default' : 'outline'}
            className={chartFilter === 'needs-assignment' 
              ? 'bg-[#F59E0B] hover:bg-[#D97706] text-white' 
              : 'border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]'}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Needs Assignment
          </Button>
          <Button
            onClick={() => setChartFilter('assigned')}
            variant={chartFilter === 'assigned' ? 'default' : 'outline'}
            className={chartFilter === 'assigned' 
              ? 'bg-[#F59E0B] hover:bg-[#D97706] text-white' 
              : 'border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]'}
          >
            Assigned
          </Button>
          <Button
            onClick={() => setChartFilter('completed')}
            variant={chartFilter === 'completed' ? 'default' : 'outline'}
            className={chartFilter === 'completed' 
              ? 'bg-[#F59E0B] hover:bg-[#D97706] text-white' 
              : 'border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]'}
          >
            Completed
          </Button>
        </div>

        {/* Charts List */}
        {filteredCharts.length > 0 ? (
          <div className="space-y-3">
            {filteredCharts.map((chart) => {
              const getStatusBadgeStyle = (status: UIChart['status']) => {
                switch (status) {
                  case 'Needs Assignment':
                    return 'bg-[#FEF3C7] text-[#F59E0B] border-[#FDE68A]';
                  case 'Assigned':
                    return 'bg-[#DBEAFE] text-[#0966CC] border-[#BFDBFE]';
                  case 'Docs Available':
                    return 'bg-[#E0E7FF] text-[#4F46E5] border-[#C7D2FE]';
                  case 'Completed':
                    return 'bg-[#D1FAE5] text-[#10B981] border-[#A7F3D0]';
                  default:
                    return 'bg-[#f1f5f9] text-[#64748b] border-[#e2e8f0]';
                }
              };

              return (
                <div
                  key={chart.id}
                  className="bg-white rounded-xl border border-[#e2e8f0] p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg text-[#0f172a]">{chart.patientName}</h3>
                        <Badge className={getStatusBadgeStyle(chart.status)}>
                          {chart.status === 'Assigned' && chart.assignedTo 
                            ? `Assigned (${chart.assignedTo})` 
                            : chart.status}
                        </Badge>
                        
                        {/* Context Chips */}
                        {chart.isNew && (
                          <Badge className="bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]">
                            <Star className="w-3 h-3 mr-1" />
                            New
                          </Badge>
                        )}
                        {(chart.documentCount > 0 && chart.status !== 'Completed') && (
                          <Badge variant="outline" className="border-[#E0E7FF] text-[#4F46E5] bg-[#F5F3FF]">
                            <FileText className="w-3 h-3 mr-1" />
                            {chart.documentCount} Doc{chart.documentCount !== 1 ? 's' : ''} Pending
                          </Badge>
                        )}
                        {(chart.waitingDays > 0) && (
                          <Badge variant="outline" className="border-[#FDE68A] text-[#D97706] bg-[#FFFBEB]">
                            <Clock className="w-3 h-3 mr-1" />
                            Waiting {chart.waitingDays}d
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 mb-3">
                        <p className="text-sm text-[#64748b]">
                          ID: {chart.patientId}
                        </p>
                        <p className="text-sm text-[#64748b]">
                          DOB: {new Date(chart.patientDob).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-[#64748b]">
                        <span>{chart.documentCount} document{chart.documentCount !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>Created {new Date(chart.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>

                      {/* Assigned Clinician with Avatar */}
                      {chart.assignedTo && (
                        <div className="flex items-center gap-2 mt-3">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="bg-gradient-to-br from-[#E0F2FE] to-[#BFDBFE] text-[#0966CC] text-xs">
                              {chart.assignedTo.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-sm text-[#0966CC] hover:underline h-auto p-0 hover:bg-transparent flex items-center gap-1">
                                Assigned to: {chart.assignedTo}
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3">
                              <div className="space-y-2">
                                <p className="text-sm text-[#64748b] mb-2">Reassign to:</p>
                                {clinicians.map((clinician) => (
                                  <button
                                    key={clinician.id}
                                    onClick={() => handleReassignChart(chart.id, clinician.id)}
                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#f8fafc] transition-colors text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Avatar className="w-6 h-6">
                                        <AvatarFallback className="bg-gradient-to-br from-[#E0F2FE] to-[#BFDBFE] text-[#0966CC] text-xs">
                                          {clinician.first_name[0]}{clinician.last_name[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="text-[#0f172a]">{clinician.first_name} {clinician.last_name}</p>
                                        <p className="text-xs text-[#64748b]">{clinician.active_chart_count} charts</p>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {chart.documentCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('Viewing documents for chart:', chart.id);
                          alert('Document viewer would open here');
                        }}
                        className="border-[#E0E7FF] text-[#4F46E5] hover:bg-[#F5F3FF]"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Docs
                      </Button>
                    )}
                    
                    {!chart.assignedTo && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#F59E0B] text-[#F59E0B] hover:bg-[#FEF3C7]"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Assign to Clinician
                            <ChevronDown className="w-4 h-4 ml-1" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3">
                          <div className="space-y-2">
                            <p className="text-sm text-[#64748b] mb-2">Select clinician:</p>
                            {clinicians.map((clinician) => (
                              <button
                                key={clinician.id}
                                onClick={async () => {
                                  try {
                                    await assignChart(chart.id, clinician.id);
                                    toast.success(`Chart assigned to ${clinician.first_name} ${clinician.last_name}!`);
                                    loadData();
                                  } catch (error: any) {
                                    console.error('Error assigning chart:', error);
                                    toast.error(error.message || 'Failed to assign chart');
                                  }
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#f8fafc] transition-colors text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarFallback className="bg-gradient-to-br from-[#E0F2FE] to-[#BFDBFE] text-[#0966CC] text-xs">
                                      {clinician.first_name[0]}{clinician.last_name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-[#0f172a]">{clinician.first_name} {clinician.last_name}</p>
                                    <p className="text-xs text-[#64748b]">{clinician.active_chart_count} charts</p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>

                  {/* Future Automation Hint */}
                  {!chart.assignedTo && chart.status === 'Needs Assignment' && (
                    <div className="mt-3 pt-3 border-t border-[#f1f5f9]">
                      <div className="flex items-center gap-2 text-xs text-[#64748b]">
                        <TrendingUp className="w-3 h-3" />
                        <span>Suggested: Anna Clinician (5 charts, closest location)</span>
                        <Badge variant="outline" className="text-xs border-[#E0E7FF] text-[#4F46E5]">
                          Coming Soon
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center">
            <FileText className="w-12 h-12 text-[#cbd5e1] mx-auto mb-3" />
            <p className="text-[#64748b]">
              {searchQuery 
                ? 'No charts found matching your search.' 
                : chartFilter === 'needs-assignment'
                ? 'No charts need assignment at this time.'
                : 'No charts found. Create a new chart to get started.'}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Scan Documents Tab
  const renderScanTab = () => {
    // Calculate document status from actual stats
    const totalDocs = stats.chartsWithDocuments;
    const hasDocuments = totalDocs > 0;
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl text-[#0f172a]">Scan Documents</h2>
            <p className="text-sm text-[#64748b]">Scan and attach documents to patient charts</p>
          </div>
        </div>

        {/* Status Chips */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <p className="text-sm text-[#64748b] mb-3">Document Status</p>
          <div className="flex flex-wrap gap-2">
            {stats.newDocsToday > 0 && (
              <Badge className="bg-[#E0F2FE] text-[#0966CC] border-[#BFDBFE]">
                <FileText className="w-3 h-3 mr-1" />
                {stats.newDocsToday} New Today
              </Badge>
            )}
            {stats.chartsWithDocuments > 0 && (
              <Badge className="bg-[#D1FAE5] text-[#10B981] border-[#A7F3D0]">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {stats.chartsWithDocuments} Charts with Docs
              </Badge>
            )}
            {!hasDocuments && (
              <Badge className="bg-[#F1F5F9] text-[#64748b] border-[#E2E8F0]">
                <AlertCircle className="w-3 h-3 mr-1" />
                No documents yet
              </Badge>
            )}
          </div>
        </div>

        {/* Scan Options */}
        <div className="space-y-3">
          {/* Camera Scan */}
          <button 
            onClick={handleQuickCameraScan}
            className="w-full bg-white rounded-xl border-2 border-[#e2e8f0] p-6 hover:border-[#F59E0B] hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#FEF3C7] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Camera className="w-7 h-7 text-[#F59E0B]" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg text-[#0f172a] mb-1">Camera Scan</h4>
                <p className="text-sm text-[#64748b] mb-2">Scan paper docs using device camera</p>
                <p className="text-xs text-[#94a3b8]">
                  Best for discharge summaries, medical records, and insurance cards
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#cbd5e1] flex-shrink-0" />
            </div>
          </button>

          {/* Import File */}
          <button 
            onClick={handleQuickFileImport}
            className="w-full bg-white rounded-xl border-2 border-dashed border-[#e2e8f0] p-6 hover:border-[#F59E0B] hover:bg-[#FFFBEB] hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Download className="w-7 h-7 text-[#0966CC]" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg text-[#0f172a] mb-1">Import File</h4>
                <p className="text-sm text-[#64748b] mb-2">Upload a PDF or photo from computer</p>
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-[#94a3b8]">Supports: PDF, JPG, PNG, HEIC</p>
                  <p className="text-xs text-[#0966CC] italic">Drop files here or click to browse</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#cbd5e1] flex-shrink-0" />
            </div>
          </button>
        </div>

        {/* Help CTA */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-[#0966CC]" />
              </div>
              <div>
                <p className="text-sm text-[#0f172a]">Need help scanning?</p>
                <p className="text-xs text-[#64748b]">Tips for better quality scans</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                console.log('View Guide clicked, opening modal');
                setShowScanGuideModal(true);
              }}
              className="border-[#E0F2FE] text-[#0966CC] hover:bg-[#F0F9FF] flex-shrink-0"
            >
              <HelpCircle className="w-4 h-4 mr-1" />
              View Guide
            </Button>
          </div>
        </div>

        {/* HIPAA Notice with Offline Sync */}
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-4 space-y-2">
          <p className="text-sm text-[#92400E]">
            <strong>HIPAA Compliant:</strong> All scanned documents are securely encrypted and stored. Documents can be attached to patient charts for clinician review.
          </p>
          <p className="text-xs text-[#92400E] flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
            Offline scans will sync automatically once reconnected
          </p>
        </div>
      </div>
    );
  };

  // Assign Charts Tab
  const renderAssignTab = () => {
    const unassigned = charts.filter(c => !c.assignedTo);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl text-[#0f172a]">Assign Charts</h2>
          <p className="text-sm text-[#64748b]">Assign charts to clinicians for review</p>
        </div>

        {unassigned.length > 0 ? (
          <div className="space-y-3">
            {unassigned.map((chart) => (
              <div
                key={chart.id}
                className="bg-white rounded-xl border border-[#e2e8f0] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg text-[#0f172a]">{chart.patientName}</h3>
                      {chart.isNew && (
                        <Badge className="bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]">
                          <Star className="w-3 h-3 mr-1" />
                          New
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 mb-3">
                      <p className="text-sm text-[#64748b]">ID: {chart.patientId}</p>
                      <p className="text-sm text-[#64748b]">
                        DOB: {new Date(chart.patientDob).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-[#FEF3C7] text-[#F59E0B] border-[#FDE68A]">
                        {chart.status}
                      </Badge>
                      {(chart.documentCount > 0) && (
                        <Badge variant="outline" className="border-[#E0E7FF] text-[#4F46E5] bg-[#F5F3FF]">
                          <FileText className="w-3 h-3 mr-1" />
                          {chart.documentCount} Doc{chart.documentCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {(chart.waitingDays > 0) && (
                        <Badge variant="outline" className="border-[#FDE68A] text-[#D97706] bg-[#FFFBEB]">
                          <Clock className="w-3 h-3 mr-1" />
                          Waiting {chart.waitingDays}d
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedChart(chart);
                      setIsAssignModalOpen(true);
                    }}
                    className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-[#10B981] mx-auto mb-3" />
            <p className="text-[#0f172a] mb-1">All charts are assigned!</p>
            <p className="text-sm text-[#64748b]">All patient charts have been assigned to clinicians.</p>
          </div>
        )}

        {/* Clinicians List */}
        <div>
          <h3 className="text-lg text-[#0f172a] mb-3">Available Clinicians</h3>
          <div className="space-y-2">
            {clinicians.map((clinician) => (
              <div
                key={clinician.id}
                className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-gradient-to-br from-[#E0F2FE] to-[#BFDBFE] text-[#0966CC]">
                      {clinician.first_name[0]}{clinician.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-[#0f172a]">{clinician.first_name} {clinician.last_name}</p>
                    <p className="text-xs text-[#64748b]">{clinician.active_chart_count} assigned chart{clinician.active_chart_count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Profile Tab
  const renderProfileTab = () => {
    const lastLoginDate = new Date('2025-11-05T09:30:00');
    const accountCreatedDate = new Date('2024-03-15');
    const mfaEnabled = true;

    return (
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarFallback className="bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white text-2xl">
                  JM
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#F59E0B] hover:bg-[#D97706] flex items-center justify-center shadow-md transition-colors">
                <Edit className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl text-[#0f172a] mb-2">Jessica Martinez</h2>
              <p className="text-[#64748b] mb-3">Scheduler • HealthCare Partners LLC</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <Badge className="bg-[#D1FAE5] text-[#10B981] border-[#A7F3D0]">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Active
                </Badge>
                {mfaEnabled && (
                  <Badge className="bg-[#E0F2FE] text-[#0966CC] border-[#BFDBFE]">
                    <Shield className="w-3 h-3 mr-1" />
                    MFA Enabled
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('Edit profile');
                alert('Edit profile functionality would open here');
              }}
              className="border-[#F59E0B] text-[#F59E0B] hover:bg-[#FEF3C7]"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Activity & Security Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#0966CC]" />
              </div>
              <div>
                <p className="text-sm text-[#64748b]">Last Login</p>
                <p className="text-[#0f172a]">
                  {lastLoginDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {lastLoginDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-sm text-[#64748b]">Account Created</p>
                <p className="text-[#0f172a]">
                  {accountCreatedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#10B981]" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#64748b]">Two-Factor Authentication</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={mfaEnabled ? "bg-[#D1FAE5] text-[#10B981] border-[#A7F3D0]" : "bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]"}>
                    {mfaEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E0E7FF] flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#4F46E5]" />
              </div>
              <div>
                <p className="text-sm text-[#64748b]">Password</p>
                <p className="text-[#0f172a]">Last changed 45 days ago</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-2xl text-[#0f172a]">{stats.totalCharts}</p>
                <p className="text-sm text-[#64748b]">Charts Created</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#E0F2FE] flex items-center justify-center">
                <Users className="w-6 h-6 text-[#0966CC]" />
              </div>
              <div>
                <p className="text-2xl text-[#0f172a]">{stats.totalPatients}</p>
                <p className="text-sm text-[#64748b]">Patients Managed</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#D1FAE5] flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
              </div>
              <div>
                <p className="text-2xl text-[#0f172a]">{charts.filter(c => c.assignedTo).length}</p>
                <p className="text-sm text-[#64748b]">Charts Assigned</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg text-[#0f172a]">Contact Information</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                console.log('Edit contact info');
                alert('Edit contact information would open here');
              }}
              className="text-[#F59E0B] hover:text-[#D97706] hover:bg-[#FEF3C7]"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-[#0966CC]" />
              </div>
              <div>
                <p className="text-sm text-[#64748b]">Email Address</p>
                <p className="text-[#0f172a]">jessica.martinez@hcp.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-sm text-[#64748b]">Phone Number</p>
                <p className="text-[#0f172a]">(555) 987-6543</p>
              </div>
            </div>
            <div className="flex items-start gap-3 md:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <p className="text-sm text-[#64748b]">Agency</p>
                <p className="text-[#0f172a]">HealthCare Partners LLC</p>
                <p className="text-sm text-[#64748b] mt-1">123 Healthcare Blvd, Medical City, CA 90210</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Actions */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <h3 className="text-lg text-[#0f172a] mb-4">Security & Account</h3>
          <div className="space-y-3">
            <button
              onClick={() => {
                console.log('Change password');
                alert('Change password dialog would open here');
              }}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-[#e2e8f0] hover:border-[#F59E0B] hover:bg-[#FFFBEB] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E0E7FF] flex items-center justify-center group-hover:bg-[#FEF3C7] transition-colors">
                  <Lock className="w-5 h-5 text-[#4F46E5] group-hover:text-[#F59E0B] transition-colors" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-[#0f172a]">Change Password</p>
                  <p className="text-xs text-[#64748b]">Update your account password</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#cbd5e1]" />
            </button>

            <button
              onClick={() => {
                console.log('Manage MFA');
                alert('MFA settings would open here');
              }}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-[#e2e8f0] hover:border-[#F59E0B] hover:bg-[#FFFBEB] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center group-hover:bg-[#FEF3C7] transition-colors">
                  <Shield className="w-5 h-5 text-[#10B981] group-hover:text-[#F59E0B] transition-colors" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-[#0f172a]">Two-Factor Authentication</p>
                  <p className="text-xs text-[#64748b]">Manage MFA settings</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#cbd5e1]" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Settings Tab
  const renderSettingsTab = () => {
    const handleChangePassword = () => {
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
      setIsChangePasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    };

    return (
      <div className="max-w-4xl space-y-6">
        {/* Account Settings */}
        <div>
          <h3 className="text-sm text-[#64748b] mb-3 px-2">ACCOUNT</h3>
          <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
            <button
              onClick={() => setIsChangePasswordDialogOpen(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-[#f8fafc] transition-colors border-b border-[#e2e8f0]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-[#0f172a]">Change Password</p>
                  <p className="text-xs text-[#64748b]">Update your account password</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#cbd5e1]" />
            </button>
            <button
              onClick={() => handleTabChange('profile')}
              className="w-full flex items-center justify-between p-4 hover:bg-[#f8fafc] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center">
                  <User className="w-5 h-5 text-[#0966CC]" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-[#0f172a]">View Profile</p>
                  <p className="text-xs text-[#64748b]">View your profile information</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#cbd5e1]" />
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h3 className="text-sm text-[#64748b] mb-3 px-2">NOTIFICATIONS</h3>
          <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div>
                  <p className="text-sm text-[#0f172a]">Chart Notifications</p>
                  <p className="text-xs text-[#64748b]">Chart status updates</p>
                </div>
              </div>
              <Switch
                checked={chartNotifications}
                onCheckedChange={setChartNotifications}
                className="data-[state=checked]:bg-[#F59E0B]"
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center">
                  <Bell className="w-5 h-5 text-[#0966CC]" />
                </div>
                <div>
                  <p className="text-sm text-[#0f172a]">Assignment Alerts</p>
                  <p className="text-xs text-[#64748b]">New chart assignments</p>
                </div>
              </div>
              <Switch
                checked={assignmentAlerts}
                onCheckedChange={setAssignmentAlerts}
                className="data-[state=checked]:bg-[#F59E0B]"
              />
            </div>
          </div>
        </div>

        {/* Change Password Dialog */}
        <Dialog open={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter your current password and choose a new one.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative mt-2">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="h-12 rounded-xl border-2 border-[#e2e8f0] pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#0f172a]"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative mt-2">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="h-12 rounded-xl border-2 border-[#e2e8f0] pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#0f172a]"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-[#64748b] mt-1">Must be at least 8 characters</p>
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative mt-2">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="h-12 rounded-xl border-2 border-[#e2e8f0] pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#0f172a]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsChangePasswordDialogOpen(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
              >
                <Lock className="w-4 h-4 mr-2" />
                Change Password
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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-[#F59E0B]" />
            </div>
            <div>
              <div className="text-sm text-[#64748b]">Scheduler Portal</div>
              <div className="text-[#0f172a]">Jessica Martinez</div>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 py-4 px-3 overflow-y-auto">
          {renderSidebarNav()}
        </div>

        {/* Sidebar Footer - Logout */}
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-[#F59E0B]" />
                </div>
                <div>
                  <div className="text-sm text-[#64748b]">Scheduler Portal</div>
                  <div className="text-[#0f172a]">Jessica Martinez</div>
                </div>
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">
              Navigation menu for Scheduler Portal
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 py-4 px-3 overflow-y-auto">
            {renderSidebarNav()}
          </div>

          {/* Mobile Drawer Footer */}
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
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="md:hidden w-10 h-10 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] flex items-center justify-center transition-colors"
              >
                <Menu className="w-5 h-5 text-[#64748b]" />
              </button>

              <div>
                <h1 className="text-xl text-[#0f172a]">
                  {activeTab === 'charts' && 'Patient Charts'}
                  {activeTab === 'scan' && 'Scan Documents'}
                  {activeTab === 'documents' && 'Document Library'}
                  {activeTab === 'assign' && 'Assign Charts'}
                  {activeTab === 'profile' && 'My Profile'}
                  {activeTab === 'settings' && 'Settings'}
                </h1>
                <p className="text-sm text-[#64748b]">
                  {activeTab === 'charts' && 'Create and manage patient charts'}
                  {activeTab === 'scan' && 'Scan and upload documents'}
                  {activeTab === 'documents' && 'View and manage all documents'}
                  {activeTab === 'assign' && 'Assign charts to clinicians'}
                  {activeTab === 'profile' && 'View your profile information'}
                  {activeTab === 'settings' && 'Manage your account settings'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
                      'scheduler',
                      'patient_added',
                      '👤 New Patient Added',
                      'Michael Brown has been added to the system.',
                      'medium',
                      { patientId: '789', patientName: 'Michael Brown' },
                      '/scheduler/patients/789',
                      'View Patient'
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
                userRole="scheduler"
                onNavigate={(url) => {
                  if (url.includes('/charts')) {
                    setActiveTab('charts');
                  } else if (url.includes('/documents')) {
                    setActiveTab('documents');
                  }
                }}
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Cards - Show on charts tab */}
          {activeTab === 'charts' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-6">
                <div className="flex flex-col gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#F59E0B]" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl text-[#0f172a]">{stats.totalPatients}</p>
                    <p className="text-xs sm:text-sm text-[#64748b]">Total Patients</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-6">
                <div className="flex flex-col gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FEE2E2] flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[#DC2626]" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl text-[#0f172a]">{stats.unassignedCharts}</p>
                    <p className="text-xs sm:text-sm text-[#64748b]">Needs Assignment</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-6">
                <div className="flex flex-col gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E0F2FE] flex items-center justify-center">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#0966CC]" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl text-[#0f172a]">{stats.newDocsToday}</p>
                    <p className="text-xs sm:text-sm text-[#64748b]">New Docs Today</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 sm:p-6">
                <div className="flex flex-col gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#D1FAE5] flex items-center justify-center">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-[#10B981]" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl text-[#0f172a]">{charts.length}</p>
                    <p className="text-xs sm:text-sm text-[#64748b]">Total Charts</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'charts' && renderChartsTab()}
          {activeTab === 'scan' && renderScanTab()}
          {activeTab === 'documents' && <DocumentLibrary />}
          {activeTab === 'assign' && renderAssignTab()}
          {activeTab === 'profile' && <SchedulerProfile navigation={navigation} />}
          {activeTab === 'settings' && <SchedulerSettings navigation={navigation} onNavigateToProfile={() => handleTabChange('profile')} />}
        </main>
      </div>
      
      <Toaster position="top-right" />

      {/* Create Empty Chart Modal */}
      <Dialog open={isCreateChartModalOpen} onOpenChange={setIsCreateChartModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Empty Chart</DialogTitle>
            <DialogDescription>
              Create a new chart for a patient. Clinicians will add medications later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="patient-first-name">First Name *</Label>
              <Input
                id="patient-first-name"
                value={newChart.first_name}
                onChange={(e) => setNewChart({ ...newChart, first_name: e.target.value })}
                placeholder="John"
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0]"
              />
            </div>
            <div>
              <Label htmlFor="patient-last-name">Last Name *</Label>
              <Input
                id="patient-last-name"
                value={newChart.last_name}
                onChange={(e) => setNewChart({ ...newChart, last_name: e.target.value })}
                placeholder="Doe"
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0]"
              />
            </div>
            <div>
              <Label htmlFor="patient-dob">Date of Birth *</Label>
              <Input
                id="patient-dob"
                type="date"
                value={newChart.date_of_birth}
                onChange={(e) => setNewChart({ ...newChart, date_of_birth: e.target.value })}
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0]"
              />
            </div>
            <div>
              <Label htmlFor="patient-address">Address (Optional)</Label>
              <Input
                id="patient-address"
                value={newChart.address_line1}
                onChange={(e) => setNewChart({ ...newChart, address_line1: e.target.value })}
                placeholder="123 Main St"
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0]"
              />
            </div>
            <div>
              <Label htmlFor="patient-phone">Phone Number (Optional)</Label>
              <Input
                id="patient-phone"
                value={newChart.phone}
                onChange={(e) => setNewChart({ ...newChart, phone: e.target.value })}
                placeholder="555-1234"
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateChartModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateChart}
              className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Chart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Chart Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Chart to Clinician</DialogTitle>
            <DialogDescription>
              Select a clinician to assign this chart for medication review.
            </DialogDescription>
          </DialogHeader>
          {selectedChart && (
            <div className="space-y-4 py-4">
              <div className="bg-[#f8fafc] rounded-xl p-4">
                <p className="text-sm text-[#0f172a] mb-1">
                  <strong>Patient:</strong> {selectedChart.patientName}
                </p>
                <p className="text-sm text-[#0f172a]">
                  <strong>DOB:</strong> {new Date(selectedChart.patientDob).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div>
                <Label htmlFor="clinician">Select Clinician *</Label>
                <Select value={selectedClinician} onValueChange={setSelectedClinician}>
                  <SelectTrigger className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0]">
                    <SelectValue placeholder="Choose a clinician" />
                  </SelectTrigger>
                  <SelectContent>
                    {clinicians.map((clinician) => (
                      <SelectItem key={clinician.id} value={clinician.id}>
                        {clinician.first_name} {clinician.last_name} ({clinician.active_chart_count} charts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAssignModalOpen(false);
                setSelectedChart(null);
                setSelectedClinician('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignChart}
              className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Assign Chart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Patient Selection Modal for Document Upload */}
      <Dialog open={isPatientSelectionOpen} onOpenChange={setIsPatientSelectionOpen}>
        <DialogContent className="max-w-md max-h-[70vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Select Patient for Document</DialogTitle>
            <DialogDescription>
              {uploadMethod === 'camera' 
                ? 'Select which patient chart to attach the scanned document to' 
                : `Select which patient chart to attach ${pendingFiles.length} file(s) to`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 min-h-0">
            {uploading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 text-[#F59E0B] animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {charts.map((chart) => (
                  <button
                    key={chart.id}
                    onClick={() => handlePatientSelected(chart.id)}
                    className="w-full text-left p-4 rounded-xl border-2 border-[#e2e8f0] hover:border-[#F59E0B] hover:bg-[#FFFBEB] transition-all"
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
                
                {charts.length === 0 && (
                  <div className="text-center p-8 text-[#64748b]">
                    <p>No patient charts available.</p>
                    <p className="text-sm mt-2">Create a chart first to upload documents.</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="p-6 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsPatientSelectionOpen(false);
                setPendingFiles([]);
                setUploadMethod(null);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scanning Guide Modal */}
      <Dialog open={showScanGuideModal} onOpenChange={setShowScanGuideModal}>
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
              onClick={() => setShowScanGuideModal(false)}
              className="bg-[#0966CC] hover:bg-[#075497] text-white"
            >
              Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Camera */}
      {showDocumentCamera && (
        <DocumentCamera
          onCapture={handleCameraCapture}
          onCancel={() => {
            setShowDocumentCamera(false);
            setSelectedChartForScan(null);
          }}
        />
      )}
    </div>
  );
}
