import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  User,
  Mail,
  Phone,
  Briefcase,
  Key,
  Copy,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar,
  Eye,
  EyeOff,
  Shield,
  Ban,
  Send,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { 
  fetchAllUsers, 
  toggleUserActiveStatus,
  createUserInvitation,
  fetchUserInvitations,
  resendInvitation,
  revokeInvitation,
} from '../../services/agencyAdminService';
import { useAuth } from '../../context/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';

interface Props {
  // Props can be added as needed
}

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  occupation?: string;
  role: 'clinician' | 'scheduler';
  active: boolean;
  created_at: string;
  last_login?: string;
  assigned_chart_count?: number;
  invitation_id?: string;
}

interface InvitationData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'clinician' | 'scheduler';
  activation_code: string;
  activation_link: string;
  phone_number?: string;
  occupation?: string;
  status: 'pending' | 'activated' | 'expired' | 'revoked';
  created_at: string;
  activated_at?: string;
  expires_at: string;
  created_by_user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function AgencyUsersView({}: Props) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'clinician' | 'scheduler'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [selectedUserRole, setSelectedUserRole] = useState<'clinician' | 'scheduler'>('clinician');
  const [generatedActivationCode, setGeneratedActivationCode] = useState('');
  const [generatedActivationLink, setGeneratedActivationLink] = useState('');
  const [showActivationCode, setShowActivationCode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    occupation: '',
  });
  
  // Real data state
  const [users, setUsers] = useState<UserData[]>([]);
  const [invitations, setInvitations] = useState<InvitationData[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from services
  const loadData = useCallback(async () => {
    if (!user?.tenant_id) return;
    
    try {
      setLoading(true);
      const [usersData, invitationsData] = await Promise.all([
        fetchAllUsers(user.tenant_id),
        fetchUserInvitations(user.tenant_id),
      ]);
      setUsers(usersData);
      setInvitations(invitationsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load users and invitations');
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combine users and pending invitations for display
  const combinedList = [
    ...users.map(u => ({
      id: u.id,
      name: `${u.first_name} ${u.last_name}`,
      email: u.email,
      phone: u.phone_number,
      occupation: u.occupation,
      role: u.role,
      isActivated: true,
      isActive: u.active,
      createdDate: u.created_at,
      lastLogin: u.last_login,
      assignedCharts: u.assigned_chart_count || 0,
      type: 'user' as const,
    })),
    ...invitations
      .filter(inv => inv.status === 'pending')
      .map(inv => ({
        id: inv.id,
        name: `${inv.first_name} ${inv.last_name}`,
        email: inv.email,
        phone: inv.phone_number,
        occupation: inv.occupation,
        role: inv.role,
        activationCode: inv.activation_code,
        activationLink: inv.activation_link,
        isActivated: false,
        isActive: true,
        createdDate: inv.created_at,
        expiresAt: inv.expires_at,
        assignedCharts: 0,
        type: 'invitation' as const,
      })),
  ];

  const filteredList = combinedList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || item.role === filterRole;
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && item.isActivated && item.isActive) ||
      (filterStatus === 'inactive' && item.isActivated && !item.isActive) ||
      (filterStatus === 'pending' && !item.isActivated);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const cliniciansCount = users.filter(u => u.role === 'clinician').length;
  const schedulersCount = users.filter(u => u.role === 'scheduler').length;
  const activatedCount = users.length;
  const pendingCount = invitations.filter(inv => inv.status === 'pending').length;

  const handleAddUser = async () => {
    if (!newUser.firstName || !newUser.lastName || !newUser.email || !user?.tenant_id || !user?.id) {
      toast.error('Please fill in required fields (name and email)');
      return;
    }
    
    if (selectedUserRole === 'clinician' && !newUser.occupation) {
      toast.error('Occupation is required for clinicians');
      return;
    }
    
    try {
      const result = await createUserInvitation({
        email: newUser.email,
        first_name: newUser.firstName,
        last_name: newUser.lastName,
        role: selectedUserRole,
        tenant_id: user.tenant_id,
        created_by: user.id,
        phone_number: newUser.phone || undefined,
        occupation: newUser.occupation || undefined,
      });
      
      setGeneratedActivationCode(result.activation_code);
      setGeneratedActivationLink(result.activation_link);
      setShowActivationCode(true);
      
      const userName = `${newUser.firstName} ${newUser.lastName}`;
      toast.success(`${selectedUserRole === 'clinician' ? 'Clinician' : 'Scheduler'} "${userName}" invited successfully`);
      
      // Reload data
      await loadData();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(error.message || 'Failed to create invitation');
    }
  };

  const handleCopyActivationCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Activation code copied to clipboard');
    } catch (err) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        textArea.remove();
        
        if (successful) {
          toast.success('Activation code copied to clipboard');
        } else {
          toast.info(`Activation Code: ${code}`, { duration: 10000 });
        }
      } catch (fallbackErr) {
        toast.info(`Activation Code: ${code}`, { duration: 10000 });
      }
    }
  };

  const handleCopyActivationLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Activation link copied to clipboard');
    } catch (err) {
      toast.info(`Activation Link: ${link}`, { duration: 10000 });
    }
  };

  const handleResendInvitation = async (invitationId: string, userName: string) => {
    try {
      const updated = await resendInvitation(invitationId);
      toast.success(`New activation code generated for ${userName}`);
      await loadData();
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to regenerate activation code');
    }
  };

  const handleRevokeInvitation = async (invitationId: string, userName: string) => {
    try {
      await revokeInvitation(invitationId);
      toast.success(`Invitation for ${userName} has been revoked`);
      await loadData();
    } catch (error) {
      console.error('Error revoking invitation:', error);
      toast.error('Failed to revoke invitation');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean, userName: string) => {
    try {
      await toggleUserActiveStatus(userId, !currentStatus, user?.id || '');
      toast.success(`${userName} has been ${!currentStatus ? 'activated' : 'deactivated'}`);
      await loadData();
      setIsDeactivateDialogOpen(false);
      setSelectedUserId(null);
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleCloseModal = () => {
    setIsAddUserModalOpen(false);
    setShowActivationCode(false);
    setGeneratedActivationCode('');
    setGeneratedActivationLink('');
    setNewUser({ firstName: '', lastName: '', email: '', phone: '', occupation: '' });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl text-[#0f172a]">Users & Onboarding</h2>
          <p className="text-sm text-[#64748b]">Manage clinicians and schedulers</p>
        </div>
        <Button
          onClick={() => setIsAddUserModalOpen(true)}
          className="bg-[#10B981] hover:bg-[#059669] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748b]">Clinicians</p>
              <p className="text-2xl text-[#0f172a] mt-1">{loading ? '...' : cliniciansCount}</p>
            </div>
            <User className="w-8 h-8 text-[#0966CC]" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748b]">Schedulers</p>
              <p className="text-2xl text-[#0f172a] mt-1">{loading ? '...' : schedulersCount}</p>
            </div>
            <Calendar className="w-8 h-8 text-[#F59E0B]" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748b]">Activated</p>
              <p className="text-2xl text-[#0f172a] mt-1">{loading ? '...' : activatedCount}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748b]">Pending</p>
              <p className="text-2xl text-[#0f172a] mt-1">{loading ? '...' : pendingCount}</p>
            </div>
            <Key className="w-8 h-8 text-[#DC2626]" />
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-xl border-2 border-[#e2e8f0] bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-2">
            <Button
              variant={filterRole === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterRole('all')}
              className={filterRole === 'all' ? 'bg-[#10B981] hover:bg-[#059669]' : ''}
              size="sm"
            >
              All Roles
            </Button>
            <Button
              variant={filterRole === 'clinician' ? 'default' : 'outline'}
              onClick={() => setFilterRole('clinician')}
              className={filterRole === 'clinician' ? 'bg-[#0966CC] hover:bg-[#075985]' : 'border-[#0966CC] text-[#0966CC]'}
              size="sm"
            >
              Clinicians
            </Button>
            <Button
              variant={filterRole === 'scheduler' ? 'default' : 'outline'}
              onClick={() => setFilterRole('scheduler')}
              className={filterRole === 'scheduler' ? 'bg-[#F59E0B] hover:bg-[#D97706]' : 'border-[#F59E0B] text-[#F59E0B]'}
              size="sm"
            >
              Schedulers
            </Button>
          </div>
          <div className="flex gap-2 border-l pl-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('all')}
              className={filterStatus === 'all' ? 'bg-[#10B981] hover:bg-[#059669]' : ''}
              size="sm"
            >
              All Status
            </Button>
            <Button
              variant={filterStatus === 'active' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('active')}
              className={filterStatus === 'active' ? 'bg-[#10B981] hover:bg-[#059669]' : 'border-[#10B981] text-[#10B981]'}
              size="sm"
            >
              Active
            </Button>
            <Button
              variant={filterStatus === 'inactive' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('inactive')}
              className={filterStatus === 'inactive' ? 'bg-gray-500 hover:bg-gray-600' : 'border-gray-500 text-gray-500'}
              size="sm"
            >
              Inactive
            </Button>
            <Button
              variant={filterStatus === 'pending' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('pending')}
              className={filterStatus === 'pending' ? 'bg-[#DC2626] hover:bg-[#B91C1C]' : 'border-[#DC2626] text-[#DC2626]'}
              size="sm"
            >
              Pending
            </Button>
          </div>
        </div>
      </div>

      {/* Users List */}
      {filteredList.length > 0 ? (
        <div className="space-y-3">
          {filteredList.map((item) => (
            <Card key={item.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className={`h-12 w-12 ${item.role === 'clinician' ? 'bg-linear-to-br from-[#0966CC] to-[#075985]' : 'bg-linear-to-br from-[#F59E0B] to-[#D97706]'}`}>
                      <AvatarFallback className="text-white">
                        {item.name.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg text-[#0f172a]">{item.name}</h3>
                        <Badge className={item.role === 'clinician' 
                          ? 'bg-[#DBEAFE] text-[#0966CC] border-[#BFDBFE]'
                          : 'bg-[#FEF3C7] text-[#F59E0B] border-[#FDE68A]'
                        }>
                          {item.role === 'clinician' ? 'Clinician' : 'Scheduler'}
                        </Badge>
                        {item.isActivated ? (
                          <Badge className="bg-[#D1FAE5] text-[#10B981] border-[#A7F3D0]">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Activated
                          </Badge>
                        ) : (
                          <Badge className="bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]">
                            <XCircle className="w-3 h-3 mr-1" />
                            Pending Activation
                          </Badge>
                        )}
                      </div>
                      {item.occupation && (
                        <p className="text-sm text-[#64748b] mt-1">{item.occupation}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-[#64748b]">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{item.email}</span>
                    </div>
                    {item.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{item.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Added: {new Date(item.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    {item.isActivated && item.type === 'user' && 'lastLogin' in item && item.lastLogin && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Last login: {new Date(item.lastLogin).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    )}
                    {item.role === 'clinician' && item.assignedCharts !== undefined && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        <span>{item.assignedCharts} assigned chart{item.assignedCharts !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Activation Code Section - Only for pending invitations */}
                  {!item.isActivated && item.type === 'invitation' && 'activationCode' in item && (
                    <div className="mt-4 p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Key className="w-4 h-4 text-[#64748b]" />
                          <span className="text-sm text-[#64748b]">Activation Code:</span>
                          <code className="text-sm bg-white px-2 py-1 rounded border border-[#e2e8f0]">
                            {item.activationCode}
                          </code>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyActivationCode(item.activationCode!)}
                            className="h-8"
                            title="Copy code"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyActivationLink(item.activationLink!)}
                            className="h-8 text-[#0966CC] hover:text-[#075985] hover:bg-[#DBEAFE]"
                            title="Copy link"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResendInvitation(item.id, item.name)}
                            className="h-8 text-[#10B981] hover:text-[#059669] hover:bg-[#D1FAE5]"
                            title="Resend invitation"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {'expiresAt' in item && (
                        <p className="text-xs text-[#64748b]">
                          Expires: {new Date(item.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* User Actions - Only for activated users */}
                  {item.isActivated && item.type === 'user' && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUserId(item.id);
                          setIsDeactivateDialogOpen(true);
                        }}
                        className={item.isActive ? 'border-red-500 text-red-500 hover:bg-red-50' : 'border-[#10B981] text-[#10B981] hover:bg-[#D1FAE5]'}
                      >
                        {item.isActive ? (
                          <><Ban className="w-4 h-4 mr-2" />Deactivate</>
                        ) : (
                          <><CheckCircle2 className="w-4 h-4 mr-2" />Reactivate</>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Revoke Invitation - Only for pending invitations */}
                  {!item.isActivated && item.type === 'invitation' && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeInvitation(item.id, item.name)}
                        className="border-red-500 text-red-500 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Revoke Invitation
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-[#cbd5e1] mx-auto mb-3" />
          <p className="text-[#64748b]">
            {searchQuery
              ? 'No users found matching your search.'
              : 'No users yet. Add a user to get started.'}
          </p>
        </Card>
      )}

      {/* Add User Modal */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Onboard a new clinician or scheduler to your organization
            </DialogDescription>
          </DialogHeader>

          {!showActivationCode ? (
            <>
              <Tabs value={selectedUserRole} onValueChange={(value:any) => setSelectedUserRole(value as 'clinician' | 'scheduler')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="clinician">Clinician</TabsTrigger>
                  <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="user-firstName">First Name *</Label>
                  <Input
                    id="user-firstName"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    placeholder="John"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-lastName">Last Name *</Label>
                  <Input
                    id="user-lastName"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    placeholder="Doe"
                    className="h-11 rounded-xl"
                  />
                </div>
                {selectedUserRole === 'clinician' && (
                  <div className="space-y-2">
                    <Label htmlFor="user-occupation">Occupation *</Label>
                    <Input
                      id="user-occupation"
                      value={newUser.occupation}
                      onChange={(e) => setNewUser({ ...newUser, occupation: e.target.value })}
                      placeholder="e.g., Registered Nurse"
                      className="h-11 rounded-xl"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="user-email">Email Address *</Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="user@example.com"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-phone">Phone Number</Label>
                  <Input
                    id="user-phone"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="555-1234"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#10B981] hover:bg-[#059669]"
                  onClick={handleAddUser}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add {selectedUserRole === 'clinician' ? 'Clinician' : 'Scheduler'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 bg-[#D1FAE5] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                </div>
                <div>
                  <h3 className="text-lg text-[#0f172a] mb-2">User Invited Successfully!</h3>
                  <p className="text-sm text-[#64748b]">
                    {newUser.firstName} {newUser.lastName} has been invited as a {selectedUserRole}. Share the activation code or link below.
                  </p>
                </div>
                <div className="bg-[#f8fafc] border-2 border-[#e2e8f0] rounded-xl p-6 space-y-4">
                  <div>
                    <p className="text-sm text-[#64748b] mb-3">Activation Code</p>
                    <div className="flex items-center justify-center gap-3">
                      <code className="text-2xl bg-white px-4 py-3 rounded-lg border-2 border-[#10B981] text-[#0f172a]">
                        {generatedActivationCode}
                      </code>
                      <Button
                        variant="outline"
                        onClick={() => handleCopyActivationCode(generatedActivationCode)}
                        className="border-[#10B981] text-[#10B981] hover:bg-[#D1FAE5]"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Code
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748b] mb-2">Activation Link</p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={generatedActivationLink}
                        readOnly
                        className="text-sm"
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleCopyActivationLink(generatedActivationLink)}
                        className="border-[#10B981] text-[#10B981] hover:bg-[#D1FAE5] shrink-0"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-[#64748b]">
                    The user will need this code or link to complete their account setup. Invitation expires in 7 days.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  className="bg-[#10B981] hover:bg-[#059669]"
                  onClick={handleCloseModal}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Deactivate User Confirmation Dialog */}
      <AlertDialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm User Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUserId && filteredList.find(u => u.id === selectedUserId)?.isActive
                ? 'Deactivating this user will prevent them from logging in. They will not be able to access their account until reactivated.'
                : 'Reactivating this user will restore their access to the system.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeactivateDialogOpen(false);
              setSelectedUserId(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const selectedUser = filteredList.find(u => u.id === selectedUserId);
                if (selectedUser && selectedUser.type === 'user') {
                  handleToggleUserStatus(selectedUser.id, selectedUser.isActive, selectedUser.name);
                }
              }}
              className={selectedUserId && filteredList.find(u => u.id === selectedUserId)?.isActive
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-[#10B981] hover:bg-[#059669]'}
            >
              {selectedUserId && filteredList.find(u => u.id === selectedUserId)?.isActive ? 'Deactivate' : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
