import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  FileText,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Upload,
  Eye,
  Edit,
  ChevronRight,
  Paperclip,
  Check,
  X,
  RefreshCw,
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
import { toast } from 'sonner';
import { fetchAllPatients, fetchAllUsers } from '../../services/agencyAdminService';
import { createPatient, createChart } from '../../services/schedulerService';
import { useAuth } from '../../context/AuthContext';
import { getSignedDocumentUrl } from '../../services/documentService';
import { supabaseClient } from '../../lib/supabase';

interface Props {
  // Props can be added as needed
}

interface Patient {
  id: string;
  name: string;
  dob: string;
  address: string;
  phone: string;
  email?: string;
  chartCount: number;
  assignedClinician?: string;
  documents: Document[];
}

interface Document {
  id: string;
  name: string;
  type: string;
  uploadedDate: string;
  size: string;
  file_url?: string;
}

interface Clinician {
  id: string;
  name: string;
  assignedCharts: number;
}

const mockClinicians: Clinician[] = [
  { id: '1', name: 'Anna Clinician', assignedCharts: 5 },
  { id: '2', name: 'Bob Clinician', assignedCharts: 3 },
  { id: '3', name: 'Carol Clinician', assignedCharts: 7 },
];

const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'Jane Test',
    dob: '1969-12-31',
    address: '101 Test Ave, Test City, CA 90210',
    phone: '555-1001',
    email: 'jane.test@email.com',
    chartCount: 2,
    assignedClinician: 'Anna Clinician',
    documents: [
      { id: 'd1', name: 'Insurance Card Front.pdf', type: 'PDF', uploadedDate: '2025-01-10', size: '1.2 MB' },
      { id: 'd2', name: 'Medical History.pdf', type: 'PDF', uploadedDate: '2025-01-11', size: '850 KB' },
    ],
  },
  {
    id: '2',
    name: 'John Sample',
    dob: '1972-02-01',
    address: '202 Sample St, Sample Town, CA 90211',
    phone: '555-1002',
    email: 'john.sample@email.com',
    chartCount: 1,
    assignedClinician: 'Bob Clinician',
    documents: [],
  },
  {
    id: '3',
    name: 'Sarah Martinez',
    dob: '1955-07-12',
    address: '303 Demo Rd, Demo City, CA 90212',
    phone: '555-1003',
    chartCount: 0,
    documents: [
      { id: 'd3', name: 'Consent Form.pdf', type: 'PDF', uploadedDate: '2025-01-05', size: '520 KB' },
    ],
  },
];

