import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Mail,
  Phone,
  Users,
  FileText,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  Activity,
  TrendingUp,
  AlertCircle,
  Eye,
  RefreshCw,
  X,
  Download,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import { toast } from 'sonner';
import { fetchClinicianDetails } from '../../services/agencyAdminService';
import { supabaseClient } from '../../lib/supabase';
import jsPDF from 'jspdf';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone_number?: string;
  chart_count: number;
  last_chart_date?: string;
  status?: 'active' | 'inactive';
}

interface Chart {
  id: string;
  patients: {
    first_name: string;
    last_name: string;
  };
  status: string;
  chart_type: string;
  created_at: string;
  medication_count: number;
}

interface Clinician {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
}

interface Props {
  clinicianId: string;
  onBack: () => void;
  navigation: any;
}

export default function ClinicianDetailView({ clinicianId, onBack, navigation }: Props) {
  const [selectedTab, setSelectedTab] = useState<'patients' | 'charts'>('patients');
  const [loading, setLoading] = useState(true);
  const [clinician, setClinician] = useState<Clinician | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [stats, setStats] = useState({
    patient_count: 0,
    chart_count: 0,
    pending_count: 0,
    verified_count: 0,
    active_patient_count: 0,
  });
  
  // Patient detail modal state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientCharts, setPatientCharts] = useState<any[]>([]);
  const [loadingPatientDetails, setLoadingPatientDetails] = useState(false);

  useEffect(() => {
    loadClinicianDetails();
  }, [clinicianId]);

  const loadClinicianDetails = async () => {
    try {
      setLoading(true);
      const data = await fetchClinicianDetails(clinicianId);
      setClinician(data.clinician);
      setPatients(data.patients);
      setCharts(data.charts);
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading clinician details:', error);
      toast.error('Failed to load clinician details');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (patient: Patient) => {
    const parts = [
      patient.address_line1,
      patient.address_line2,
      patient.city,
      patient.state,
      patient.zip_code,
    ].filter(Boolean);
    return parts.join(', ') || 'No address on file';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified':
        return 'bg-[#D1FAE5] text-[#10B981] border-[#A7F3D0]';
      case 'pending_review':
      case 'pending review':
        return 'bg-[#FEF3C7] text-[#F59E0B] border-[#FDE68A]';
      case 'active':
        return 'bg-[#DBEAFE] text-[#0966CC] border-[#BFDBFE]';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleViewPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setLoadingPatientDetails(true);
    
    try {
      // Fetch charts for this patient
      const { data: chartsData, error } = await supabaseClient
        .from('charts')
        .select(`
          id,
          status,
          source,
          created_at,
          finalized_at,
          medications (count)
        `)
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to include medication count
      const transformedCharts = await Promise.all(
        (chartsData || []).map(async (chart: any) => {
          const { count: medicationCount } = await supabaseClient
            .from('medications')
            .select('*', { count: 'exact', head: true })
            .eq('chart_id', chart.id);

          return {
            ...chart,
            medication_count: medicationCount || 0,
          };
        })
      );

      setPatientCharts(transformedCharts);
    } catch (error) {
      console.error('Error loading patient charts:', error);
      toast.error('Failed to load patient charts');
    } finally {
      setLoadingPatientDetails(false);
    }
  };

  const handleDownloadPatientPDF = async () => {
    if (!selectedPatient) return;

    try {
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      const margin = 48;
      const pageW = doc.internal.pageSize.getWidth();
      let y = margin;

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Patient Information', margin, y); y += 30;

      // Patient Details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Name: ${selectedPatient.first_name} ${selectedPatient.last_name}`, margin, y); y += 16;
      doc.text(`Date of Birth: ${selectedPatient.date_of_birth ? new Date(selectedPatient.date_of_birth).toLocaleDateString() : 'N/A'}`, margin, y); y += 16;
      doc.text(`Phone: ${selectedPatient.phone_number || 'N/A'}`, margin, y); y += 16;
      doc.text(`Address: ${formatAddress(selectedPatient)}`, margin, y); y += 16;
      doc.text(`Total Charts: ${patientCharts.length}`, margin, y); y += 30;

      // Charts Section
      if (patientCharts.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('Charts', margin, y); y += 20;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        patientCharts.forEach((chart, index) => {
          doc.text(`${index + 1}. ${formatStatus(chart.status)} - ${chart.medication_count} medications`, margin + 10, y); y += 14;
          doc.text(`   Created: ${new Date(chart.created_at).toLocaleDateString()}`, margin + 10, y); y += 14;
          if (chart.finalized_at) {
            doc.text(`   Finalized: ${new Date(chart.finalized_at).toLocaleDateString()}`, margin + 10, y); y += 14;
          }
          y += 8;
        });
      }

      doc.save(`patient-${selectedPatient.first_name}-${selectedPatient.last_name}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[#10B981] mx-auto mb-2" />
          <p className="text-sm text-[#64748b]">Loading clinician details...</p>
        </div>
      </div>
    );
  }

  if (!clinician) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-lg text-[#0f172a]">Clinician not found</p>
        <Button onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const clinicianName = `${clinician.first_name} ${clinician.last_name}`;
  const clinicianInitials = `${clinician.first_name[0]}${clinician.last_name[0]}`;

  return (
    <div className="space-y-6 pb-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={onBack}
          className="rounded-xl border-2 border-[#e2e8f0] hover:bg-[#D1FAE5] hover:border-[#10B981]"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl text-[#0f172a] font-semibold">Clinician Profile</h2>
          <p className="text-sm text-[#64748b]">View details and assigned patients</p>
        </div>
      </div>

      {/* Clinician Profile Card */}
      <div className="bg-gradient-to-br from-[#10B981] to-[#059669] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20 border-4 border-white/30">
              <AvatarFallback className="bg-white text-[#10B981] text-xl font-semibold">
                {clinicianInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-2xl font-semibold mb-2">{clinicianName}</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <Mail className="w-4 h-4" />
                  <span>{clinician.email}</span>
                </div>
                {clinician.phone_number && (
                  <div className="flex items-center gap-2 text-sm text-white/90">
                    <Phone className="w-4 h-4" />
                    <span>{clinician.phone_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-0">
            Active
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
          <div>
            <p className="text-xs text-white/70 mb-1">Patients</p>
            <p className="text-2xl font-semibold">{stats.patient_count}</p>
          </div>
          <div>
            <p className="text-xs text-white/70 mb-1">Total Charts</p>
            <p className="text-2xl font-semibold">{stats.chart_count}</p>
          </div>
          <div>
            <p className="text-xs text-white/70 mb-1">Pending Review</p>
            <p className="text-2xl font-semibold">{stats.pending_count}</p>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-l-4 border-l-[#10B981]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#64748b]">Active Patients</p>
            <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
          </div>
          <p className="text-2xl text-[#0f172a] font-semibold">{stats.active_patient_count}</p>
          <p className="text-xs text-[#10B981] mt-1">Currently assigned</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-[#F59E0B]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#64748b]">Pending Charts</p>
            <Clock className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <p className="text-2xl text-[#0f172a] font-semibold">{stats.pending_count}</p>
          <p className="text-xs text-[#64748b] mt-1">Awaiting review</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-[#0966CC]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#64748b]">Verified Charts</p>
            <TrendingUp className="w-5 h-5 text-[#0966CC]" />
          </div>
          <p className="text-2xl text-[#0f172a] font-semibold">{stats.verified_count}</p>
          <p className="text-xs text-[#10B981] mt-1">Ready to deliver</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setSelectedTab('patients')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            selectedTab === 'patients'
              ? 'border-[#10B981] text-[#10B981]'
              : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Assigned Patients ({patients.length})
          </div>
        </button>
        <button
          onClick={() => setSelectedTab('charts')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            selectedTab === 'charts'
              ? 'border-[#10B981] text-[#10B981]'
              : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Recent Charts ({charts.length})
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {selectedTab === 'patients' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#0f172a]">Assigned Patients</h3>
            <Badge variant="outline" className="text-xs">
              {patients.length} total
            </Badge>
          </div>

          {patients.map((patient) => {
            const patientName = `${patient.first_name} ${patient.last_name}`;
            const patientInitials = `${patient.first_name[0]}${patient.last_name[0]}`;
            
            return (
              <Card key={patient.id} className="p-5 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-[#D1FAE5] text-[#10B981]">
                          {patientInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="text-lg text-[#0f172a] font-medium">{patientName}</h4>
                        <Badge
                          variant="outline"
                          className={
                            patient.status === 'active'
                              ? 'border-[#10B981] text-[#10B981] text-xs'
                              : 'border-[#64748b] text-[#64748b] text-xs'
                          }
                        >
                          {patient.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-[#64748b]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs">DOB: {new Date(patient.date_of_birth).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      {patient.phone_number && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span className="text-xs">{patient.phone_number}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="text-xs">{patient.chart_count} chart{patient.chart_count !== 1 ? 's' : ''}</span>
                      </div>
                      {patient.last_chart_date && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs">Last: {new Date(patient.last_chart_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs text-[#64748b] flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {formatAddress(patient)}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewPatient(patient)}
                    className="border-[#10B981] text-[#10B981] hover:bg-[#D1FAE5]"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </div>
              </Card>
            );
          })}

          {patients.length === 0 && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 mb-1">No patients assigned</p>
              <p className="text-sm text-slate-400">This clinician has no assigned patients yet</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#0f172a]">Recent Charts</h3>
            <Badge variant="outline" className="text-xs">
              {charts.length} total
            </Badge>
          </div>

          {charts.map((chart) => {
            const patientName = `${chart.patients.first_name} ${chart.patients.last_name}`;
            
            return (
              <Card key={chart.id} className="p-5 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg text-[#0f172a] font-medium">{patientName}</h4>
                      <Badge className={getStatusBadgeClass(chart.status)}>
                        {chart.status === 'verified' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {(chart.status === 'pending_review' || chart.status === 'pending review') && <Clock className="w-3 h-3 mr-1" />}
                        {chart.status === 'active' && <Activity className="w-3 h-3 mr-1" />}
                        {formatStatus(chart.status)}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-[#64748b]">
                      <span>{chart.chart_type || 'Standard'}</span>
                      <span>•</span>
                      <span>{chart.medication_count} medication{chart.medication_count !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>Created {new Date(chart.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigation.navigate('ChartDetailView', { chartId: chart.id, patientName, mode: 'review' })}
                    className="border-[#10B981] text-[#10B981] hover:bg-[#D1FAE5]"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Review
                  </Button>
                </div>
              </Card>
            );
          })}

          {charts.length === 0 && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 mb-1">No charts found</p>
              <p className="text-sm text-slate-400">This clinician hasn't created any charts yet</p>
            </div>
          )}
        </div>
      )}
      
      {/* Patient Detail Modal */}
      <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedPatient?.first_name} {selectedPatient?.last_name}
            </DialogTitle>
            <DialogDescription>
              Patient information and chart history
            </DialogDescription>
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-6">
              {/* Patient Information */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-sm text-slate-700 mb-3">Patient Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Date of Birth</p>
                    <p className="text-slate-900 font-medium">
                      {selectedPatient.date_of_birth 
                        ? new Date(selectedPatient.date_of_birth).toLocaleDateString() 
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Phone</p>
                    <p className="text-slate-900 font-medium">{selectedPatient.phone_number || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500 text-xs">Address</p>
                    <p className="text-slate-900 font-medium">{formatAddress(selectedPatient)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Total Charts</p>
                    <p className="text-slate-900 font-medium">{patientCharts.length}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Last Chart</p>
                    <p className="text-slate-900 font-medium">
                      {selectedPatient.last_chart_date 
                        ? new Date(selectedPatient.last_chart_date).toLocaleDateString() 
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Charts List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-slate-700">Charts ({patientCharts.length})</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPatientPDF}
                    className="text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export PDF
                  </Button>
                </div>

                {loadingPatientDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#10B981]" />
                  </div>
                ) : patientCharts.length === 0 ? (
                  <div className="bg-slate-50 rounded-lg p-8 text-center">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No charts found</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {patientCharts.map((chart: any) => (
                      <Card key={chart.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getStatusBadgeClass(chart.status)}>
                                {formatStatus(chart.status)}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {chart.medication_count} medication{chart.medication_count !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="text-sm text-slate-600 space-y-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                <span>Created: {new Date(chart.created_at).toLocaleDateString()}</span>
                              </div>
                              {chart.finalized_at && (
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                                  <span>Finalized: {new Date(chart.finalized_at).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPatient(null);
                              // Navigate to chart detail if navigation is available
                              navigation?.navigate?.('ChartDetailView', { chartId: chart.id });
                            }}
                            className="text-xs"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Chart
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}