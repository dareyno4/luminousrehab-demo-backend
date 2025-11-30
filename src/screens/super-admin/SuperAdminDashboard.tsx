import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, Plus, LogOut, Menu, User, Settings, AlertTriangle, Users, FileText, Activity, 
  Shield, Zap, MoreVertical, Search, Filter, CheckCircle2, Clock, Download, 
  Eye, Mail, X, ChevronRight, BarChart3, Database, Upload, CheckCircle, XCircle,
  Ban, PlayCircle, History, Key, RefreshCw, TrendingUp, AlertCircle
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
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
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Separator } from '../../components/ui/separator';
import { Card } from '../../components/ui/card';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';
import { Screen, NavigationParams } from '../../App';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAllTenants,
  createTenant,
  updateTenant,
  suspendTenant,
  unsuspendTenant,
  deleteTenant,
  updateFeatureFlags,
  uploadBAADocument,
  fetchBAADocuments,
  fetchAuditLogs,
  getSuperAdminStats,
  impersonateTenant,
  type BAADocument,
  type AuditLog,
} from '../../services/superAdminService';

interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
}

type TabType = 'tenants' | 'audit' | 'profile';

interface TenantData {
  id: string;
  name: string;
  subdomain: string;
  contact_email: string;
  contact_phone?: string;
  status: string;
  environment?: string;
  test_mode: boolean;
  baa_status?: string;
  baa_signed: boolean;
  baa_signer_name?: string;
  baa_renewal_date?: string;
  user_count?: number;
  patient_count?: number;
  chart_count?: number;
  feature_flags?: string[];
  created_at: string;
}

