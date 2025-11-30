import React from 'react';
import { ArrowLeft, User, MapPin, Phone, Calendar, Pill, ChevronRight, Check, Save, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Screen, NavigationParams } from '../../App';
import { supabaseClient } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { uploadDocument } from '../../services/documentService';

const scanTypeToSource = (
  scanType?: string
): 'bottle_scan' | 'pdf_import' | 'image_upload' | 'empty_chart' => {
  switch (scanType) {
    case 'Barcode Scan':
      return 'bottle_scan';
    case 'Import PDF':
      return 'pdf_import';
    case 'Bottle OCR':
      return 'image_upload';
    // if scanType is undefined or 'Manual' or anything else,
    // treat it as a normal empty chart:
    default:
      return 'empty_chart';
  }
};



interface Props {
  navigation: {
    navigate: (screen: Screen, params?: NavigationParams) => void;
    goBack: () => void;
  };
  route: {
    params: NavigationParams;
  };
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
}

export default function NewPatientChartReview({ navigation, route }: Props) {
  // Explicitly typed `patient` to match the expected schema

  const { user } = useAuth();    // app user with id + tenant_id

  const scanType = route.params?.scanType as string | undefined;
  const patient: {
  first_name: string;
  last_name: string;
  dob: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip_code: string;
  notes: string;
} = route.params?.patient || {
  first_name: '',
  last_name: '',
  dob: '',
  phone: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zip_code: '',
  notes: '',
};
  const medications: Medication[] = route.params?.medications || [];
  const attachments: File[] = route.params?.attachments || [];


  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleEditPatientInfo = () => {
    // Navigate back to step 1
    navigation.goBack();
    navigation.goBack();
  };

  const handleEditMedications = () => {
    // Navigate back to step 2
    navigation.goBack();
  };

   const handleSaveChart = async () => {
    if (!user?.id || !user?.tenant_id) {
      alert('Missing clinician or tenant information. Please sign in again.');
      return;
    }

    try {
      // 1) Check if patient already exists (by first name, last name, and DOB)
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
            created_at,
            medication_count
          )
        `)
        .eq('tenant_id', user.tenant_id)
        .eq('first_name', patient.first_name)
        .eq('last_name', patient.last_name)
        .eq('date_of_birth', patient.dob);

      if (searchError) {
        console.error('Error searching for existing patient:', searchError);
        alert('Failed to check for existing patient. Please try again.');
        return;
      }

      let patientId: string;
      let chartId: string | null = null;
      let isNewPatient = false;
      let existingChartFound = false;

      if (existingPatients && existingPatients.length > 0) {
        const existingPatient = existingPatients[0];
        patientId = existingPatient.id;
        
        // Check if patient already has a chart
        if (existingPatient.charts && existingPatient.charts.length > 0) {
          // Patient already has a chart - use existing chart
          const existingChart = existingPatient.charts[0];
          chartId = existingChart.id;
          existingChartFound = true;
          console.log(`Patient already has a chart: ${patient.first_name} ${patient.last_name} (Chart ID: ${chartId})`);
          
          // Navigate to existing chart instead of creating new one
          alert(`This patient already has an existing chart. You will be redirected to add medications to that chart.`);
          
          navigation.navigate('ChartDetail', {
            chartId: chartId,
            patientId: patientId,
          });
          return;
        }
        
        console.log(`Using existing patient (no chart yet): ${patient.first_name} ${patient.last_name} (ID: ${patientId})`);
      } else {
        // Create new patient
        const { data: patientRow, error: patientError } = await supabaseClient
          .from('patients')
          .insert({
            tenant_id: user.tenant_id,
            first_name: patient.first_name,
            last_name: patient.last_name,
            date_of_birth: patient.dob,
            address_line1: patient.address1,
            address_line2: patient.address2 || null,
            city: patient.city || null,
            state: patient.state || null,
            zip_code: patient.zip_code || null,
            phone: patient.phone || null,
            created_by: user.id,
            assigned_clinician_id: user.id,
          })
          .select('id')
          .single();

        if (patientError || !patientRow) {
          console.error('Error inserting patient:', patientError);
          alert('Failed to save patient. Please try again.');
          return;
        }

        patientId = patientRow.id as string;
        isNewPatient = true;
        console.log(`Created new patient: ${patient.first_name} ${patient.last_name} (ID: ${patientId})`);
      }

      // 2) Insert chart for this patient (only if no existing chart found)
      const source = scanTypeToSource(scanType);

      const { data: chartRow, error: chartError } = await supabaseClient
        .from('charts')
        .insert({
          tenant_id: user.tenant_id,
          patient_id: patientId,
          status: 'active',
          source,
          created_by: user.id,
          medication_count: medications.length || null,
        })
        .select('id')
        .single();

      if (chartError || !chartRow) {
        console.error('Error inserting chart:', chartError);
        alert('Failed to create chart. Please try again.');
        return;
      }

      chartId = chartRow.id as string;
      console.log(`Created new chart (ID: ${chartId}) for patient ${patientId}`);
      
      //insert medications
      if (medications.length > 0) {
      const medsPayload = medications.map((med) => ({
        tenant_id: user.tenant_id,
        chart_id: chartId,
        drug_name: med.name,
        strength: med.dosage,
        route: med.route,
        frequency: med.frequency,
        prescriber: 'Unknown',        // or let them pick later
        instructions: null,
        notes: null,
        scanned_on: new Date().toISOString(),
        ocr_confidence: null,
        verified: false,              // they still need to verify in ChartDetail
        changed_after_verify: false,
      }));

      const { error: medsError } = await supabaseClient
        .from('medications')
        .insert(medsPayload);

      if (medsError) throw medsError;
    }

    // 4) Upload any attachments for this chart  👈 NEW
  if (attachments && attachments.length > 0) {
    await Promise.all(
      attachments.map((file) =>
        uploadDocument(file, chartId, user.tenant_id)
      )
    );
  }


      // 3) Navigate to completion screen with IDs
      navigation.navigate('NewPatientChartComplete', {
        patient,      // keep using the UI patient object for display
        patientId,
        chartId,
        isNewPatient,  // Pass this flag so we can inform the user
        existingChartFound,
      });
    } catch (err) {
      console.error('Unexpected error when saving chart:', err);
      alert('An unexpected error occurred. Please try again.');
    }
  };


  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not provided';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const calculateAge = (dateString: string) => {
    if (!dateString) return null;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

   return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0966CC] to-[#0C4A6E] p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={handleGoBack}
            className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg text-white">New Patient Chart</h1>
          <button
            onClick={() => navigation.navigate('ClinicianDashboard')}
            className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 flex items-center gap-2 transition-colors text-white text-sm font-medium"
            aria-label="Exit to dashboard"
          >
            <X className="w-4 h-4" />
            Exit
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          
          {/* Context Bar */}
          <div className="bg-white rounded-2xl border border-sky-200 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h2 className="text-slate-900 mb-1">Review Patient Chart</h2>
                <p className="text-sm text-slate-600">Verify all information before saving to system</p>
              </div>
            </div>
          </div>

          {/* Patient Information Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-sky-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Patient Information
                </h3>
              </div>
              <button
                onClick={handleEditPatientInfo}
                className="text-sm text-sky-600 hover:text-sky-700 font-medium"
              >
                Edit
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Name and Age */}
              <div>
                <h4 className="text-2xl text-slate-900 font-semibold">
                  {patient.first_name} {patient.last_name}
                </h4>
                {patient.dob && (
                  <p className="text-slate-600 mt-1">
                    Age {calculateAge(patient.dob)} • DOB: {formatDate(patient.dob)}
                  </p>
                )}
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-200">
                {patient.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Phone</p>
                      <p className="text-slate-900">{patient.phone}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Address</p>
                    <p className="text-slate-900">{patient.address1}</p>
                    {patient.address2 && <p className="text-slate-900">{patient.address2}</p>}
                    <p className="text-slate-900">
                      {patient.city}, {patient.state} {patient.zip_code}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {patient.notes && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Clinical Notes</p>
                  <p className="text-slate-700 bg-slate-50 rounded-lg p-4">{patient.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Medications Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                  <Pill className="w-5 h-5 text-sky-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Current Medications
                </h3>
              </div>
              <button
                onClick={handleEditMedications}
                className="text-sm text-sky-600 hover:text-sky-700 font-medium"
              >
                Edit
              </button>
            </div>

            {medications.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {medications.map((med, index) => (
                  <div key={med.id} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-sky-600">{index + 1}</span>
                      </div>
                      <div className="flex-1 space-y-2">
                        <h4 className="text-slate-900 font-medium">{med.name}</h4>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-slate-500">Dosage:</span>
                            <p className="text-slate-700 font-medium">{med.dosage}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Frequency:</span>
                            <p className="text-slate-700 font-medium">{med.frequency}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Route:</span>
                            <p className="text-slate-700 font-medium">{med.route}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-slate-500">No medications added</p>
                <button
                  onClick={handleEditMedications}
                  className="text-sm text-sky-600 hover:text-sky-700 font-medium mt-2"
                >
                  Add medications
                </button>
              </div>
            )}
          </div>

          {/* Confirmation Notice */}
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-sky-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div>
                <h4 className="text-slate-900 font-medium mb-1">Ready to Save?</h4>
                <p className="text-sm text-slate-600">
                  Once saved, this patient chart will be created in the system. You can edit details later from the patient list.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="flex-1 h-12 rounded-xl border-2 border-slate-300 hover:bg-slate-50 text-slate-700 font-medium"
            >
              Back to Medications
            </Button>
            <Button
              onClick={handleSaveChart}
              className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Patient Chart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
