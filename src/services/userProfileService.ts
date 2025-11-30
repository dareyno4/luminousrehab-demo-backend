import { supabaseClient } from '../lib/supabase';

export interface UserProfile {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  address?: string;
  occupation?: string;
  active: boolean;
  mfa_enabled: boolean;
  created_at: string;
  last_login?: string;
  // Computed fields
  totalPatients?: number;
  totalCharts?: number;
  pendingReview?: number;
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  email?: string;
  address?: string;
  occupation?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

export interface MFASettings {
  enabled: boolean;
  secret?: string;
}

export const userProfileService = {
  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        throw new Error('Failed to fetch user profile');
      }

      return data;
    } catch (error) {
      console.error('Exception in getUserProfile:', error);
      throw error;
    }
  },

  /**
   * Update user profile information
   */
  async updateProfile(userId: string, updates: ProfileUpdateData): Promise<UserProfile> {
    try {
      const { data, error } = await supabaseClient
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        throw new Error('Failed to update profile');
      }

      return data;
    } catch (error) {
      console.error('Exception in updateProfile:', error);
      throw error;
    }
  },

  /**
   * Change user password
   */
  async changePassword(userId: string, passwordData: PasswordChangeData): Promise<void> {
    try {
      // First verify current password by attempting sign in
      const { data: user } = await supabaseClient
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update to new password
      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) {
        console.error('Error updating password:', updateError);
        throw new Error('Failed to update password');
      }
    } catch (error) {
      console.error('Exception in changePassword:', error);
      throw error;
    }
  },

  /**
   * Toggle MFA for user
   */
  async updateMFASettings(userId: string, enabled: boolean): Promise<void> {
    try {
      const { error } = await supabaseClient
        .from('users')
        .update({ mfa_enabled: enabled })
        .eq('id', userId);

      if (error) {
        console.error('Error updating MFA settings:', error);
        throw new Error('Failed to update MFA settings');
      }
    } catch (error) {
      console.error('Exception in updateMFASettings:', error);
      throw error;
    }
  },

  /**
   * Get user statistics (charts, patients, etc.)
   */
  async getUserStatistics(userId: string, tenantId: string): Promise<{
    totalPatients: number;
    totalCharts: number;
    pendingReview: number;
  }> {
    try {
      // Get total charts for this user
      const { count: chartsCount, error: chartsError } = await supabaseClient
        .from('charts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('assigned_clinician_id', userId);

      if (chartsError) {
        console.error('Error fetching charts count:', chartsError);
      }

      // Get unique patients from those charts
      const { data: patientData, error: patientsError } = await supabaseClient
        .from('charts')
        .select('patient_id')
        .eq('tenant_id', tenantId)
        .eq('assigned_clinician_id', userId);

      if (patientsError) {
        console.error('Error fetching patients:', patientsError);
      }

      const uniquePatients = patientData 
        ? new Set(patientData.map(p => p.patient_id)).size 
        : 0;

      // Get pending review charts
      const { count: pendingCount, error: pendingError } = await supabaseClient
        .from('charts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('assigned_clinician_id', userId)
        .eq('status', 'pending_review');

      if (pendingError) {
        console.error('Error fetching pending review count:', pendingError);
      }

      return {
        totalPatients: uniquePatients,
        totalCharts: chartsCount || 0,
        pendingReview: pendingCount || 0,
      };
    } catch (error) {
      console.error('Exception in getUserStatistics:', error);
      return {
        totalPatients: 0,
        totalCharts: 0,
        pendingReview: 0,
      };
    }
  },

  /**
   * Get agency administrator statistics
   */
  async getAgencyAdminStatistics(tenantId: string): Promise<{
    totalUsers: number;
    totalClinicians: number;
    totalPatients: number;
    totalCharts: number;
    chartsThisMonth: number;
  }> {
    try {
      // Get total users in tenant
      const { count: usersCount, error: usersError } = await supabaseClient
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('active', true);

      // Get total clinicians
      const { count: cliniciansCount, error: cliniciansError } = await supabaseClient
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('role', 'clinician')
        .eq('active', true);

      // Get total charts
      const { count: chartsCount, error: chartsError } = await supabaseClient
        .from('charts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      // Get unique patients
      const { data: patientData, error: patientsError } = await supabaseClient
        .from('charts')
        .select('patient_id')
        .eq('tenant_id', tenantId);

      const uniquePatients = patientData 
        ? new Set(patientData.map(p => p.patient_id)).size 
        : 0;

      // Get charts from this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: monthChartsCount, error: monthChartsError } = await supabaseClient
        .from('charts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfMonth.toISOString());

      return {
        totalUsers: usersCount || 0,
        totalClinicians: cliniciansCount || 0,
        totalPatients: uniquePatients,
        totalCharts: chartsCount || 0,
        chartsThisMonth: monthChartsCount || 0,
      };
    } catch (error) {
      console.error('Exception in getAgencyAdminStatistics:', error);
      return {
        totalUsers: 0,
        totalClinicians: 0,
        totalPatients: 0,
        totalCharts: 0,
        chartsThisMonth: 0,
      };
    }
  },

  /**
   * Get scheduler statistics
   */
  async getSchedulerStatistics(userId: string, tenantId: string): Promise<{
    totalAssignments: number;
    totalCharts: number;
    pendingReview: number;
    thisWeekScheduled: number;
  }> {
    try {
      // Get total charts assigned by this scheduler
      const { count: chartsCount, error: chartsError } = await supabaseClient
        .from('charts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      // Get unique patients
      const { data: patientData, error: patientsError } = await supabaseClient
        .from('charts')
        .select('patient_id')
        .eq('tenant_id', tenantId);

      const uniquePatients = patientData 
        ? new Set(patientData.map(p => p.patient_id)).size 
        : 0;

      // Get pending review charts
      const { count: pendingCount, error: pendingError } = await supabaseClient
        .from('charts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'pending_review');

      // Get charts from this week
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const { count: weekChartsCount, error: weekChartsError } = await supabaseClient
        .from('charts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfWeek.toISOString());

      return {
        totalAssignments: uniquePatients,
        totalCharts: chartsCount || 0,
        pendingReview: pendingCount || 0,
        thisWeekScheduled: weekChartsCount || 0,
      };
    } catch (error) {
      console.error('Exception in getSchedulerStatistics:', error);
      return {
        totalAssignments: 0,
        totalCharts: 0,
        pendingReview: 0,
        thisWeekScheduled: 0,
      };
    }
  },

  /**
   * Get tenant information
   */
  async getTenantInfo(tenantId: string): Promise<{
    name: string;
    license_number?: string;
    npi_number?: string;
    address?: string;
    phone?: string;
    contact_email?: string;
  } | null> {
    try {
      const { data, error } = await supabaseClient
        .from('tenants')
        .select('name, license_number, npi_number, address, contact_phone, contact_email')
        .eq('id', tenantId)
        .single();

      if (error) {
        console.error('Error fetching tenant info:', error);
        return null;
      }

      return {
        name: data.name,
        license_number: data.license_number,
        npi_number: data.npi_number,
        address: data.address,
        phone: data.contact_phone,
        contact_email: data.contact_email,
      };
    } catch (error) {
      console.error('Exception in getTenantInfo:', error);
      return null;
    }
  },
};
