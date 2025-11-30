import { supabaseClient } from '../lib/supabase';

// Types
export interface ChartReviewNote {
  id: string;
  chart_id: string;
  note: string;
  created_by: string;
  created_at: string;
  reviewer?: {
    first_name: string;
    last_name: string;
  };
}

export interface ChartReviewAction {
  chart_id: string;
  action: 'approve' | 'reject' | 'request_changes';
  notes?: string;
  reviewer_id: string;
}

export interface UserActivationData {
  user_id: string;
  active: boolean;
  updated_by: string;
}

export interface OnboardingData {
  email: string;
  first_name: string;
  last_name: string;
  role: 'clinician' | 'scheduler';
  tenant_id: string;
  created_by: string;
  phone?: string;
}

// Fetch all charts for agency admin with full details
export async function fetchAllChartsForAdmin(tenantId: string) {
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
          email,
          role
        )
      ),
      created_by_user:users!charts_created_by_fkey (
        id,
        first_name,
        last_name,
        email,
        role
      ),
      finalized_by_user:users!charts_finalized_by_fkey (
        id,
        first_name,
        last_name
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get medication and document counts for each chart
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
      };
    })
  );

  return chartsWithCounts;
}

// Fetch all users in the organization
export async function fetchAllUsers(tenantId: string) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get chart counts for each clinician
  const usersWithCounts = await Promise.all(
    (data || []).map(async (user: any) => {
      if (user.role === 'clinician') {
        const { count } = await supabaseClient
          .from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_clinician_id', user.id);
        
        return {
          ...user,
          assigned_chart_count: count || 0,
        };
      }
      return user;
    })
  );

  return usersWithCounts;
}

// Add review note to a chart
export async function addChartReviewNote(chartId: string, note: string, reviewerId: string) {
  const { data, error } = await supabaseClient
    .from('chart_review_notes')
    .insert({
      chart_id: chartId,
      note: note,
      created_by: reviewerId,
    })
    .select(`
      *,
      reviewer:users!chart_review_notes_created_by_fkey (
        first_name,
        last_name
      )
    `)
    .single();

  if (error) throw error;
  return data;
}

