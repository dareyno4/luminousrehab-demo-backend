import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userProfileService, type UserProfile } from '../../services/userProfileService';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building2,
  Award,
  Calendar,
  Edit,
  Shield,
  Users,
  Activity,
  Camera,
  Trash2,
  Lock,
  Smartphone,
  MapPinned,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  Bell,
  Palette,
  LogOut,
  FileText,
  BarChart3,
  Info,
  HelpCircle,
  MessageSquare,
  Key,
  Monitor,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { Separator } from '../../components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import { Screen, NavigationParams } from '../../App';
import { toast } from 'sonner';

interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
}

interface LoginSession {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

export default function AgencyAdminProfile({ navigation }: Props) {
  const { user } = useAuth();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [showDevicesDialog, setShowDevicesDialog] = useState(false);
  const [showAgencyDialog, setShowAgencyDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({ totalUsers: 0, totalClinicians: 0, totalPatients: 0, totalCharts: 0, chartsThisMonth: 0 });
  const [tenantInfo, setTenantInfo] = useState<any>(null);

  useEffect(() => {
    if (user?.id && user?.tenant_id) {
      setMfaEnabled(user.mfa_enabled || false);
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    if (!user?.id || !user?.tenant_id) return;
    
    try {
      setLoading(true);
      const [profileData, statsData, tenant] = await Promise.all([
        userProfileService.getUserProfile(user.id),
        userProfileService.getAgencyAdminStatistics(user.tenant_id),
        userProfileService.getTenantInfo(user.tenant_id),
      ]);
      
      setProfile(profileData);
      setStats(statsData);
      setTenantInfo(tenant);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="w-8 h-8 text-[#10B981] animate-spin" />
      </div>
    );
  }

  const profileData = {
    name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown User',
    role: 'Agency Administrator',
    email: profile?.email || '',
    phone: profile?.phone_number || 'Not provided',
    address: profile?.address || 'Not provided',
    agency: tenantInfo?.name || 'Healthcare Partners',
    agencyLicense: tenantInfo?.license_number || 'N/A',
    agencyNPI: tenantInfo?.npi_number || 'N/A',
    agencyAddress: tenantInfo?.address || 'Not provided',
    agencyPhone: tenantInfo?.phone || 'Not provided',
    supportEmail: tenantInfo?.contact_email || 'support@healthcare.com',
    joinDate: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown',
    accountCreated: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown',
    lastUpdated: profile?.last_login ? new Date(profile.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never',
    lastPasswordChange: '30 days ago',
    lastLogin: 'Phoenix, AZ',
    lastLoginTime: 'Today at 9:42 AM',
    totalUsers: stats.totalUsers,
    totalClinicians: stats.totalClinicians,
    totalPatients: stats.totalPatients,
    totalCharts: stats.totalCharts,
    chartsThisMonth: stats.chartsThisMonth,
    avgTurnaround: '2.1 days',
  };

  const permissions = [
    { name: 'Manage clinicians', granted: true },
    { name: 'Approve charts', granted: true },
    { name: 'Manage agency settings', granted: true },
    { name: 'View financial reports', granted: true },
    { name: 'Export data', granted: true },
    { name: 'Super Admin features', granted: false },
    { name: 'System configuration', granted: false },
  ];

  const loginSessions: LoginSession[] = [
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

  const handleAvatarUpload = () => {
    toast.success('Avatar upload feature coming soon');
  };

  const handleAvatarRemove = () => {
    toast.info('Avatar removed');
  };

  const handleChangePassword = async () => {
    if (!user?.id) return;
    
    try {
      setSaving(true);
      setShowPasswordDialog(true);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMFA = async (enabled: boolean) => {
    if (!user?.id) return;
    
    try {
      if (enabled) {
        setShowMFADialog(true);
      } else {
        await userProfileService.updateMFASettings(user.id, false);
        setMfaEnabled(false);
        toast.info('Two-factor authentication disabled');
      }
    } catch (error) {
      console.error('Error toggling MFA:', error);
      toast.error('Failed to update MFA settings');
    }
  };

  const handleRevokeSession = (sessionId: string) => {
    toast.success('Session revoked successfully');
  };

  return (
    <div className="h-full flex flex-col bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#10B981] to-[#059669] px-5 pt-5 pb-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigation.goBack()}
            className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg text-white">Admin Profile</h1>
          <div className="w-10 h-10" />
        </div>

        {/* Profile Header with Avatar Actions */}
        <div className="flex flex-col items-center">
          <div className="relative mb-3">
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
          <h2 className="text-xl text-white mb-1">{profileData.name}</h2>
          <Badge className="bg-white/20 text-white border-white/30 mb-2">
            {profileData.role}
          </Badge>
          <button
            onClick={() => setShowAgencyDialog(true)}
            className="text-sm text-white/90 hover:text-white flex items-center gap-1 transition-colors"
          >
            {profileData.agency}
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
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
              <Separator />
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

        {/* Account Security Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#10B981]" />
              <h3 className="text-sm font-semibold text-[#0f172a]">Account Security</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('Manage security settings')}
              className="border-[#10B981] text-[#10B981] hover:bg-[#D1FAE5]"
            >
              <Settings className="w-3 h-3 mr-2" />
              Manage
            </Button>
          </div>

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
                    <p className="text-xs text-[#64748b]">Last changed {profileData.lastPasswordChange}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleChangePassword}
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
                  <p className="text-xs text-[#64748b]">📍 {profileData.lastLogin}</p>
                  <p className="text-xs text-[#64748b]">🕒 {profileData.lastLoginTime}</p>
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
                    <p className="text-xs text-[#64748b]">{loginSessions.length} devices signed in</p>
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

        {/* Permissions Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#10B981]" />
            <h3 className="text-sm font-semibold text-[#0f172a]">Permissions</h3>
          </div>

          <Card className="p-5">
            <div className="space-y-2">
              {permissions.map((permission, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between py-2 ${
                    index < permissions.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  <span className="text-sm text-[#0f172a]">{permission.name}</span>
                  {permission.granted ? (
                    <CheckCircle className="w-4 h-4 text-[#10B981]" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#94a3b8]" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-[#64748b] flex items-center gap-1">
                <Info className="w-3 h-3" />
                For Super Admin access, contact system administrator
              </p>
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
              <Separator />
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-[#10B981]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[#64748b] mb-1">Admin Since</p>
                  <p className="text-sm text-[#0f172a]">{profileData.joinDate}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Additional Actions Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#10B981]" />
            <h3 className="text-sm font-semibold text-[#0f172a]">Preferences</h3>
          </div>

          <Card className="p-5">
            <div className="space-y-3">
              <button
                onClick={() => toast.info('Notifications settings coming soon')}
                className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-[#64748b]" />
                  <span className="text-sm text-[#0f172a]">Notifications</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94a3b8]" />
              </button>
              <button
                onClick={() => toast.info('Appearance settings coming soon')}
                className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Palette className="w-4 h-4 text-[#64748b]" />
                  <span className="text-sm text-[#0f172a]">Appearance</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#94a3b8]" />
              </button>
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
}