export default function AgencyPatientsView({}: Props) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isViewDocModalOpen, setIsViewDocModalOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false);
  const [isAssignClinicianModalOpen, setIsAssignClinicianModalOpen] = useState(false);
  const [selectedClinicianId, setSelectedClinicianId] = useState('');
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [editPatient, setEditPatient] = useState({
    id: '',
    firstName: '',
    lastName: '',
    dob: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    assignedClinician: '',
  });
  const [newPatient, setNewPatient] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    assignedClinician: '',
  });
  
  // Real data state
  const [patients, setPatients] = useState<any[]>([]);
  const [clinicians, setClinicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from services
  const loadData = useCallback(async () => {
    if (!user?.tenant_id) {
      console.log('No tenant_id found');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Loading patients and users for tenant:', user.tenant_id);
      
      const [patientsData, usersData] = await Promise.all([
        fetchAllPatients(user.tenant_id),
        fetchAllUsers(user.tenant_id),
      ]);
      
      console.log('Patients loaded:', patientsData);
      console.log('Users loaded:', usersData);
      
      setPatients(patientsData || []);
      setClinicians((usersData || []).filter((u: any) => u.role === 'clinician'));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(`Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setPatients([]);
      setClinicians([]);
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Transform patients to UI format
  const transformedPatients = (patients || []).map(patient => {
    // Construct address from separate fields
    const addressParts = [
      patient.address_line1,
      patient.address_line2,
      patient.city,
      patient.state,
      patient.zip_code
    ].filter(Boolean);
    const fullAddress = addressParts.join(', ') || '';
    
    return {
      id: patient.id,
      name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown Patient',
      dob: patient.date_of_birth || '',
      address: fullAddress,
      phone: patient.phone || '',
      email: patient.email || '',
      chartCount: Array.isArray(patient.charts) ? patient.charts.length : 0,
      assignedClinician: patient.assigned_clinician 
        ? `${patient.assigned_clinician.first_name || ''} ${patient.assigned_clinician.last_name || ''}`.trim()
        : undefined,
      documents: Array.isArray(patient.documents) ? patient.documents.map((doc: any) => ({
        id: doc.id,
        name: doc.file_name || 'Unknown',
        type: doc.file_type?.toUpperCase() || 'FILE',
        uploadedDate: doc.created_at,
        size: 'N/A',
        file_url: doc.file_url,
      })) : [],
    };
  });

  const filteredPatients = transformedPatients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone.includes(searchQuery)
  );

  const handleAddPatient = async () => {
    if (!newPatient.firstName || !newPatient.lastName || !newPatient.dob) {
      toast.error('Please fill in required fields (First Name, Last Name, DOB)');
      return;
    }
    
    if (!user?.tenant_id || !user?.id) {
      toast.error('User session not found');
      return;
    }
    
    try {
      // Check if patient already exists
      const { data: existingPatients, error: searchError } = await supabaseClient
        .from('patients')
        .select(`
          id, 
          first_name, 
          last_name, 
          date_of_birth,
          charts (
            id,
            status,
            created_at
          )
        `)
        .eq('tenant_id', user.tenant_id)
        .eq('first_name', newPatient.firstName)
        .eq('last_name', newPatient.lastName)
        .eq('date_of_birth', newPatient.dob);

      if (searchError) {
        console.error('Error searching for existing patient:', searchError);
        toast.error('Failed to check for existing patient');
        return;
      }

      let patientId: string;
      let isNewPatient = false;

      if (existingPatients && existingPatients.length > 0) {
        const existingPatient = existingPatients[0];
        patientId = existingPatient.id;
        
        // Check if patient already has a chart
        if (existingPatient.charts && existingPatient.charts.length > 0) {
          toast.error(`Patient "${newPatient.firstName} ${newPatient.lastName}" already exists with a chart. Each patient can only have one chart.`);
          return;
        }
        
        console.log(`Using existing patient (no chart): ${newPatient.firstName} ${newPatient.lastName} (ID: ${patientId})`);
        toast.info('Patient already exists. Creating chart for existing patient.');
      } else {
        // Create new patient
        const patientData = {
          first_name: newPatient.firstName,
          last_name: newPatient.lastName,
          date_of_birth: newPatient.dob,
          address_line1: newPatient.addressLine1 || undefined,
          address_line2: newPatient.addressLine2 || undefined,
          city: newPatient.city || undefined,
          state: newPatient.state || undefined,
          zip_code: newPatient.zipCode || undefined,
          phone: newPatient.phone || undefined,
          email: newPatient.email || undefined,
        };
        
        const createdPatient = await createPatient(patientData, user.tenant_id, user.id);
        patientId = createdPatient.id;
        isNewPatient = true;
        
        // If a clinician was assigned, update the patient
        if (newPatient.assignedClinician) {
          await supabaseClient
            .from('patients')
            .update({ assigned_clinician_id: newPatient.assignedClinician })
            .eq('id', patientId);
        }
      }
      
      // Create a chart for the patient
      await createChart(
        {
          patient_id: patientId,
          source: 'empty_chart',
          status: 'active',
        },
        user.tenant_id,
        user.id
      );
      
      if (isNewPatient) {
        toast.success(`Patient "${newPatient.firstName} ${newPatient.lastName}" added successfully with a chart`);
      } else {
        toast.success(`Chart created for existing patient "${newPatient.firstName} ${newPatient.lastName}"`);
      }
      
      setIsAddPatientModalOpen(false);
      setNewPatient({ 
        firstName: '', 
        lastName: '', 
        dob: '', 
        addressLine1: '', 
        addressLine2: '', 
        city: '', 
        state: '', 
        zipCode: '', 
        phone: '', 
        email: '', 
        assignedClinician: '' 
      });
      
      // Reload the patients list
      await loadData();
    } catch (error) {
      console.error('Error creating patient:', error);
      toast.error(`Failed to add patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUploadDocument = () => {
    toast.success('Document uploaded successfully');
    setIsUploadDocModalOpen(false);
    setSelectedPatient(null);
  };

  const handleViewDocuments = (patient: Patient) => {
    if (patient.documents.length === 0) {
      toast.error('No documents available');
      return;
    }
    // Show the first document
    handleViewDocument(patient.documents[0]);
  };

  const handleViewDocument = async (doc: Document) => {
    setViewingDocument(doc);
    setIsViewDocModalOpen(true);
    setLoadingSignedUrl(true);
    
    try {
      if (doc.file_url) {
        const url = await getSignedDocumentUrl(doc.file_url);
        setSignedUrl(url);
      } else {
        toast.error('Document URL not available');
        setSignedUrl('');
      }
    } catch (error) {
      console.error('Error getting signed URL:', error);
      setSignedUrl(doc.file_url || '');
    } finally {
      setLoadingSignedUrl(false);
    }
  };

  const handleAssignClinician = async () => {
    if (!selectedPatient || !selectedClinicianId) {
      toast.error('Please select a clinician');
      return;
    }
    
    try {
      // Find the patient's ID from the raw data
      const patient = patients.find(p => 
        `${p.first_name} ${p.last_name}`.trim() === selectedPatient.name
      );
      
      if (!patient) {
        toast.error('Patient not found');
        return;
      }
      
      // Update the patient's assigned clinician
      const { error } = await supabaseClient
        .from('patients')
        .update({ assigned_clinician_id: selectedClinicianId })
        .eq('id', patient.id);
      
      if (error) throw error;
      
      const selectedClinician = clinicians.find(c => c.id === selectedClinicianId);
      const clinicianName = selectedClinician 
        ? `${selectedClinician.first_name} ${selectedClinician.last_name}`
        : 'clinician';
      
      toast.success(`Assigned ${selectedPatient.name} to ${clinicianName}`);
      setIsAssignClinicianModalOpen(false);
      setSelectedPatient(null);
      setSelectedClinicianId('');
      
      // Reload the patients list
      await loadData();
    } catch (error) {
      console.error('Error assigning clinician:', error);
      toast.error(`Failed to assign clinician: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditPatient = (patient: Patient) => {
    // Find the raw patient data to get the full details
    const rawPatient = patients.find(p => p.id === patient.id);
    
    if (!rawPatient) {
      console.error('Patient not found in raw data:', patient);
      toast.error('Patient not found');
      return;
    }
    
    console.log('Editing patient:', rawPatient);
    
    setEditPatient({
      id: rawPatient.id,
      firstName: rawPatient.first_name || '',
      lastName: rawPatient.last_name || '',
      dob: rawPatient.date_of_birth || '',
      addressLine1: rawPatient.address_line1 || '',
      addressLine2: rawPatient.address_line2 || '',
      city: rawPatient.city || '',
      state: rawPatient.state || '',
      zipCode: rawPatient.zip_code || '',
      phone: rawPatient.phone || '',
      email: rawPatient.email || '',
      assignedClinician: rawPatient.assigned_clinician_id || '',
    });
    setIsEditPatientModalOpen(true);
  };

  const handleUpdatePatient = async () => {
    if (!editPatient.firstName || !editPatient.lastName || !editPatient.dob) {
      toast.error('Please fill in required fields (First Name, Last Name, DOB)');
      return;
    }
    
    try {
      const updateData: any = {
        first_name: editPatient.firstName,
        last_name: editPatient.lastName,
        date_of_birth: editPatient.dob,
        address_line1: editPatient.addressLine1 || null,
        address_line2: editPatient.addressLine2 || null,
        city: editPatient.city || null,
        state: editPatient.state || null,
        zip_code: editPatient.zipCode || null,
        phone: editPatient.phone || null,
        email: editPatient.email || null,
        assigned_clinician_id: editPatient.assignedClinician || null,
      };
      
      const { error } = await supabaseClient
        .from('patients')
        .update(updateData)
        .eq('id', editPatient.id);
      
      if (error) throw error;
      
      toast.success(`Patient "${editPatient.firstName} ${editPatient.lastName}" updated successfully`);
      setIsEditPatientModalOpen(false);
      setEditPatient({
        id: '',
        firstName: '',
        lastName: '',
        dob: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        email: '',
        assignedClinician: '',
      });
      
      // Reload the patients list
      await loadData();
    } catch (error) {
      console.error('Error updating patient:', error);
      toast.error(`Failed to update patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl text-[#0f172a]">Patients</h2>
          <p className="text-sm text-[#64748b]">Manage patient records and assignments</p>
        </div>
        <Button
          onClick={() => setIsAddPatientModalOpen(true)}
          className="bg-[#10B981] hover:bg-[#059669] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748b]">Total Patients</p>
              <p className="text-2xl text-[#0f172a] mt-1">
                {loading ? '...' : transformedPatients.length}
              </p>
            </div>
            <Users className="w-8 h-8 text-[#10B981]" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748b]">With Assigned Clinician</p>
              <p className="text-2xl text-[#0f172a] mt-1">
                {loading ? '...' : transformedPatients.filter(p => p.assignedClinician).length}
              </p>
            </div>
            <User className="w-8 h-8 text-[#0966CC]" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#64748b]">With Documents</p>
              <p className="text-2xl text-[#0f172a] mt-1">
                {loading ? '...' : transformedPatients.filter(p => p.documents.length > 0).length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-[#F59E0B]" />
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
        <Input
          placeholder="Search patients by name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 rounded-xl border-2 border-[#e2e8f0] bg-white"
        />
      </div>

      {/* Patients List */}
      {filteredPatients.length > 0 ? (
        <div className="space-y-3">
          {filteredPatients.map((patient) => (
            <Card key={patient.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-12 w-12 bg-gradient-to-br from-[#10B981] to-[#059669]">
                      <AvatarFallback className="text-white">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg text-[#0f172a]">{patient.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {patient.assignedClinician && (
                          <Badge className="bg-[#DBEAFE] text-[#0966CC] border-[#BFDBFE]">
                            {patient.assignedClinician}
                          </Badge>
                        )}
                        {patient.chartCount > 0 && (
                          <Badge variant="outline" className="border-[#10B981] text-[#10B981]">
                            {patient.chartCount} chart{patient.chartCount !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {patient.documents.length > 0 && (
                          <Badge variant="outline" className="border-[#F59E0B] text-[#F59E0B]">
                            <Paperclip className="w-3 h-3 mr-1" />
                            {patient.documents.length} doc{patient.documents.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-[#64748b]">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>DOB: {new Date(patient.dob).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{patient.phone}</span>
                    </div>
                    {patient.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{patient.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{patient.address}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!patient.assignedClinician && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPatient(patient);
                        setIsAssignClinicianModalOpen(true);
                      }}
                      className="border-[#0966CC] text-[#0966CC] hover:bg-[#DBEAFE]"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Assign Clinician
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPatient(patient);
                      setIsUploadDocModalOpen(true);
                    }}
                    className="border-[#F59E0B] text-[#F59E0B] hover:bg-[#FEF3C7]"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                  {patient.documents.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDocuments(patient)}
                      className="border-[#10B981] text-[#10B981] hover:bg-[#D1FAE5]"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Docs ({patient.documents.length})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      try {
                        handleEditPatient(patient);
                      } catch (error) {
                        console.error('Error opening edit modal:', error);
                        toast.error('Failed to open edit form');
                      }
                    }}
                    className="border-[#64748b] text-[#64748b] hover:bg-[#f8fafc]"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
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
              ? 'No patients found matching your search.'
              : 'No patients yet. Add a patient to get started.'}
          </p>
        </Card>
      )}

      {/* Add Patient Modal */}
      <Dialog open={isAddPatientModalOpen} onOpenChange={setIsAddPatientModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Patient</DialogTitle>
            <DialogDescription>
              Enter patient information and optionally assign to a clinician
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="patient-firstName">First Name *</Label>
              <Input
                id="patient-firstName"
                value={newPatient.firstName}
                onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })}
                placeholder="John"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-lastName">Last Name *</Label>
              <Input
                id="patient-lastName"
                value={newPatient.lastName}
                onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })}
                placeholder="Doe"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-dob">Date of Birth *</Label>
              <Input
                id="patient-dob"
                type="date"
                value={newPatient.dob}
                onChange={(e) => setNewPatient({ ...newPatient, dob: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-phone">Phone Number</Label>
              <Input
                id="patient-phone"
                value={newPatient.phone}
                onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                placeholder="555-1234"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="patient-email">Email</Label>
              <Input
                id="patient-email"
                type="email"
                value={newPatient.email}
                onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                placeholder="patient@email.com"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="patient-addressLine1">Address Line 1</Label>
              <Input
                id="patient-addressLine1"
                value={newPatient.addressLine1}
                onChange={(e) => setNewPatient({ ...newPatient, addressLine1: e.target.value })}
                placeholder="123 Main Street"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="patient-addressLine2">Address Line 2</Label>
              <Input
                id="patient-addressLine2"
                value={newPatient.addressLine2}
                onChange={(e) => setNewPatient({ ...newPatient, addressLine2: e.target.value })}
                placeholder="Apt 4B (optional)"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-city">City</Label>
              <Input
                id="patient-city"
                value={newPatient.city}
                onChange={(e) => setNewPatient({ ...newPatient, city: e.target.value })}
                placeholder="Los Angeles"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-state">State</Label>
              <Input
                id="patient-state"
                value={newPatient.state}
                onChange={(e) => setNewPatient({ ...newPatient, state: e.target.value })}
                placeholder="CA"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-zipCode">ZIP Code</Label>
              <Input
                id="patient-zipCode"
                value={newPatient.zipCode}
                onChange={(e) => setNewPatient({ ...newPatient, zipCode: e.target.value })}
                placeholder="90210"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="assigned-clinician">Assign to Clinician (Optional)</Label>
              <Select
                value={newPatient.assignedClinician}
                onValueChange={(value) => setNewPatient({ ...newPatient, assignedClinician: value })}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select clinician" />
                </SelectTrigger>
                <SelectContent>
                  {clinicians.map((clinician) => (
                    <SelectItem key={clinician.id} value={clinician.id}>
                      {clinician.first_name} {clinician.last_name} ({clinician.assigned_chart_count || 0} charts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPatientModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#10B981] hover:bg-[#059669]"
              onClick={handleAddPatient}
            >
              <Check className="w-4 h-4 mr-2" />
              Add Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Document Modal */}
      <Dialog open={isUploadDocModalOpen} onOpenChange={setIsUploadDocModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document for {selectedPatient?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-[#e2e8f0] rounded-xl p-8 text-center hover:border-[#10B981] hover:bg-[#F0FDF4] transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-[#94a3b8] mx-auto mb-3" />
              <p className="text-sm text-[#64748b] mb-1">Click to upload or drag and drop</p>
              <p className="text-xs text-[#94a3b8]">PDF, PNG, JPG up to 10MB</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsUploadDocModalOpen(false);
              setSelectedPatient(null);
            }}>
              Cancel
            </Button>
            <Button
              className="bg-[#10B981] hover:bg-[#059669]"
              onClick={handleUploadDocument}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Modal */}
      <Dialog open={isViewDocModalOpen} onOpenChange={setIsViewDocModalOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{viewingDocument?.name}</DialogTitle>
            <DialogDescription>
              {viewingDocument?.type} • Uploaded {viewingDocument?.uploadedDate ? new Date(viewingDocument.uploadedDate).toLocaleDateString() : 'N/A'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {loadingSignedUrl ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#10B981] mx-auto mb-2" />
                  <p className="text-sm text-[#64748b]">Loading document...</p>
                </div>
              </div>
            ) : signedUrl ? (
              viewingDocument?.type?.toLowerCase().includes('pdf') ? (
                <iframe
                  src={signedUrl}
                  className="w-full h-full border-0 rounded-lg"
                  title={viewingDocument.name}
                />
              ) : (
                <img
                  src={signedUrl}
                  alt={viewingDocument?.name}
                  className="w-full h-auto rounded-lg"
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-[#64748b]">Unable to load document</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDocModalOpen(false)}>
              Close
            </Button>
            {signedUrl && (
              <Button
                onClick={() => window.open(signedUrl, '_blank')}
                className="bg-[#10B981] hover:bg-[#059669]"
              >
                <Eye className="w-4 h-4 mr-2" />
                Open in New Tab
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Clinician Modal */}
      <Dialog open={isAssignClinicianModalOpen} onOpenChange={setIsAssignClinicianModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Clinician</DialogTitle>
            <DialogDescription>
              Select a clinician to assign to {selectedPatient?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clinician-select">Clinician</Label>
              <Select
                value={selectedClinicianId}
                onValueChange={setSelectedClinicianId}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select clinician" />
                </SelectTrigger>
                <SelectContent>
                  {clinicians.map((clinician) => (
                    <SelectItem key={clinician.id} value={clinician.id}>
                      {clinician.first_name} {clinician.last_name} ({clinician.assigned_chart_count || 0} patients)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAssignClinicianModalOpen(false);
              setSelectedPatient(null);
              setSelectedClinicianId('');
            }}>
              Cancel
            </Button>
            <Button
              className="bg-[#10B981] hover:bg-[#059669]"
              onClick={handleAssignClinician}
              disabled={!selectedClinicianId}
            >
              <User className="w-4 h-4 mr-2" />
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Modal */}
      <Dialog open={isEditPatientModalOpen} onOpenChange={setIsEditPatientModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
            <DialogDescription>
              Update patient information
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">First Name *</Label>
              <Input
                id="edit-firstName"
                value={editPatient.firstName}
                onChange={(e) => setEditPatient({ ...editPatient, firstName: e.target.value })}
                placeholder="John"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Last Name *</Label>
              <Input
                id="edit-lastName"
                value={editPatient.lastName}
                onChange={(e) => setEditPatient({ ...editPatient, lastName: e.target.value })}
                placeholder="Doe"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dob">Date of Birth *</Label>
              <Input
                id="edit-dob"
                type="date"
                value={editPatient.dob}
                onChange={(e) => setEditPatient({ ...editPatient, dob: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={editPatient.phone}
                onChange={(e) => setEditPatient({ ...editPatient, phone: e.target.value })}
                placeholder="555-1234"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editPatient.email}
                onChange={(e) => setEditPatient({ ...editPatient, email: e.target.value })}
                placeholder="patient@email.com"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-addressLine1">Address Line 1</Label>
              <Input
                id="edit-addressLine1"
                value={editPatient.addressLine1}
                onChange={(e) => setEditPatient({ ...editPatient, addressLine1: e.target.value })}
                placeholder="123 Main Street"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-addressLine2">Address Line 2</Label>
              <Input
                id="edit-addressLine2"
                value={editPatient.addressLine2}
                onChange={(e) => setEditPatient({ ...editPatient, addressLine2: e.target.value })}
                placeholder="Apt 4B (optional)"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city">City</Label>
              <Input
                id="edit-city"
                value={editPatient.city}
                onChange={(e) => setEditPatient({ ...editPatient, city: e.target.value })}
                placeholder="Los Angeles"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-state">State</Label>
              <Input
                id="edit-state"
                value={editPatient.state}
                onChange={(e) => setEditPatient({ ...editPatient, state: e.target.value })}
                placeholder="CA"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-zipCode">ZIP Code</Label>
              <Input
                id="edit-zipCode"
                value={editPatient.zipCode}
                onChange={(e) => setEditPatient({ ...editPatient, zipCode: e.target.value })}
                placeholder="90210"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-assignedClinician">Assigned Clinician</Label>
              <Select
                value={editPatient.assignedClinician || 'unassigned'}
                onValueChange={(value) => setEditPatient({ ...editPatient, assignedClinician: value === 'unassigned' ? '' : value })}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select clinician (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">None</SelectItem>
                  {clinicians.map((clinician) => (
                    <SelectItem key={clinician.id} value={clinician.id}>
                      {clinician.first_name} {clinician.last_name} ({clinician.assigned_chart_count || 0} patients)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPatientModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#10B981] hover:bg-[#059669]"
              onClick={handleUpdatePatient}
            >
              <Check className="w-4 h-4 mr-2" />
              Update Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