// Get all review notes for a chart
export async function getChartReviewNotes(chartId: string) {
  const { data, error } = await supabaseClient
    .from('chart_review_notes')
    .select(`
      *,
      reviewer:users!chart_review_notes_created_by_fkey (
        first_name,
        last_name,
        email
      )
    `)
    .eq('chart_id', chartId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Approve a chart (finalize it)
export async function approveChart(chartId: string, reviewerId: string) {
  // First, validate the chart can be approved
  const { data: chart, error: fetchError } = await supabaseClient
    .from('charts')
    .select('*, medications:medications(count)')
    .eq('id', chartId)
    .single();

  if (fetchError) throw fetchError;
  
  // Validate chart state
  if (!chart) {
    throw new Error('Chart not found');
  }
  
  // Check if chart already has finalized_at and finalized_by
  // If not, this might be a chart that was never properly finalized by clinician
  if (!chart.finalized_at || !chart.finalized_by) {
    throw new Error('Chart must be finalized by a clinician before it can be approved');
  }

  // Update chart status to delivered and lock it
  // Keep the original finalized_at/finalized_by from clinician, don't override
  const updatePayload: any = {
    status: 'delivered_locked',
    awaiting_clinician_review: false,
    delivered_by: reviewerId,
  };

  // Set first_delivered_at if not already set (required by charts_delivered_check constraint)
  if (!chart.first_delivered_at) {
    updatePayload.first_delivered_at = new Date().toISOString();
  }

  const { data, error } = await supabaseClient
    .from('charts')
    .update(updatePayload)
    .eq('id', chartId)
    .select()
    .single();

  if (error) throw error;

  // Add approval note
  await addChartReviewNote(chartId, 'Chart approved and finalized.', reviewerId);

  return data;
}

// Reject a chart and send back to clinician (needs reverification)
export async function rejectChart(chartId: string, notes: string, reviewerId: string) {
  // Add review note with rejection reason
  await addChartReviewNote(chartId, notes, reviewerId);

  // Update chart status to needs_reverification and unlock it
  const { data, error } = await supabaseClient
    .from('charts')
    .update({
      status: 'needs_reverification',
      awaiting_clinician_review: true,
      finalized_at: null, // Unlock the chart
      finalized_by: null,
    })
    .eq('id', chartId)
    .select()
    .single();

  if (error) throw error;
  
  return data;
}

// Request changes to a chart
export async function requestChartChanges(chartId: string, notes: string, reviewerId: string) {
  // Add review note
  await addChartReviewNote(chartId, notes, reviewerId);

  // Update chart status
  const { data, error } = await supabaseClient
    .from('charts')
    .update({
      status: 'needs_reverification',
      awaiting_clinician_review: true,
    })
    .eq('id', chartId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Toggle user active status
export async function toggleUserActiveStatus(userId: string, active: boolean, updatedBy: string) {
  const { data, error } = await supabaseClient
    .from('users')
    .update({
      active: active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Onboard new user (clinician or scheduler)
export async function onboardNewUser(userData: OnboardingData) {
  // Create user in auth system first
  const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
    email: userData.email,
    email_confirm: true,
    user_metadata: {
      first_name: userData.first_name,
      last_name: userData.last_name,
      role: userData.role,
    },
  });

  if (authError) throw authError;

  // Create user record in users table
  const { data, error } = await supabaseClient
    .from('users')
    .insert({
      id: authData.user.id,
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      role: userData.role,
      tenant_id: userData.tenant_id,
      phone: userData.phone,
      active: true,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get dashboard statistics for agency admin
export async function getAgencyAdminStats(tenantId: string) {
  // First get all patient IDs for this tenant
  const { data: patientIds } = await supabaseClient
    .from('patients')
    .select('id')
    .eq('tenant_id', tenantId);

  const patientIdList = patientIds?.map(p => p.id) || [];

  // If no patients, return zeros
  if (patientIdList.length === 0) {
    const [{ count: totalUsers }, { count: activeUsers }, { count: totalPatients }] = await Promise.all([
      supabaseClient.from('users').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabaseClient.from('users').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('active', true),
      supabaseClient.from('patients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    ]);

    return {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalCharts: 0,
      pendingReviewCharts: 0,
      needsReverificationCharts: 0,
      deliveredCharts: 0,
      totalPatients: totalPatients || 0,
    };
  }

  const [
    { count: totalUsers },
    { count: activeUsers },
    { count: totalCharts },
    { count: pendingReviewCharts },
    { count: needsReverificationCharts },
    { count: deliveredCharts },
    { count: totalPatients },
  ] = await Promise.all([
    supabaseClient.from('users').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabaseClient.from('users').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('active', true),
    supabaseClient.from('charts').select('id', { count: 'exact', head: true }).in('patient_id', patientIdList),
    supabaseClient.from('charts').select('id', { count: 'exact', head: true }).in('patient_id', patientIdList).eq('status', 'verified_ready'),
    supabaseClient.from('charts').select('id', { count: 'exact', head: true }).in('patient_id', patientIdList).eq('status', 'needs_reverification'),
    supabaseClient.from('charts').select('id', { count: 'exact', head: true }).in('patient_id', patientIdList).eq('status', 'delivered_locked'),
    supabaseClient.from('patients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
  ]);

  return {
    totalUsers: totalUsers || 0,
    activeUsers: activeUsers || 0,
    totalCharts: totalCharts || 0,
    pendingReviewCharts: pendingReviewCharts || 0,
    needsReverificationCharts: needsReverificationCharts || 0,
    deliveredCharts: deliveredCharts || 0,
    totalPatients: totalPatients || 0,
  };
}

// Get chart details with all related data for review
export async function getChartForReview(chartId: string) {
  const { data, error } = await supabaseClient
    .from('charts')
    .select(`
      *,
      patient:patients!charts_patient_id_fkey (
        *,
        assigned_clinician:users!patients_assigned_clinician_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      ),
      created_by_user:users!charts_created_by_fkey (
        first_name,
        last_name,
        email
      ),
      finalized_by_user:users!charts_finalized_by_fkey (
        first_name,
        last_name
      )
    `)
    .eq('id', chartId)
    .single();

  if (error) throw error;

  // Get medications, documents, and review notes
  const [
    { data: medications },
    { data: documents },
    reviewNotes
  ] = await Promise.all([
    supabaseClient.from('medications').select('*').eq('chart_id', chartId).order('created_at', { ascending: false }),
    supabaseClient.from('documents').select('*').eq('chart_id', chartId).order('created_at', { ascending: false }),
    getChartReviewNotes(chartId),
  ]);

  return {
    ...data,
    medications: medications || [],
    documents: documents || [],
    review_notes: reviewNotes,
  };
}

// Reassign chart to different clinician
export async function reassignChartToClinician(chartId: string, newClinicianId: string, adminId: string) {
  // Get chart to find patient
  const { data: chart, error: chartError } = await supabaseClient
    .from('charts')
    .select('patient_id')
    .eq('id', chartId)
    .single();

  if (chartError) throw chartError;

  // Update patient's assigned clinician
  const { data, error } = await supabaseClient
    .from('patients')
    .update({
      assigned_clinician_id: newClinicianId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', chart.patient_id)
    .select()
    .single();

  if (error) throw error;

  // Add note about reassignment
  await addChartReviewNote(
    chartId,
    `Chart reassigned to new clinician by admin`,
    adminId
  );

  return data;
}

// Bulk approve charts
export async function bulkApproveCharts(chartIds: string[], reviewerId: string) {
  const { data, error } = await supabaseClient
    .from('charts')
    .update({
      status: 'delivered_locked',
      finalized_at: new Date().toISOString(),
      finalized_by: reviewerId,
    })
    .in('id', chartIds)
    .select();

  if (error) throw error;
  return data;
}

// Archive chart
export async function archiveChart(chartId: string, adminId: string) {
  const { data, error } = await supabaseClient
    .from('charts')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('id', chartId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Fetch all patients for agency admin
export async function fetchAllPatients(tenantId: string) {
  try {
    // Fetch patients with explicit foreign key relationship
    const { data, error } = await supabaseClient
      .from('patients')
      .select(`
        *,
        assigned_clinician:users!patients_assigned_clinician_id_fkey (
          id,
          first_name,
          last_name,
          role
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching patients:', error);
      throw error;
    }
    
    // Fetch related charts and documents separately
    const patientsWithRelations = await Promise.all(
      (data || []).map(async (patient) => {
        try {
          // Get charts for this patient
          const chartsResult = await supabaseClient
            .from('charts')
            .select('id, status')
            .eq('patient_id', patient.id);
          
          const charts = chartsResult.data || [];
          const chartIds = charts.map(c => c.id);
          
          // Get documents for all charts of this patient
          let documents: any[] = [];
          if (chartIds.length > 0) {
            const docsResult = await supabaseClient
              .from('documents')
              .select('id, file_name, file_type, file_url, created_at')
              .in('chart_id', chartIds);
            
            documents = docsResult.data || [];
          }
          
          return {
            ...patient,
            charts,
            documents,
          };
        } catch (err) {
          console.warn(`Error fetching relations for patient ${patient.id}:`, err);
          return {
            ...patient,
            charts: [],
            documents: [],
          };
        }
      })
    );
    
    console.log('Fetched patients with relations:', patientsWithRelations);
    return patientsWithRelations;
  } catch (error) {
    console.error('Error in fetchAllPatients:', error);
    throw error;
  }
}

// Fetch detailed clinician information with patients and charts
export async function fetchClinicianDetails(clinicianId: string) {
  try {
    // Fetch clinician profile
    const { data: clinician, error: clinicianError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', clinicianId)
      .single();

    if (clinicianError) throw clinicianError;

    // Fetch assigned patients
    const { data: patients, error: patientsError } = await supabaseClient
      .from('patients')
      .select('*')
      .eq('assigned_clinician_id', clinicianId)
      .order('created_at', { ascending: false });

    if (patientsError) throw patientsError;

    // Fetch charts for each patient to get counts and last chart date
    const patientsWithCharts = await Promise.all(
      (patients || []).map(async (patient: any) => {
        const { data: charts, error: chartsError } = await supabaseClient
          .from('charts')
          .select('id, status, created_at')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false });

        if (chartsError) {
          console.warn(`Error fetching charts for patient ${patient.id}:`, chartsError);
          return {
            ...patient,
            chart_count: 0,
            last_chart_date: null,
            status: 'active',
          };
        }

        return {
          ...patient,
          chart_count: charts?.length || 0,
          last_chart_date: charts && charts.length > 0 ? charts[0].created_at : null,
          status: 'active',
        };
      })
    );

    // Fetch all charts created by this clinician
    const patientIds = patients?.map(p => p.id) || [];
    let allCharts = [];
    
    if (patientIds.length > 0) {
      const { data: charts, error: chartsError } = await supabaseClient
        .from('charts')
        .select(`
          id,
          status,
          chart_type,
          created_at,
          patient_id,
          patients!charts_patient_id_fkey (
            first_name,
            last_name
          )
        `)
        .in('patient_id', patientIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (chartsError) {
        console.warn('Error fetching clinician charts:', chartsError);
      } else {
        // Count medications for each chart
        allCharts = await Promise.all(
          (charts || []).map(async (chart: any) => {
            const { count } = await supabaseClient
              .from('chart_medications')
              .select('id', { count: 'exact', head: true })
              .eq('chart_id', chart.id);

            return {
              ...chart,
              medication_count: count || 0,
            };
          })
        );
      }
    }

    return {
      clinician,
      patients: patientsWithCharts,
      charts: allCharts,
      stats: {
        patient_count: patients?.length || 0,
        chart_count: allCharts.length,
        pending_count: allCharts.filter((c: any) => c.status === 'pending_review').length,
        verified_count: allCharts.filter((c: any) => c.status === 'verified').length,
        active_patient_count: patientsWithCharts.length, // All patients are active by default
      },
    };
  } catch (error) {
    console.error('Error in fetchClinicianDetails:', error);
    throw error;
  }
}

// Generate unique activation code
function generateActivationCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const random2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ACTV-${timestamp}-${random1}${random2}`;
}

// Create user invitation
export async function createUserInvitation(invitationData: {
  email: string;
  first_name: string;
  last_name: string;
  role: 'clinician' | 'scheduler';
  tenant_id: string;
  created_by: string;
  phone_number?: string;
  occupation?: string;
}) {
  try {
    const activationCode = generateActivationCode();
    const activationLink = `${window.location.origin}/activate?code=${activationCode}`;
    
    const { data, error } = await supabaseClient
      .from('user_invitations')
      .insert({
        email: invitationData.email,
        first_name: invitationData.first_name,
        last_name: invitationData.last_name,
        role: invitationData.role,
        tenant_id: invitationData.tenant_id,
        created_by: invitationData.created_by,
        phone_number: invitationData.phone_number,
        occupation: invitationData.occupation,
        activation_code: activationCode,
        activation_link: activationLink,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      activation_code: activationCode,
      activation_link: activationLink,
    };
  } catch (error) {
    console.error('Error creating user invitation:', error);
    throw error;
  }
}

// Get all invitations for a tenant
export async function fetchUserInvitations(tenantId: string) {
  try {
    const { data, error } = await supabaseClient
      .from('user_invitations')
      .select(`
        *,
        created_by_user:users!user_invitations_created_by_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching invitations:', error);
    throw error;
  }
}

// Verify activation code
export async function verifyActivationCode(activationCode: string) {
  try {
    const { data, error } = await supabaseClient
      .from('user_invitations')
      .select('*')
      .eq('activation_code', activationCode)
      .eq('status', 'pending')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Invalid or expired activation code');
      }
      throw error;
    }

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      await supabaseClient
        .from('user_invitations')
        .update({ status: 'expired' })
        .eq('id', data.id);
      
      throw new Error('Activation code has expired');
    }

    return data;
  } catch (error) {
    console.error('Error verifying activation code:', error);
    throw error;
  }
}

// Complete user activation (called during signup)
export async function activateUserAccount(
  activationCode: string,
  password: string,
  additionalData?: {
    phone_number?: string;
    occupation?: string;
  }
) {
  try {
    // Call server endpoint that uses admin API
    const response = await fetch('http://localhost:8080/api/activate-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        activationCode,
        password,
        additionalData,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to activate account');
    }

    // Now sign in the user with the new credentials
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: result.user.email,
      password: password,
    });

    if (signInError) {
      console.error('Sign in error:', signInError);
      return {
        user: result.user,
        session: null,
        message: 'Account created successfully. Please log in.',
      };
    }

    return {
      user: result.user,
      session: signInData.session,
      message: result.message,
    };
  } catch (error: any) {
    console.error('Error in activateUserAccount:', error);
    throw error;
  }
}

// Revoke/cancel invitation
export async function revokeInvitation(invitationId: string) {
  try {
    const { data, error } = await supabaseClient
      .from('user_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error revoking invitation:', error);
    throw error;
  }
}

// Resend invitation (regenerate code)
export async function resendInvitation(invitationId: string) {
  try {
    const activationCode = generateActivationCode();
    const activationLink = `${window.location.origin}/activate?code=${activationCode}`;
    
    const { data, error } = await supabaseClient
      .from('user_invitations')
      .update({
        activation_code: activationCode,
        activation_link: activationLink,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error resending invitation:', error);
    throw error;
  }
}

// Update user last login (call this from auth service)
export async function updateUserLastLogin(userId: string) {
  try {
    const { error } = await supabaseClient
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating last login:', error);
    // Don't throw - this is not critical
  }
}
