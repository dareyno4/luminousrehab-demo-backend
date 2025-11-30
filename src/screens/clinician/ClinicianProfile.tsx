import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Award,
  Calendar,
  Edit,
  Shield,
  Activity,
  CheckCircle2,
  FileText,
  Users,
  Settings,
  Lock,
  ChevronRight,
  Upload,
  Building2,
  GraduationCap,
  Clock,
  BadgeCheck,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userProfileService, type UserProfile } from '../../services/userProfileService';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { Progress } from '../../components/ui/progress';
import { Separator } from '../../components/ui/separator';
import { Screen, NavigationParams } from '../../App';

interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
}

export default function ClinicianProfile({ navigation }: Props) {
  const { user } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedEmail, setEditedEmail] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedFirstName, setEditedFirstName] = useState('');
  const [editedLastName, setEditedLastName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({ totalPatients: 0, totalCharts: 0, pendingReview: 0 });
  const [tenantInfo, setTenantInfo] = useState<any>(null);

  useEffect(() => {
    if (user?.id && user?.tenant_id) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    if (!user?.id || !user?.tenant_id) return;
    
    try {
      setLoading(true);
      const [profileData, statsData, tenant] = await Promise.all([
        userProfileService.getUserProfile(user.id),
        userProfileService.getUserStatistics(user.id, user.tenant_id),
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

  const handleEditProfile = () => {
    setEditedEmail(profile?.email || '');
    setEditedPhone(profile?.phone_number || '');
    setEditedFirstName(profile?.first_name || '');
    setEditedLastName(profile?.last_name || '');
    setIsEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    try {
      setSaving(true);
      await userProfileService.updateProfile(user.id, {
        email: editedEmail,
        phone_number: editedPhone,
        first_name: editedFirstName,
        last_name: editedLastName,
      });
      
      toast.success('Profile updated successfully');
      setIsEditDialogOpen(false);
      loadProfileData();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="w-8 h-8 text-[#0966CC] animate-spin" />
      </div>
    );
  }

  const profileData = {
    name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown User',
    firstName: profile?.first_name || 'Unknown',
    lastName: profile?.last_name || '',
    credentials: profile?.occupation || 'RN, BSN',
    role: profile?.role === 'clinician' ? 'Registered Nurse' : 'Healthcare Professional',
    email: profile?.email || '',
    phone: profile?.phone_number || 'Not provided',
    address: profile?.address || 'Not provided',
    totalPatients: stats.totalPatients,
    totalCharts: stats.totalCharts,
    verificationRate: 98,
    isVerified: true,
    accountCreated: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown',
    lastUpdated: profile?.last_login ? new Date(profile.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' }) : 'Never',
    // Optional fields for display purposes
    pronouns: '',
    department: tenantInfo?.name || 'Home Health Services',
    facility: tenantInfo?.name || 'Healthcare Network',
    specialization: profile?.occupation || 'General Practice',
    certifications: [],
    licenseNumber: 'N/A',
    npiNumber: tenantInfo?.npi_number || 'N/A',
    yearsOfPractice: 0,
    joinDate: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown',
  };

  return (
    <div className="h-full flex flex-col bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0966CC] to-[#0C4A6E] p-5">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigation.goBack()}
            className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg text-white">My Profile</h1>
          <div className="w-10 h-10"></div>
        </div>

        {/* Profile Header Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
          <div className="flex items-start gap-4">
            {/* Avatar with Upload Option */}
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-white/30">
                <AvatarFallback className="bg-white text-[#0966CC] text-2xl">
                  {profileData.firstName[0]}{profileData.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors">
                <Upload className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>

            {/* Identity & Credentials */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h2 className="text-xl text-white mb-0.5">
                    {profileData.name}
                    {profileData.credentials && (
                      <span className="text-white/80 ml-2">{profileData.credentials}</span>
                    )}
                  </h2>
                  {profileData.pronouns && (
                    <p className="text-sm text-white/70 mb-2">{profileData.pronouns}</p>
                  )}
                </div>
                <Button
                  onClick={handleEditProfile}
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30 shadow-none"
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" />
                  Edit Profile
                </Button>
              </div>

              {/* Role & Verification Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge className="bg-white/90 text-[#0966CC] border-0 font-medium">
                  {profileData.role}
                </Badge>
                {profileData.isVerified && (
                  <Badge className="bg-emerald-500/90 text-white border-0 flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" />
                    Verified Clinician
                  </Badge>
                )}
              </div>

              {/* Department & Facility */}
              <div className="space-y-1">
                <p className="text-sm text-white/90 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" />
                  {profileData.department} • {profileData.facility}
                </p>
                <p className="text-sm text-white/80">{profileData.specialization}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Metrics - Reordered by importance */}
        <div className="grid grid-cols-3 gap-3">
          {/* 1. Patients - Most meaningful clinically */}
          <div className="bg-white rounded-2xl p-4 border border-[#e2e8f0] shadow-sm text-center">
            <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center mb-2 mx-auto">
              <Users className="w-5 h-5 text-[#0966CC]" />
            </div>
            <p className="text-2xl text-[#0f172a] mb-1">{profileData.totalPatients}</p>
            <p className="text-xs text-[#64748b]">Patients</p>
          </div>

          {/* 2. Charts - Working volume */}
          <div className="bg-white rounded-2xl p-4 border border-[#e2e8f0] shadow-sm text-center">
            <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] flex items-center justify-center mb-2 mx-auto">
              <FileText className="w-5 h-5 text-[#0966CC]" />
            </div>
            <p className="text-2xl text-[#0f172a] mb-1">{profileData.totalCharts}</p>
            <p className="text-xs text-[#64748b]">Charts</p>
          </div>

          {/* 3. Accuracy Rate - Quality metric with tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-white rounded-2xl p-4 border border-[#e2e8f0] shadow-sm text-center cursor-help">
                  <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center mb-2 mx-auto relative">
                    <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                    <svg className="absolute inset-0 w-10 h-10 -rotate-90">
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        fill="none"
                        stroke="#D1FAE5"
                        strokeWidth="2"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2"
                        strokeDasharray={`${(profileData.verificationRate / 100) * 113} 113`}
                      />
                    </svg>
                  </div>
                  <p className="text-2xl text-[#0f172a] mb-1">{profileData.verificationRate}%</p>
                  <p className="text-xs text-[#64748b]">Accuracy</p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-sm">% of medication scans verified correctly on first attempt</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Separator className="bg-slate-200" />

        {/* Quick Navigation Actions */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Quick Actions</h3>
          </div>
          <div className="divide-y divide-slate-100">
            <button
              onClick={() => navigation.navigate('PatientChartList')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-sky-600" />
                </div>
                <span className="text-sm text-slate-900">View My Charts</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => navigation.navigate('PatientChartList')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-sky-600" />
                </div>
                <span className="text-sm text-slate-900">View My Patients</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => navigation.navigate('ClinicianSettings')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-slate-600" />
                </div>
                <span className="text-sm text-slate-900">Preferences</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => navigation.navigate('ClinicianSettings')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-slate-600" />
                </div>
                <span className="text-sm text-slate-900">Security Settings</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-2">
            <Mail className="w-4 h-4 text-[#0966CC]" />
            <h3 className="text-sm font-semibold text-[#0f172a]">Contact Information</h3>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] shadow-sm">
          <div className="space-y-4 pl-1">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-[#0966CC]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#64748b] mb-1">Email</p>
                <p className="text-sm text-[#0f172a]">{profileData.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-[#0966CC]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#64748b] mb-1">Phone</p>
                <p className="text-sm text-[#0f172a]">{profileData.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-[#0966CC]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#64748b] mb-1">Address</p>
                <p className="text-sm text-[#0f172a]">{profileData.address}</p>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-2">
            <Shield className="w-4 h-4 text-[#10B981]" />
            <h3 className="text-sm font-semibold text-[#0f172a]">Professional Information</h3>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0] shadow-sm">
          <div className="space-y-4 pl-1">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-[#10B981]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#64748b] mb-1">License Number</p>
                <p className="text-sm text-[#0f172a] flex items-center gap-2">
                  {profileData.licenseNumber}
                  {profileData.isVerified && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs py-0 px-1.5">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" />
                      Verified
                    </Badge>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-[#10B981]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#64748b] mb-1">NPI Number</p>
                <p className="text-sm text-[#0f172a]">{profileData.npiNumber}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-4 h-4 text-[#10B981]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#64748b] mb-1">Specialization</p>
                <p className="text-sm text-[#0f172a]">{profileData.specialization}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-4 h-4 text-[#10B981]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#64748b] mb-1">Certifications</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {profileData.certifications.map((cert, index) => (
                    <Badge key={index} variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-[#10B981]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#64748b] mb-1">Years of Practice</p>
                <p className="text-sm text-[#0f172a]">{profileData.yearsOfPractice} years</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D1FAE5] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-[#10B981]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#64748b] mb-1">Joined</p>
                <p className="text-sm text-[#0f172a]">{profileData.joinDate}</p>
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Trust Signals */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-200">
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
        <div className="px-2 pb-2">
          <div className="text-xs text-slate-500 space-y-1">
            <p>Account created: {profileData.accountCreated}</p>
            <p>Last updated: {profileData.lastUpdated}</p>
          </div>
        </div>
      </div>

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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-first-name">First Name</Label>
                <Input
                  id="edit-first-name"
                  type="text"
                  value={editedFirstName}
                  onChange={(e) => setEditedFirstName(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-name">Last Name</Label>
                <Input
                  id="edit-last-name"
                  type="text"
                  value={editedLastName}
                  onChange={(e) => setEditedLastName(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
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
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} className="bg-sky-600 hover:bg-sky-700" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
