import { supabaseClient } from '../lib/supabase';

// Types
export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  tenant_id: string;
  created_at: string;
  created_by: string;
  assigned_clinician_id?: string;
}

export interface Chart {
  id: string;
  patient_id: string;
  status: 'active' | 'verified_ready' | 'needs_reverification' | 'delivered_locked' | 'archived';
  source: 'bottle_scan' | 'pdf_import' | 'image_upload' | 'empty_chart';
  created_at: string;
  created_by: string;
  awaiting_clinician_review: boolean;
  assigned_to?: string; // Note: This column may need to be added to the database
  finalized_at?: string;
  finalized_by?: string;
  medication_count?: number;
  document_count?: number;
}

export interface ChartWithPatient extends Chart {
  patient: Patient;
  assigned_clinician?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface Clinician {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  active_chart_count: number;
}

export interface CreatePatientData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
}

export interface CreateChartData {
  patient_id: string;
  source: Chart['source'];
  status?: Chart['status'];
}

// Fetch all patients in the scheduler's tenant
export async function fetchAllPatients(tenantId: string) {
  const { data, error } = await supabaseClient
    .from('patients')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Patient[];
}

// Fetch all charts in the scheduler's tenant with patient info
export async function fetchAllCharts(tenantId: string, includeArchived: boolean = false) {
  let query = supabaseClient
    .from('charts')
    .select(`
      *,
      patient:patients!charts_patient_id_fkey (
        id,
        first_name,
        last_name,
        date_of_birth,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        phone,
        email,
        assigned_clinician_id,
        assigned_clinician:users!patients_assigned_clinician_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      )
    `)
    .eq('tenant_id', tenantId);

  if (!includeArchived) {
    query = query.neq('status', 'archived');
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  // Get medication and document counts separately for each chart
  const chartsWithCounts = await Promise.all(
    (data || []).map(async (chart: any) => {
      const [{ count: medCount }, { count: docCount }] = await Promise.all([
        supabaseClient.from('medications').select('id', { count: 'exact', head: true }).eq('chart_id', chart.id),
        supabaseClient.from('documents').select('id', { count: 'exact', head: true }).eq('chart_id', chart.id),
      ]);
      
      return {
        ...chart,
        medication_count: medCount || 0,
        document_count: docCount || 0,
        assigned_clinician: chart.patient?.assigned_clinician,
      };
    })
  );

  return chartsWithCounts as ChartWithPatient[];
}

// Fetch charts that need assignment
export async function fetchUnassignedCharts(tenantId: string) {
  const { data, error } = await supabaseClient
    .from('charts')
    .select(`
      *,
      patient:patients!charts_patient_id_fkey (
        id,
        first_name,
        last_name,
        date_of_birth,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        phone,
        email,
        assigned_clinician_id
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('awaiting_clinician_review', false)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Get document counts separately
  const chartsWithCounts = await Promise.all(
    (data || []).map(async (chart: any) => {
      const { count: docCount } = await supabaseClient
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('chart_id', chart.id);
      
      return {
        ...chart,
        document_count: docCount || 0,
      };
    })
  );

  return chartsWithCounts as ChartWithPatient[];
}

// Fetch all active clinicians in the tenant
export async function fetchClinicians(tenantId: string) {
  // First get clinicians
  const { data: cliniciansData, error: cliniciansError } = await supabaseClient
    .from('users')
    .select('id, first_name, last_name, email, role, active')
    .eq('tenant_id', tenantId)
    .eq('role', 'clinician')
    .eq('active', true)
    .order('last_name', { ascending: true });

  if (cliniciansError) {
    console.error('Error fetching clinicians:', cliniciansError);
    throw cliniciansError;
  }

  console.log('Fetched clinicians:', cliniciansData);

  if (!cliniciansData || cliniciansData.length === 0) {
    console.warn('No clinicians found for tenant:', tenantId);
    return [];
  }

  // Then get chart counts for each clinician from patients table
  const cliniciansWithCounts = await Promise.all(
    (cliniciansData || []).map(async (clinician: any) => {
      const { count, error: countError } = await supabaseClient
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('assigned_clinician_id', clinician.id);

      if (countError) {
        console.error('Error counting charts for clinician:', clinician.id, countError);
      }

      return {
        id: clinician.id,
        first_name: clinician.first_name,
        last_name: clinician.last_name,
        email: clinician.email,
        active_chart_count: count || 0,
      };
    })
  );

  return cliniciansWithCounts as Clinician[];
}

// Find existing patient by name and DOB with their chart
export async function findExistingPatientWithChart(
  firstName: string,
  lastName: string,
  dateOfBirth: string,
  tenantId: string
) {
  const { data, error } = await supabaseClient
    .from('patients')
    .select(`
      *,
      charts (
        id,
        status,
        source,
        created_at,
        created_by,
        medication_count
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('first_name', firstName)
    .eq('last_name', lastName)
    .eq('date_of_birth', dateOfBirth)
    .maybeSingle();

  if (error) throw error;
  return data as (Patient & { charts?: any[] }) | null;
}

// Find existing patient by name and DOB
export async function findExistingPatient(
  firstName: string,
  lastName: string,
  dateOfBirth: string,
  tenantId: string
) {
  const { data, error } = await supabaseClient
    .from('patients')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('first_name', firstName)
    .eq('last_name', lastName)
    .eq('date_of_birth', dateOfBirth)
    .maybeSingle();

  if (error) throw error;
  return data as Patient | null;
}

// Create a new patient
export async function createPatient(patientData: CreatePatientData, tenantId: string, createdBy: string) {
  const { data, error } = await supabaseClient
    .from('patients')
    .insert({
      ...patientData,
      tenant_id: tenantId,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Patient;
}

// Create a new chart
export async function createChart(chartData: CreateChartData, tenantId: string, createdBy: string) {
  const { data, error } = await supabaseClient
    .from('charts')
    .insert({
      ...chartData,
      tenant_id: tenantId,
      created_by: createdBy,
      status: chartData.status || 'needs_assignment',
    })
    .select(`
      *,
      patient:patients!charts_patient_id_fkey (
        id,
        first_name,
        last_name,
        date_of_birth,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        phone,
        email
      )
    `)
    .single();

  if (error) throw error;
  return data as ChartWithPatient;
}

// Create a patient and empty chart in one transaction
// If patient already exists with a chart, returns existing chart
export async function createPatientWithChart(
  patientData: CreatePatientData,
  tenantId: string,
  createdBy: string
) {
  // Check if patient already exists with their charts
  const existingPatientWithChart = await findExistingPatientWithChart(
    patientData.first_name,
    patientData.last_name,
    patientData.date_of_birth,
    tenantId
  );

  if (existingPatientWithChart && existingPatientWithChart.charts && existingPatientWithChart.charts.length > 0) {
    // Patient already has a chart - return existing patient and chart
    const existingChart = existingPatientWithChart.charts[0];
    console.log(`Patient already has a chart: ${existingPatientWithChart.first_name} ${existingPatientWithChart.last_name} (Chart ID: ${existingChart.id})`);
    
    // Fetch full chart details
    const { data: fullChart, error: chartError } = await supabaseClient
      .from('charts')
      .select(`
        *,
        patient:patients!charts_patient_id_fkey (
          id,
          first_name,
          last_name,
          date_of_birth,
          address_line1,
          address_line2,
          city,
          state,
          zip_code,
          phone,
          email
        )
      `)
      .eq('id', existingChart.id)
      .single();

    if (chartError) throw chartError;

    return { 
      patient: existingPatientWithChart as Patient, 
      chart: fullChart as ChartWithPatient, 
      isNewPatient: false,
      existingChartFound: true
    };
  }

  let patient: Patient;
  let isNewPatient = false;

  if (existingPatientWithChart) {
    // Patient exists but has no chart yet
    patient = existingPatientWithChart as Patient;
    console.log(`Using existing patient (no chart): ${patient.first_name} ${patient.last_name} (ID: ${patient.id})`);
  } else {
    // Create new patient
    patient = await createPatient(patientData, tenantId, createdBy);
    isNewPatient = true;
    console.log(`Created new patient: ${patient.first_name} ${patient.last_name} (ID: ${patient.id})`);
  }

  // Create the first chart for this patient
  const chart = await createChart(
    {
      patient_id: patient.id,
      source: 'empty_chart',
      status: 'active',
    },
    tenantId,
    createdBy
  );

  return { patient, chart, isNewPatient, existingChartFound: false };
}

// Assign a chart to a clinician
export async function assignChart(chartId: string, clinicianId: string) {
  // First get the chart to get patient_id
  const { data: chart, error: chartError } = await supabaseClient
    .from('charts')
    .select('patient_id')
    .eq('id', chartId)
    .single();

  if (chartError) throw chartError;

  // Update the chart to mark it as awaiting review (keep status as 'active')
  const { error: updateChartError } = await supabaseClient
    .from('charts')
    .update({
      awaiting_clinician_review: true,
    })
    .eq('id', chartId);

  if (updateChartError) throw updateChartError;

  // Update the patient's assigned clinician
  const { data: updatedPatient, error: updatePatientError } = await supabaseClient
    .from('patients')
    .update({ assigned_clinician_id: clinicianId })
    .eq('id', chart.patient_id)
    .select();

  if (updatePatientError) throw updatePatientError;
  
  if (!updatedPatient || updatedPatient.length === 0) {
    throw new Error('Failed to update patient assignment. Please check Row Level Security policies for the patients table.');
  }

  // Fetch and return the updated chart with patient info
  const { data, error } = await supabaseClient
    .from('charts')
    .select(`
      *,
      patient:patients!charts_patient_id_fkey (
        id,
        first_name,
        last_name,
        date_of_birth,
        phone,
        email,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        assigned_clinician_id,
        assigned_clinician:users!patients_assigned_clinician_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      )
    `)
    .eq('id', chartId)
    .single();

  if (error) throw error;
  return data as ChartWithPatient;
}

// Reassign a chart to a different clinician
export async function reassignChart(chartId: string, newClinicianId: string) {
  return assignChart(chartId, newClinicianId);
}

// Unassign a chart from a clinician
export async function unassignChart(chartId: string) {
  // Get the chart to get patient_id
  const { data: chart, error: chartError } = await supabaseClient
    .from('charts')
    .select('patient_id')
    .eq('id', chartId)
    .single();

  if (chartError) throw chartError;

  // Update chart
  const { error: updateChartError } = await supabaseClient
    .from('charts')
    .update({
      awaiting_clinician_review: false,
      status: 'active',
    })
    .eq('id', chartId);

  if (updateChartError) throw updateChartError;

  // Update patient to remove clinician assignment
  const { error: updatePatientError } = await supabaseClient
    .from('patients')
    .update({ assigned_clinician_id: null })
    .eq('id', chart.patient_id);

  if (updatePatientError) throw updatePatientError;

  // Fetch and return the updated chart
  const { data, error } = await supabaseClient
    .from('charts')
    .select(`
      *,
      patient:patients!charts_patient_id_fkey (
        id,
        first_name,
        last_name,
        date_of_birth
      )
    `)
    .eq('id', chartId)
    .single();

  if (error) throw error;
  return data as ChartWithPatient;
}

// Get dashboard statistics
export async function getDashboardStats(tenantId: string) {
  // Get total patients
  const { count: totalPatients, error: patientsError } = await supabaseClient
    .from('patients')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  if (patientsError) throw patientsError;

  // Get total charts (excluding archived)
  const { count: totalCharts, error: chartsError } = await supabaseClient
    .from('charts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .neq('status', 'archived');

  if (chartsError) throw chartsError;

  // Get unassigned charts (not awaiting review)
  const { count: unassignedCharts, error: unassignedError } = await supabaseClient
    .from('charts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('awaiting_clinician_review', false)
    .eq('status', 'active');

  if (unassignedError) throw unassignedError;

  // Get charts with documents pending
  const { data: chartsWithDocs, error: docsError } = await supabaseClient
    .from('charts')
    .select('id, documents(id)')
    .eq('tenant_id', tenantId)
    .neq('status', 'archived')
    .neq('status', 'delivered_locked');

  if (docsError) throw docsError;

  const chartsWithDocuments = (chartsWithDocs || []).filter(
    (chart: any) => chart.documents && chart.documents.length > 0
  ).length;

  // Get new docs today (approximation - you may want to add a created_at filter)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: newDocsToday, error: newDocsError } = await supabaseClient
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', today.toISOString());

  if (newDocsError) throw newDocsError;

  return {
    totalPatients: totalPatients || 0,
    totalCharts: totalCharts || 0,
    unassignedCharts: unassignedCharts || 0,
    chartsWithDocuments,
    newDocsToday: newDocsToday || 0,
  };
}

// Search patients by name
export async function searchPatients(tenantId: string, searchQuery: string) {
  const { data, error } = await supabaseClient
    .from('patients')
    .select('*')
    .eq('tenant_id', tenantId)
    .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
    .order('last_name', { ascending: true })
    .limit(10);

  if (error) throw error;
  return data as Patient[];
}

// Get chart details with documents
export async function getChartWithDocuments(chartId: string) {
  const { data, error } = await supabaseClient
    .from('charts')
    .select(`
      *,
      patient:patients!charts_patient_id_fkey (
        id,
        first_name,
        last_name,
        date_of_birth,
        address_line1,
        address_line2,
        city,
        state,
        zip_code,
        phone,
        email,
        assigned_clinician_id,
        assigned_clinician:users!patients_assigned_clinician_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      )
    `)
    .eq('id', chartId)
    .single();

  if (error) throw error;

  // Get documents and medications separately
  const [{ data: documents }, { data: medications }] = await Promise.all([
    supabaseClient
      .from('documents')
      .select(`
        id,
        file_name,
        file_type,
        file_url,
        created_at,
        uploaded_by:users!documents_uploaded_by_fkey (
          first_name,
          last_name
        )
      `)
      .eq('chart_id', chartId),
    supabaseClient
      .from('medications')
      .select('id')
      .eq('chart_id', chartId),
  ]);

  return {
    ...data,
    documents: documents || [],
    medication_count: medications?.length || 0,
    document_count: documents?.length || 0,
    assigned_clinician: data.patient?.assigned_clinician,
  };
}
