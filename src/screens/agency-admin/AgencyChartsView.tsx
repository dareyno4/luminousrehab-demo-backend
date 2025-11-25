import React, { useState } from 'react';
import {
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
  Calendar,
  Filter,
  Download,
  Lock,
  MoreVertical,
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
  CheckCircle2,
  ArrowLeft,
  TrendingUp,
  Zap,
  Activity,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
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
import { Textarea } from '../../components/ui/textarea';
import { Screen, NavigationParams } from '../../App';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import { motion, AnimatePresence } from 'motion/react';
import { approveChart } from '../../services/agencyAdminService';

interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
}

interface Chart {
  id: string;
  patientName: string;
  patientDob: string;
  status: 'Active' | 'Verified' | 'Delivered' | 'Pending Review';
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
}

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
    createdDate: '2025-01-16',
    createdBy: 'Anna Clinician',
    daysOld: 1,
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
    createdBy: 'Bob Clinician',
    finalizedDate: '2025-01-11',
    lowestConfidence: 88,
    verifiedBy: 'Bob Clinician',
    reviewedBy: 'Admin User',
    deliveryTimestamp: '2025-01-11T14:30:00',
    daysOld: 7,
    hasLowConfidence: false,
  },
];

export default function AgencyChartsView({ navigation }: Props) {
  const { logout, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');
  const [approvingChartId, setApprovingChartId] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigation.navigate('Landing');
  };

  const handleViewChart = (chartId: string, patientName: string) => {
    toast.success(`Opening chart for ${patientName}`);
    navigation.navigate('ChartDetailView', { chartId, patientName });
  };

  const handleApproveChart = async (chartId: string) => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setApprovingChartId(chartId);
      await approveChart(chartId, user.id);
      toast.success('Chart approved and locked successfully');
      // Optionally refresh the charts list or update local state
    } catch (error: any) {
      console.error('Error approving chart:', error);
      toast.error(error.message || 'Failed to approve chart');
    } finally {
      setApprovingChartId(null);
    }
  };

  const handleReturnChart = () => {
    if (!returnNotes.trim()) {
      toast.error('Please provide notes for returning the chart');
      return;
    }
    toast.success('Chart returned to clinician with notes');
    setIsReturnModalOpen(false);
    setReturnNotes('');
  };

  const handleDownloadPDF = (chartId: string) => {
    toast.info('Downloading chart PDF...');
  };

  const handleViewAuditLog = (chartId: string) => {
    toast.info('Opening audit trail...');
  };

  const handleReopenChart = (chartId: string) => {
    toast.warning('Chart reopened - status changed to Active');
  };

  // Filter charts based on search and status
  const filteredCharts = mockCharts.filter((chart) => {
    const matchesSearch = 
      chart.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chart.patientDob.includes(searchQuery) ||
      chart.createdBy.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'needs-review' && (chart.status === 'Verified' || chart.status === 'Pending Review')) ||
      chart.status.toLowerCase().replace(' ', '-') === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: mockCharts.length,
    needsReview: mockCharts.filter(c => c.status === 'Verified' || c.status === 'Pending Review').length,
    active: mockCharts.filter(c => c.status === 'Active').length,
    delivered: mockCharts.filter(c => c.status === 'Delivered').length,
  };

  const getStatusBadge = (status: Chart['status']) => {
    const statusConfig = {
      'Active': { 
        color: 'bg-[#0EA5E9] text-white border-[#0EA5E9]', 
        icon: <Activity className="w-3 h-3" />
      },
      'Verified': { 
        color: 'bg-[#8B5CF6] text-white border-[#8B5CF6]', 
        icon: <CheckCircle2 className="w-3 h-3" />
      },
      'Pending Review': { 
        color: 'bg-[#F59E0B] text-white border-[#F59E0B]', 
        icon: <Hourglass className="w-3 h-3" />
      },
      'Delivered': { 
        color: 'bg-[#10B981] text-white border-[#10B981]', 
        icon: <Lock className="w-3 h-3" />
      },
    };

    const config = statusConfig[status];
    return (
      <Badge variant="outline" className={`${config.color} flex items-center gap-1 text-xs`}>
        {config.icon}
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <Toaster />

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[#10B981] to-[#059669] p-5 shadow-lg sticky top-0 z-40"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigation.goBack()}
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-white text-xl font-semibold">All Charts</h1>
              <p className="text-white/80 text-sm">{filteredCharts.length} chart{filteredCharts.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowProfileSheet(true)}
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 text-white"
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient, DOB, or clinician..."
              className="pl-10 h-12 rounded-xl border-2 border-white/20 bg-white/95 text-slate-900 placeholder:text-slate-500"
            />
          </div>
          <Button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            variant="outline"
            className="h-12 px-4 rounded-xl border-2 border-white/20 bg-white/95 hover:bg-white text-slate-700"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </motion.div>

      {/* Status Filter Chips */}
      <div className="bg-white border-b border-slate-200 px-5 py-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Charts ({statusCounts.all})
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setStatusFilter('needs-review')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              statusFilter === 'needs-review'
                ? 'bg-[#f50b0b] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <AlertCircle className="w-4 h-4 inline mr-1" />
            Needs Review ({statusCounts.needsReview})
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              statusFilter === 'active'
                ? 'bg-[#0EA5E9] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Active ({statusCounts.active})
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setStatusFilter('delivered')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              statusFilter === 'delivered'
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Lock className="w-4 h-4 inline mr-1" />
            Delivered ({statusCounts.delivered})
          </motion.button>
        </div>
      </div>

      {/* Charts List */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-4xl mx-auto space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredCharts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-2xl border border-slate-200 p-12 text-center"
              >
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-slate-900 font-semibold mb-2">No charts found</h3>
                <p className="text-slate-600">Try adjusting your search or filters</p>
              </motion.div>
            ) : (
              filteredCharts.map((chart, index) => (
                <motion.div
                  key={chart.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all ${
                    chart.hasLowConfidence || (chart.daysOld && chart.daysOld > 2) 
                      ? 'border-2 border-[#DC2626]/20' 
                      : 'border border-slate-200'
                  }`}
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(chart.status)}
                          {chart.daysOld && chart.daysOld > 2 && (
                            <Badge
                              variant="outline"
                              className="text-xs border-[#DC2626] text-[#DC2626]"
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              {chart.daysOld} day{chart.daysOld !== 1 ? 's' : ''} old
                            </Badge>
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
                        <h3 className="text-slate-900 font-semibold text-lg">{chart.patientName}</h3>
                        <p className="text-sm text-slate-600">
                          DOB: {new Date(chart.patientDob).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>

                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-slate-100"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
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
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-3">
                      <span className="font-medium">{chart.type}</span>
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

                    {/* Compressed Metadata with Tooltip */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="inline-flex text-xs text-slate-500 mb-3 cursor-help">
                          <span>
                            {new Date(chart.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {' · '}
                            <span className="font-semibold text-slate-900">{chart.createdBy}</span>
                            {chart.finalizedDate && ' · Finalized'}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-semibold text-slate-400">Created</p>
                              <p>{new Date(chart.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-400">Clinician</p>
                              <p className="font-semibold">{chart.createdBy}</p>
                            </div>
                            {chart.finalizedDate && (
                              <div>
                                <p className="text-xs font-semibold text-slate-400">Finalized</p>
                                <p>{new Date(chart.finalizedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Audit Context */}
                    {(chart.verifiedBy || chart.reviewedBy || chart.deliveryTimestamp) && (
                      <motion.div 
                        initial={{ opacity: 0.7 }}
                        whileHover={{ opacity: 1 }}
                        className="bg-slate-50 rounded-lg p-3 space-y-1 text-xs transition-opacity"
                      >
                        {chart.verifiedBy && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                            <span>Verified by: <span className="text-slate-900 font-medium">{chart.verifiedBy}</span></span>
                          </div>
                        )}
                        {chart.reviewedBy && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Eye className="w-3 h-3 text-[#0966CC]" />
                            <span>Admin Reviewed: <span className="text-slate-900 font-medium">{chart.reviewedBy}</span></span>
                          </div>
                        )}
                        {chart.deliveryTimestamp && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <CheckCircle className="w-3 h-3 text-[#4F46E5]" />
                            <span>Delivery: <span className="text-slate-900 font-medium">
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
                          className="text-[#10B981] hover:text-[#059669] flex items-center gap-1 font-medium mt-1 transition-colors"
                        >
                          <History className="w-3 h-3" />
                          View Audit Trail
                        </button>
                      </motion.div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {(chart.status === 'Verified' || chart.status === 'Pending Review') && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleViewChart(chart.id, chart.patientName)}
                            className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Review Chart
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveChart(chart.id)}
                            disabled={approvingChartId === chart.id}
                            className="border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10 rounded-xl"
                          >
                            {approvingChartId === chart.id ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Approving...
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-2" />
                                Approve & Lock
                              </>
                            )}
                          </Button>
                        </>
                      )}
                      {chart.status === 'Active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewChart(chart.id, chart.patientName)}
                          className="rounded-xl"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      )}
                      {chart.status === 'Delivered' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(chart.id)}
                          className="rounded-xl"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Profile Sheet */}
      <Sheet open={showProfileSheet} onOpenChange={setShowProfileSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Admin Profile</SheetTitle>
          </SheetHeader>
          <div className="py-6 space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 bg-gradient-to-br from-[#10B981] to-[#059669]">
                <AvatarFallback className="text-white text-xl">JJ</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-slate-900">John Jones</h3>
                <p className="text-sm text-slate-600">Agency Admin</p>
                <Badge variant="outline" className="mt-1 text-xs">Healthcare Plus Agency</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start h-12 rounded-xl"
                onClick={() => {
                  setShowProfileSheet(false);
                  navigation.navigate('AgencyAdminProfile');
                }}
              >
                <User className="w-5 h-5 mr-3" />
                View Profile
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-12 rounded-xl"
                onClick={() => {
                  setShowProfileSheet(false);
                  navigation.navigate('AgencyAdminSettings');
                }}
              >
                <SettingsIcon className="w-5 h-5 mr-3" />
                Settings
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-12 rounded-xl text-[#DC2626] border-[#DC2626]/20 hover:bg-[#DC2626]/10"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Return Modal */}
      <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return Chart for Edits</DialogTitle>
            <DialogDescription>
              Provide notes for the clinician about what needs to be corrected
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="Enter your notes here..."
              className="min-h-32 rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReturnModalOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReturnChart}
              className="bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return Chart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
