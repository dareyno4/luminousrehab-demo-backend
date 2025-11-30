import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userProfileService } from '../../services/userProfileService';
import {
  ArrowLeft,
  Bell,
  Lock,
  Smartphone,
  Shield,
  FileText,
  ChevronRight,
  User,
  MapPinned,
  Monitor,
  AlertTriangle,
  Users,
  ClipboardList,
  ScanLine,
  Mail,
} from 'lucide-react';
import { Screen, NavigationParams } from '../../App';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { Separator } from '../../components/ui/separator';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { toast } from 'sonner';

interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
}

export default function ClinicianSettings({ navigation }: Props) {
  const { user } = useAuth();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
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
    lastPasswordChange: '30 days ago',
    lastLogin: 'Phoenix, AZ',
    lastLoginTime: user?.last_login ? new Date(user.last_login).toLocaleString() : 'Never',
  };

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
      setShowPasswordDialog(false);
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
      <div className="bg-gradient-to-r from-[#0966CC] to-[#0C4A6E] p-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigation.goBack()}
            className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg text-white">Settings</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Account Settings */}
        <div>
          <h3 className="text-sm text-[#64748b] mb-3 px-2">ACCOUNT</h3>
          <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
            <button 
              onClick={() => navigation.navigate('ClinicianProfile')}
              className="w-full flex items-center justify-between p-4 hover:bg-[#f8fafc] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center">
                  <User className="w-5 h-5 text-[#0966CC]" />
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

        {/* Quick Actions Section */}
        <div>
          <h3 className="text-sm text-[#64748b] mb-3 px-2">QUICK ACTIONS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={() => navigation.navigate('ClinicianDashboard')}
              variant="outline"
              className="h-auto p-4 flex items-center justify-start gap-3 hover:border-[#0966CC] hover:bg-[#E0F2FE] transition-colors"
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#E0F2FE' }}
              >
                <Users className="w-5 h-5" style={{ color: '#0966CC' }} />
              </div>
              <span className="text-sm text-[#0f172a]">My Patients</span>
              <ChevronRight className="w-4 h-4 text-[#cbd5e1] ml-auto" />
            </Button>

            <Button
              onClick={() => navigation.navigate('NewPatientChart')}
              variant="outline"
              className="h-auto p-4 flex items-center justify-start gap-3 hover:border-[#10B981] hover:bg-[#D1FAE5] transition-colors"
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#D1FAE5' }}
              >
                <ClipboardList className="w-5 h-5" style={{ color: '#10B981' }} />
              </div>
              <span className="text-sm text-[#0f172a]">Start New Chart</span>
              <ChevronRight className="w-4 h-4 text-[#cbd5e1] ml-auto" />
            </Button>

            <Button
              onClick={() => navigation.navigate('PatientChartList')}
              variant="outline"
              className="h-auto p-4 flex items-center justify-start gap-3 hover:border-[#F59E0B] hover:bg-[#FEF3C7] transition-colors"
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#FEF3C7' }}
              >
                <FileText className="w-5 h-5" style={{ color: '#F59E0B' }} />
              </div>
              <span className="text-sm text-[#0f172a]">View All Charts</span>
              <ChevronRight className="w-4 h-4 text-[#cbd5e1] ml-auto" />
            </Button>

            <Button
              onClick={() => navigation.navigate('CaptureSourceSelection')}
              variant="outline"
              className="h-auto p-4 flex items-center justify-start gap-3 hover:border-[#8B5CF6] hover:bg-[#F3E8FF] transition-colors"
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#F3E8FF' }}
              >
                <ScanLine className="w-5 h-5" style={{ color: '#8B5CF6' }} />
              </div>
              <span className="text-sm text-[#0f172a]">Scan Medications</span>
              <ChevronRight className="w-4 h-4 text-[#cbd5e1] ml-auto" />
            </Button>
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
                    <p className="text-xs text-[#64748b]">Last changed {profileData.lastPasswordChange}</p>
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
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="Enter current password"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Enter new password"
                className="h-11 rounded-xl"
              />
              <p className="text-xs text-[#64748b]">Must be at least 8 characters</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              className="bg-[#0966CC] hover:bg-[#075985]"
              onClick={handleChangePassword}
              disabled={saving}
            >
              {saving ? 'Updating...' : 'Update Password'}
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
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="Enter 6-digit code"
                className="h-11 rounded-xl"
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
    </div>
  );
}
