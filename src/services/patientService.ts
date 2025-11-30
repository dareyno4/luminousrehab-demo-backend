import { supabaseClient } from '../lib/supabase';

export async function fetchPatientsForClinician(clinicianId: string) {
  const { data, error } = await supabaseClient
    .from('patients')
    .select(`
      id,
      first_name,
      last_name,
      date_of_birth,
      charts:charts (
        id,
        status,
        source,
        created_at,
        created_by,
        finalized_at,
        medications (id)
      )
    `)
    // decide which field you really want here:
    // if "patients assigned to this clinician":
    .eq('assigned_clinician_id', clinicianId);
    // if "patients created by this clinician", keep:
    // .eq('created_by', clinicianId);

  if (error) {
    throw error;
  }
  return data;
}