export default function SuperAdminDashboard({ navigation }: Props) {
  const { logout, user } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('tenants');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [environmentFilter, setEnvironmentFilter] = useState('all');
  
  // Real data state
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantData | null>(null);
  const [baaDocuments, setBAADocuments] = useState<BAADocument[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    suspendedTenants: 0,
    baaPending: 0,
    baaExpiring: 0,
    totalUsers: 0,
    totalPatients: 0,
    totalCharts: 0,
  });

  // Modals
  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [isBAADialogOpen, setIsBAADialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [isFeatureFlagsOpen, setIsFeatureFlagsOpen] = useState(false);
  const [isImpersonateOpen, setIsImpersonateOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isActivationDialogOpen, setIsActivationDialogOpen] = useState(false);
  const [activationInfo, setActivationInfo] = useState<{
    tenantName: string;
    subdomain: string;
    contactEmail: string;
    activationCode: string;
    activationLink: string;
  } | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    ein: '',
    contact_email: '',
    contact_phone: '',
    environment: 'test' as 'production' | 'test',
  });

  const [baaFile, setBAAFile] = useState<File | null>(null);
  const [baaSignedBy, setBAASignedBy] = useState('');
  const [baaExpiresAt, setBAAExpiresAt] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [impersonateReason, setImpersonateReason] = useState('');
  const [testMode, setTestMode] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tenantsData, statsData, auditData] = await Promise.all([
        fetchAllTenants(),
        getSuperAdminStats(),
        fetchAuditLogs({ limit: 100 }).catch(() => []), // Don't fail if audit logs unavailable
      ]);

      setTenants(tenantsData as TenantData[]);
      setStats(statsData);
      setAuditLogs(auditData);
    } catch (error) {
      console.error('Error loading super admin data:', error);
      toast.error('Failed to load some dashboard data. Check console for details.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter tenants
  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch = 
      tenant.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.subdomain?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.contact_email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
    const matchesEnvironment = environmentFilter === 'all' || tenant.environment === environmentFilter;
    
    return matchesSearch && matchesStatus && matchesEnvironment;
  });

  // Handlers
  const handleLogout = () => {
    logout();
    navigation.navigate('Landing');
  };

  const handleAddTenant = async () => {
    if (!formData.name || !formData.subdomain || !formData.contact_email) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      await createTenant(formData);
      toast.success('Tenant created successfully');
      setIsAddTenantOpen(false);
      setFormData({
        name: '',
        subdomain: '',
        ein: '',
        contact_email: '',
        contact_phone: '',
        environment: 'test',
      });
      loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create tenant');
    }
  };

  const handleUploadBAA = async () => {
    if (!baaFile || !baaSignedBy || !baaExpiresAt || !selectedTenant) {
      toast.error('Please fill in all BAA fields');
      return;
    }

    try {
      const result = await uploadBAADocument(selectedTenant.id, baaFile, baaSignedBy, baaExpiresAt);
      toast.success('BAA document uploaded successfully');
      setIsBAADialogOpen(false);
      setBAAFile(null);
      setBAASignedBy('');
      setBAAExpiresAt('');
      
      // Show activation dialog if activation info is returned
      if (result.activationInfo) {
        setActivationInfo(result.activationInfo);
        setIsActivationDialogOpen(true);
      }
      
      loadData();
    } catch (error) {
      console.error('BAA upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload BAA document';
      toast.error(`Failed to upload BAA: ${errorMessage}`);
    }
  };

  const handleViewBAA = async (tenant: TenantData) => {
    try {
      const docs = await fetchBAADocuments(tenant.id);
      setBAADocuments(docs);
      setSelectedTenant(tenant);
      setBAASignedBy(tenant.baa_signer_name || '');
      setIsBAADialogOpen(true);
    } catch (error) {
      toast.error('Failed to load BAA documents');
    }
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim() || !selectedTenant) {
      toast.error('Please provide a reason for suspension');
      return;
    }
    
    try {
      await suspendTenant(selectedTenant.id, suspendReason);
      toast.success(`${selectedTenant.name} has been suspended`);
      setIsSuspendDialogOpen(false);
      setSuspendReason('');
      setSelectedTenant(null);
      loadData();
    } catch (error) {
      toast.error('Failed to suspend tenant');
    }
  };

  const handleUnsuspend = async (tenant: TenantData) => {
    try {
      await unsuspendTenant(tenant.id);
      toast.success('Tenant has been reactivated');
      loadData();
    } catch (error) {
      toast.error('Failed to reactivate tenant');
    }
  };

  const handleUpdateTestMode = async () => {
    if (!selectedTenant) return;
    
    try {
      await updateTenant(selectedTenant.id, { test_mode: testMode });
      toast.success('Test mode updated');
      setIsFeatureFlagsOpen(false);
      setSelectedTenant(null);
      loadData();
    } catch (error) {
      toast.error('Failed to update test mode');
    }
  };

  const handleImpersonate = async () => {
    if (!impersonateReason.trim() || !selectedTenant) {
      toast.error('Please provide a reason for impersonation');
      return;
    }
    
    try {
      await impersonateTenant(selectedTenant.id, impersonateReason);
      toast.success(`Impersonating ${selectedTenant.name} - logged to audit`);
      setIsImpersonateOpen(false);
      setImpersonateReason('');
      setSelectedTenant(null);
      loadData();
    } catch (error) {
      toast.error('Failed to start impersonation');
    }
  };

  const handleDelete = async () => {
    if (!selectedTenant) return;
    
    if (deleteConfirmText !== selectedTenant.name) {
      toast.error(`Please type "${selectedTenant.name}" to confirm deletion`);
      return;
    }
    
    try {
      await deleteTenant(selectedTenant.id);
      toast.success(`${selectedTenant.name} has been permanently deleted`);
      setIsDeleteDialogOpen(false);
      setDeleteConfirmText('');
      setSelectedTenant(null);
      loadData();
    } catch (error) {
      toast.error('Failed to delete tenant');
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ['Name', 'Subdomain', 'Status', 'Environment', 'BAA Status', 'Users', 'Patients', 'Charts', 'Created'],
      ...filteredTenants.map(t => [
        t.name,
        t.subdomain,
        t.status,
        t.environment,
        t.baa_status,
        t.user_count || 0,
        t.patient_count || 0,
        t.chart_count || 0,
        new Date(t.created_at).toLocaleDateString(),
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenants-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Exporting to CSV...');
  };

  // Helper functions
  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; label: string }> = {
      active: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Active' },
      inactive: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Inactive' },
      suspended: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Suspended' },
      trial: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Trial' },
    };
    const config = configs[status] || configs.inactive;
    return (
      <Badge className={`${config.color} border`}>{config.label}</Badge>
    );
  };

  const getEnvironmentBadge = (testMode: boolean) => {
    if (testMode) {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200 border">
          <span className="mr-1">🧪</span>
          Test
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200 border">
        <span className="mr-1">🏥</span>
        Production
      </Badge>
    );
  };

  const getBAABadge = (status: string) => {
    const configs: Record<string, { color: string; label: string; icon: any }> = {
      signed: { color: 'bg-green-100 text-green-800 border-green-200', label: 'BAA Signed', icon: CheckCircle },
      not_signed: { color: 'bg-red-100 text-red-800 border-red-200', label: 'BAA Missing', icon: XCircle },
      expiring_soon: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'BAA Expiring', icon: Clock },
    };
    const config = configs[status] || configs.not_signed;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-[#0966CC] animate-spin mx-auto mb-2" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-white">
      <Toaster />
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Super Admin</h1>
              <p className="text-sm text-slate-600">Platform Management & Oversight</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg">
                  <Avatar className="w-8 h-8 bg-gradient-to-br from-[#0966CC] to-[#0C4A6E]">
                    <AvatarFallback className="text-white text-sm">
                      {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium text-slate-900">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-xs text-slate-500">Super Admin</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab('profile')}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('audit')}>
                  <History className="w-4 h-4 mr-2" />
                  Audit Logs
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'tenants'
                ? 'border-[#0966CC] text-[#0966CC]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            Tenants ({stats.totalTenants})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'audit'
                ? 'border-[#0966CC] text-[#0966CC]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'border-[#0966CC] text-[#0966CC]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Profile
          </button>
        </div>
      </div>

      {/* Main Content - Part 1 */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'tenants' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 border-l-4 border-l-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Active Tenants</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.activeTenants}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-green-500" />
                </div>
              </Card>
              
              <Card className="p-4 border-l-4 border-l-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Missing BAA</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.baaPending}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </Card>
              
              <Card className="p-4 border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Users</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </Card>
              
              <Card className="p-4 border-l-4 border-l-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Charts</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalCharts}</p>
                  </div>
                  <FileText className="w-8 h-8 text-purple-500" />
                </div>
              </Card>
            </div>

            {/* Compliance Alert */}
            {(stats.baaPending > 0 || stats.baaExpiring > 0) && (
              <Card className="p-4 bg-red-50 border-red-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-red-900">Compliance Risks Detected</p>
                    <p className="text-sm text-red-700 mt-1">
                      {stats.baaPending > 0 && `${stats.baaPending} tenant${stats.baaPending !== 1 ? 's' : ''} missing BAA. `}
                      {stats.baaExpiring > 0 && `${stats.baaExpiring} BAA${stats.baaExpiring !== 1 ? 's' : ''} expiring soon.`}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Filters and Actions */}
            <Card className="p-4">
              <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <div className="flex-1 flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search tenants..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Environment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Environments</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsAddTenantOpen(true)}
                    className="flex items-center gap-2 bg-[#0966CC] hover:bg-[#0C4A6E]"
                  >
                    <Plus className="w-4 h-4" />
                    Add Tenant
                  </Button>
                </div>
              </div>
            </Card>

            {/* Tenants Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Tenant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Environment</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">BAA</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Users</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Patients</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Charts</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                          No tenants found
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map((tenant) => (
                        <tr key={tenant.id} className="hover:bg-slate-50">
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-medium text-slate-900">{tenant.name}</p>
                              <p className="text-sm text-slate-500">{tenant.subdomain}</p>
                              <p className="text-xs text-slate-400">{tenant.contact_email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {getStatusBadge(tenant.status)}
                          </td>
                          <td className="px-4 py-4">
                            {getEnvironmentBadge(tenant.test_mode)}
                          </td>
                          <td className="px-4 py-4">
                            {getBAABadge(tenant.baa_status || 'not_signed')}
                          </td>
                          <td className="px-4 py-4 text-slate-900">
                            {tenant.user_count || 0}
                          </td>
                          <td className="px-4 py-4 text-slate-900">
                            {tenant.patient_count || 0}
                          </td>
                          <td className="px-4 py-4 text-slate-900">
                            {tenant.chart_count || 0}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewBAA(tenant)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View/Upload BAA
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedTenant(tenant);
                                    setTestMode(tenant.test_mode);
                                    setIsFeatureFlagsOpen(true);
                                  }}
                                >
                                  <Settings className="w-4 h-4 mr-2" />
                                  Test Mode
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedTenant(tenant);
                                    setIsImpersonateOpen(true);
                                  }}
                                >
                                  <Key className="w-4 h-4 mr-2" />
                                  Impersonate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {tenant.status === 'suspended' ? (
                                  <DropdownMenuItem 
                                    onClick={() => handleUnsuspend(tenant)}
                                    className="text-green-600"
                                  >
                                    <PlayCircle className="w-4 h-4 mr-2" />
                                    Reactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedTenant(tenant);
                                      setIsSuspendDialogOpen(true);
                                    }}
                                    className="text-red-600"
                                  >
                                    <Ban className="w-4 h-4 mr-2" />
                                    Suspend
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedTenant(tenant);
                                    setDeleteConfirmText('');
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="text-red-600"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Delete Permanently
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent Audit Logs
              </h3>
              <div className="space-y-3">
                {auditLogs.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No audit logs found</p>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <Activity className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900">{log.user_name}</span>
                          <span className="text-slate-600">{log.action}</span>
                          <Badge variant="outline" className="text-xs">
                            {log.entity_type}
                          </Badge>
                          {log.tenant_name && (
                            <Badge variant="outline" className="text-xs bg-blue-50">
                              {log.tenant_name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {log.changes && typeof log.changes === 'object' ? JSON.stringify(log.changes) : ''}
                          {log.metadata && typeof log.metadata === 'object' ? JSON.stringify(log.metadata) : ''}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Profile Information</h3>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <p className="mt-1 text-slate-900">{user?.first_name} {user?.last_name}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="mt-1 text-slate-900">{user?.email}</p>
                </div>
                <div>
                  <Label>Role</Label>
                  <Badge className="mt-1 bg-purple-100 text-purple-800 border-purple-200">
                    Super Admin
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Dialogs Section - Add Tenant Dialog */}
      <Dialog open={isAddTenantOpen} onOpenChange={setIsAddTenantOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Tenant</DialogTitle>
            <DialogDescription>
              Create a new tenant organization for the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Acme Home Health"
              />
            </div>
            <div>
              <Label htmlFor="subdomain">Subdomain *</Label>
              <Input
                id="subdomain"
                value={formData.subdomain}
                onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                placeholder="acme"
              />
              <p className="text-xs text-slate-500 mt-1">{formData.subdomain || 'subdomain'}.app</p>
            </div>
            <div>
              <Label htmlFor="ein">EIN</Label>
              <Input
                id="ein"
                value={formData.ein}
                onChange={(e) => setFormData({ ...formData, ein: e.target.value })}
                placeholder="12-3456789"
              />
            </div>
            <div>
              <Label htmlFor="email">Contact Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="admin@acme.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Contact Phone</Label>
              <Input
                id="phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="environment">Environment</Label>
              <Select 
                value={formData.environment} 
                onValueChange={(value: any) => setFormData({ ...formData, environment: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTenantOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTenant} className="bg-[#0966CC] hover:bg-[#0C4A6E]">
              Create Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BAA Dialog */}
      <Dialog open={isBAADialogOpen} onOpenChange={setIsBAADialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>BAA Documents - {selectedTenant?.name}</DialogTitle>
            <DialogDescription>
              View and manage Business Associate Agreement documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {baaDocuments.length > 0 && (
              <div>
                <Label className="mb-2 block">Existing BAA Documents</Label>
                <div className="space-y-2">
                  {baaDocuments.map((doc) => (
                    <div key={doc.id} className="p-3 border rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Signed by {doc.signed_by}</p>
                        <p className="text-xs text-slate-500">
                          Signed: {new Date(doc.signed_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          Expires: {new Date(doc.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={doc.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {doc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Separator />
            
            <div>
              <Label className="mb-2 block">Upload New BAA</Label>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="baa-file">BAA Document (PDF) *</Label>
                  <Input
                    id="baa-file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setBAAFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <Label htmlFor="signed-by">Signed By *</Label>
                  <Input
                    id="signed-by"
                    value={baaSignedBy}
                    onChange={(e) => setBAASignedBy(e.target.value)}
                    placeholder="John Doe, CEO"
                  />
                </div>
                <div>
                  <Label htmlFor="expires-at">Expiration Date *</Label>
                  <Input
                    id="expires-at"
                    type="date"
                    value={baaExpiresAt}
                    onChange={(e) => setBAAExpiresAt(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBAADialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleUploadBAA} className="bg-[#0966CC] hover:bg-[#0C4A6E]">
              <Upload className="w-4 h-4 mr-2" />
              Upload BAA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Mode Dialog */}
      <Dialog open={isFeatureFlagsOpen} onOpenChange={setIsFeatureFlagsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Mode - {selectedTenant?.name}</DialogTitle>
            <DialogDescription>
              Enable test mode for this tenant. Test mode tenants have restricted access.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="test-mode"
                checked={testMode}
                onCheckedChange={setTestMode}
              />
              <label
                htmlFor="test-mode"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Enable Test Mode
              </label>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              Test mode prevents this tenant from accessing production features and data.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFeatureFlagsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTestMode} className="bg-[#0966CC] hover:bg-[#0C4A6E]">
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Tenant</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend {selectedTenant?.name}? This will prevent all users from accessing the system.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="suspend-reason">Reason for Suspension *</Label>
            <Textarea
              id="suspend-reason"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Payment failure, policy violation, etc."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSuspend} className="bg-red-600 hover:bg-red-700">
              Suspend Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Impersonate Dialog */}
      <Dialog open={isImpersonateOpen} onOpenChange={setIsImpersonateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Impersonate Tenant</DialogTitle>
            <DialogDescription>
              This action will be logged in the audit trail. Provide a reason for this support action.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="impersonate-reason">Reason for Impersonation *</Label>
            <Textarea
              id="impersonate-reason"
              value={impersonateReason}
              onChange={(e) => setImpersonateReason(e.target.value)}
              placeholder="Support ticket #12345, investigating bug, etc."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImpersonateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImpersonate} className="bg-[#0966CC] hover:bg-[#0C4A6E]">
              Start Impersonation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tenant Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Tenant Permanently</DialogTitle>
            <DialogDescription>
              This action CANNOT be undone. This will permanently delete {selectedTenant?.name} and ALL associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All users</li>
                <li>All patients</li>
                <li>All charts and medications</li>
                <li>All documents and exports</li>
                <li>All audit logs</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="delete-confirm">Type tenant name to confirm: <span className="font-bold">{selectedTenant?.name}</span></Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={selectedTenant?.name}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteDialogOpen(false);
              setDeleteConfirmText('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleDelete} 
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteConfirmText !== selectedTenant?.name}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activation Dialog */}
      <Dialog open={isActivationDialogOpen} onOpenChange={setIsActivationDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-green-600">Tenant Activated Successfully!</DialogTitle>
            <DialogDescription>
              The BAA has been uploaded and the tenant is now active. Share the following activation details with the tenant administrator.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">📧 Email Activation Details To:</h3>
              <p className="text-green-800">{activationInfo?.contactEmail}</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold text-slate-700">Organization Name</Label>
                <div className="mt-1 p-3 bg-slate-50 rounded-lg border">
                  <p className="text-slate-900">{activationInfo?.tenantName}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-slate-700">Subdomain</Label>
                <div className="mt-1 p-3 bg-slate-50 rounded-lg border">
                  <p className="text-slate-900 font-mono">{activationInfo?.subdomain}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-slate-700">Activation Code</Label>
                <div className="mt-1 p-3 bg-slate-50 rounded-lg border flex items-center justify-between">
                  <p className="text-slate-900 font-mono text-lg font-bold">{activationInfo?.activationCode}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(activationInfo?.activationCode || '');
                      toast.success('Code copied to clipboard');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-slate-700">Activation Link</Label>
                <div className="mt-1 p-3 bg-slate-50 rounded-lg border">
                  <p className="text-slate-900 font-mono text-sm break-all">{activationInfo?.activationLink}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(activationInfo?.activationLink || '');
                    toast.success('Link copied to clipboard');
                  }}
                >
                  Copy Link
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Next Steps:</strong> Send this activation link and code to the tenant administrator. 
                They will use it to create their admin account and access the system.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsActivationDialogOpen(false)} className="bg-[#0966CC] hover:bg-[#0C4A6E]">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle>Super Admin</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            <button
              onClick={() => { setActiveTab('tenants'); setIsDrawerOpen(false); }}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-100"
            >
              <Building2 className="w-4 h-4 inline mr-2" />
              Tenants
            </button>
            <button
              onClick={() => { setActiveTab('audit'); setIsDrawerOpen(false); }}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-100"
            >
              <History className="w-4 h-4 inline mr-2" />
              Audit Logs
            </button>
            <button
              onClick={() => { setActiveTab('profile'); setIsDrawerOpen(false); }}
              className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-100"
            >
              <User className="w-4 h-4 inline mr-2" />
              Profile
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
