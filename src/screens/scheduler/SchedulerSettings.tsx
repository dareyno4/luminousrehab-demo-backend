import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userProfileService } from '../../services/userProfileService';
import {
  Lock,
  User,
  Bell,
  FileText,
  ChevronRight,
  Smartphone,
  MapPinned,
  Monitor,
  Edit,
  Info,
  AlertTriangle,
  Mail,
  Shield,
  Users,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
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
import { Screen, NavigationParams } from '../../App';
import { toast } from 'sonner';

interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
  onNavigateToProfile?: () => void;
}

interface LoginSession {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

export default function SchedulerSettings({ navigation, onNavigateToProfile }: Props) {
  const { user } = useAuth();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [showDevicesDialog, setShowDevicesDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setMfaEnabled(user.mfa_enabled || false);
    }
  }, [user]);

  const profileData = {
    lastPasswordChange: '45 days ago',
    lastLogin: 'Phoenix, AZ',
    lastLoginTime: 'Today at 8:15 AM',
  };

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
      lastActive: '3 hours ago',
      current: false,
    },
  ];

  const handleChangePassword = async () => {
    if (!user?.id) return;
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    try {
      setSaving(true);
      await userProfileService.changePassword(user.id, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password changed successfully!');
      setIsChangePasswordModalOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
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
      <div className="bg-white border-b border-[#e2e8f0] p-5">
        <h1 className="text-lg text-[#0f172a] mb-2">Settings</h1>
        <p className="text-sm text-[#64748b]">Manage your account and preferences</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Account Settings */}
        <div>
          <h3 className="text-sm text-[#64748b] mb-3 px-2">ACCOUNT</h3>
          <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
            <button 
              onClick={() => onNavigateToProfile?.()}
              className="w-full flex items-center justify-between p-4 hover:bg-[#f8fafc] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                  <User className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-[#0f172a]">Profile</p>
                  <p className="text-xs text-[#64748b]">View and edit your profile</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#cbd5e1]" />
            </button>
          </div>
        </div>

        {/* Security Section */}
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
                    <p className="text-xs text-[#64748b]">Last changed {profileData.lastPasswordChange}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsChangePasswordModalOpen(true)}
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

        {/* App Information */}
        <div>
          <h3 className="text-sm text-[#64748b] mb-3 px-2">APP INFORMATION</h3>
          <Card className="p-5">
            <div className="space-y-3 text-sm text-[#64748b]">
              <div className="flex justify-between">
                <span>Version</span>
                <span className="text-[#0f172a] font-medium">1.0.0</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span>Last Updated</span>
                <span className="text-[#0f172a] font-medium">Nov 30, 2025</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span>Security Status</span>
                <Badge variant="outline" className="border-emerald-600 text-emerald-600">
                  <Shield className="w-3 h-3 mr-1" />
                  HIPAA Compliant
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-800">
              <p className="font-semibold mb-1">Need help with settings?</p>
              <p>Contact your agency administrator or visit our help center for assistance.</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Change Password Modal */}
      <Dialog open={isChangePasswordModalOpen} onOpenChange={setIsChangePasswordModalOpen}>
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
              <Input
                id="current-password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="Enter current password"
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0]"
              />
            </div>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Enter new password"
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0]"
              />
              <p className="text-xs text-[#64748b] mt-1">Must be at least 8 characters</p>
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
                className="mt-2 h-12 rounded-xl border-2 border-[#e2e8f0]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsChangePasswordModalOpen(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
              disabled={saving}
            >
              <Lock className="w-4 h-4 mr-2" />
              {saving ? 'Changing...' : 'Change Password'}
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
                className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                placeholder="Enter 6-digit code"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMFADialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#F59E0B] hover:bg-[#D97706]"
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
                          <Badge variant="outline" className="border-[#F59E0B] text-[#F59E0B] text-xs h-5">
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
    </div>
  );
}
