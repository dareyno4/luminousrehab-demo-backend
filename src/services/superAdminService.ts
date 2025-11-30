import { supabaseClient } from '../lib/supabase';

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  ein?: string;
  contact_email: string;
  contact_phone?: string;
  payment_token?: string;
  logo_url?: string;
  primary_color: string;
  baa_signed: boolean;
  baa_signed_date?: string;
  baa_signer_name?: string;
  baa_document_url?: string;
  baa_renewal_date?: string;
  status: 'active' | 'inactive' | 'suspended';
  test_mode: boolean;
  created_at: string;
  updated_at: string;
  // Computed fields for UI
  baa_status?: 'signed' | 'not_signed' | 'expiring_soon';
  user_count?: number;
  active_user_count?: number;
  patient_count?: number;
  chart_count?: number;
  mfa_percentage?: number;
}

export interface BAADocument {
  id: string;
  tenant_id: string;
  document_url: string;
  signed_by: string;
  signed_at: string;
  expires_at: string;
  status: 'active' | 'expired' | 'revoked';
  version: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  user_name?: string; // Computed from join
  tenant_name?: string; // Computed from join
  entity_type: string;
  entity_id: string;
  action: string;
  changes?: any;
  metadata?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Fetch all tenants with stats
export async function fetchAllTenants() {
  try {
    const { data: tenants, error } = await supabaseClient
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get stats for each tenant
    const tenantsWithStats = await Promise.all(
      (tenants || []).map(async (tenant) => {
        const [
          { count: userCount },
          { count: activeUserCount },
          { count: patientCount },
          { count: chartCount },
        ] = await Promise.all([
          supabaseClient.from('users').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
          supabaseClient.from('users').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('active', true),
          supabaseClient.from('patients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
          supabaseClient.from('charts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
        ]);

        // Get MFA stats
        const { data: mfaUsers } = await supabaseClient
          .from('users')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('mfa_enabled', true);

        const mfaPercentage = userCount ? Math.round(((mfaUsers?.length || 0) / userCount) * 100) : 0;

        // Check BAA expiration
        let baaStatus: 'signed' | 'not_signed' | 'expiring_soon' = tenant.baa_signed ? 'signed' : 'not_signed';
        if (tenant.baa_renewal_date && tenant.baa_signed) {
          const renewalDate = new Date(tenant.baa_renewal_date);
          const daysUntilExpiry = Math.floor((renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
            baaStatus = 'expiring_soon';
          } else if (daysUntilExpiry <= 0) {
            baaStatus = 'not_signed'; // Expired
          }
        }

        return {
          ...tenant,
          user_count: userCount || 0,
          active_user_count: activeUserCount || 0,
          patient_count: patientCount || 0,
          chart_count: chartCount || 0,
          mfa_percentage: mfaPercentage,
          baa_status: baaStatus,
        };
      })
    );

    return tenantsWithStats;
  } catch (error) {
    console.error('Error fetching tenants:', error);
    throw error;
  }
}

// Create new tenant (onboarding)
export async function createTenant(tenantData: {
  name: string;
  subdomain: string;
  ein?: string;
  contact_email: string;
  contact_phone?: string;
  environment?: 'production' | 'test';
}) {
  try {
    // Check if subdomain is available
    const { data: existing } = await supabaseClient
      .from('tenants')
      .select('id')
      .eq('subdomain', tenantData.subdomain)
      .single();

    if (existing) {
      throw new Error('Subdomain already taken');
    }

    const { data, error } = await supabaseClient
      .from('tenants')
      .insert({
        name: tenantData.name,
        subdomain: tenantData.subdomain,
        ein: tenantData.ein || null,
        contact_email: tenantData.contact_email,
        contact_phone: tenantData.contact_phone || null,
        status: 'inactive', // Start as inactive until BAA is signed
        test_mode: tenantData.environment === 'test',
        baa_signed: false,
        primary_color: '#3b82f6',
      })
      .select()
      .single();

    if (error) throw error;

    // Log audit event
    await logAuditEvent({
      tenant_id: data.id,
      action: 'created',
      entity_type: 'tenant',
      entity_id: data.id,
      metadata: { name: tenantData.name, subdomain: tenantData.subdomain },
    });

    return data;
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw error;
  }
}

// Update tenant
export async function updateTenant(tenantId: string, updates: Partial<Tenant>) {
  try {
    const { data, error } = await supabaseClient
      .from('tenants')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId)
      .select()
      .single();

    if (error) throw error;

    // Log audit event
    await logAuditEvent({
      tenant_id: tenantId,
      action: 'updated',
      entity_type: 'tenant',
      entity_id: tenantId,
      changes: updates,
    });

    return data;
  } catch (error) {
    console.error('Error updating tenant:', error);
    throw error;
  }
}

// Suspend/unsuspend tenant
export async function suspendTenant(tenantId: string, reason: string) {
  try {
    const { data, error } = await supabaseClient
      .from('tenants')
      .update({
        status: 'suspended',
      })
      .eq('id', tenantId)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      tenant_id: tenantId,
      action: 'updated',
      entity_type: 'tenant',
      entity_id: tenantId,
      metadata: { status: 'suspended', reason },
    });

    return data;
  } catch (error) {
    console.error('Error suspending tenant:', error);
    throw error;
  }
}

export async function unsuspendTenant(tenantId: string) {
  try {
    const { data, error } = await supabaseClient
      .from('tenants')
      .update({
        status: 'active',
      })
      .eq('id', tenantId)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      tenant_id: tenantId,
      action: 'updated',
      entity_type: 'tenant',
      entity_id: tenantId,
      metadata: { status: 'active' },
    });

    return data;
  } catch (error) {
    console.error('Error unsuspending tenant:', error);
    throw error;
  }
}

// Delete tenant permanently
export async function deleteTenant(tenantId: string) {
  try {
    // Note: This will cascade delete all related data (users, patients, charts, etc.)
    const { error } = await supabaseClient
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (error) throw error;

    // Note: Audit log for deletion will fail since tenant is deleted
    // Consider logging before deletion if needed
    console.log(`Tenant ${tenantId} deleted successfully`);

    return { success: true };
  } catch (error) {
    console.error('Error deleting tenant:', error);
    throw error;
  }
}

// Update test mode (replaces feature flags for now)
export async function updateTestMode(tenantId: string, testMode: boolean) {
  try {
    const { data, error } = await supabaseClient
      .from('tenants')
      .update({ test_mode: testMode })
      .eq('id', tenantId)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      tenant_id: tenantId,
      action: 'updated',
      entity_type: 'tenant',
      entity_id: tenantId,
      changes: { test_mode: testMode },
    });

    return data;
  } catch (error) {
    console.error('Error updating test mode:', error);
    throw error;
  }
}

// Kept for backward compatibility - maps to test_mode
export async function updateFeatureFlags(tenantId: string, featureFlags: string[]) {
  // For now, just track if any advanced features are enabled
  const testMode = featureFlags.length === 0;
  return updateTestMode(tenantId, testMode);
}

// BAA Management
export async function uploadBAADocument(
  tenantId: string,
  file: File,
  signedBy: string,
  expiresAt: string
) {
  try {
    // Validate file type
    if (file.type !== 'application/pdf') {
      throw new Error('Only PDF files are allowed for BAA documents');
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size must be less than 10MB');
    }

    // Upload file to Supabase storage
    const fileName = `baa-${tenantId}-${Date.now()}.pdf`;
    
    console.log('Uploading BAA document:', fileName);
    
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('baa-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log('Upload successful:', uploadData);

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('baa-documents')
      .getPublicUrl(fileName);

    console.log('Public URL:', publicUrl);

    // Create BAA record
    const { data: baaRecord, error: baaError } = await supabaseClient
      .from('baa_documents')
      .insert({
        tenant_id: tenantId,
        document_url: publicUrl,
        signed_by: signedBy,
        signed_at: new Date().toISOString(),
        expires_at: expiresAt,
        status: 'active',
        version: '1.0',
      })
      .select()
      .single();

    if (baaError) {
      console.error('BAA record creation error:', baaError);
      throw new Error(`Failed to create BAA record: ${baaError.message}`);
    }

    // Update tenant BAA status
    const { data: tenant, error: tenantUpdateError } = await supabaseClient
      .from('tenants')
      .update({
        baa_signed: true,
        baa_signed_date: new Date().toISOString(),
        baa_signer_name: signedBy,
        baa_renewal_date: expiresAt,
        baa_document_url: publicUrl,
        status: 'active', // Activate tenant once BAA is signed
      })
      .eq('id', tenantId)
      .select('id, name, subdomain, contact_email')
      .single();

    if (tenantUpdateError) {
      console.error('Tenant update error:', tenantUpdateError);
      throw new Error(`Failed to update tenant: ${tenantUpdateError.message}`);
    }

    console.log('Tenant updated successfully:', tenant);

    // Generate activation code and link
    const activationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const activationLink = `${window.location.origin}/activate?tenant=${tenant.subdomain}&code=${activationCode}`;
    
    // Store activation code in tenant metadata
    try {
      // First, get existing metadata
      const { data: existingTenant } = await supabaseClient
        .from('tenants')
        .select('metadata')
        .eq('id', tenantId)
        .single();

      const currentMetadata = (existingTenant?.metadata as any) || {};
      
      const { error: metadataError } = await supabaseClient
        .from('tenants')
        .update({
          metadata: { 
            ...currentMetadata,
            activation_code: activationCode, 
            activation_sent_at: new Date().toISOString() 
          }
        })
        .eq('id', tenantId);

      if (metadataError) {
        console.error('Failed to store activation code:', metadataError);
        // If metadata column doesn't exist, continue without it
        // The activation will still work but admin will need to manually share details
      } else {
        console.log('Activation code stored successfully');
      }
      
      // TODO: Send email via your email service
      // For now, just log it
      console.log('Activation email should be sent to:', tenant.contact_email);
      console.log('Activation link:', activationLink);
      console.log('Activation code:', activationCode);
      
      // You would call your email service here:
      // await sendActivationEmail({
      //   to: tenant.contact_email,
      //   tenantName: tenant.name,
      //   activationLink,
      //   activationCode,
      // });
    } catch (emailError) {
      console.error('Failed to store activation code:', emailError);
      // Don't throw - tenant is still activated even if this fails
    }

    await logAuditEvent({
      tenant_id: tenantId,
      action: 'updated',
      entity_type: 'tenant',
      entity_id: tenantId,
      metadata: { baa_uploaded: true, signed_by: signedBy, expires_at: expiresAt },
    });

    return {
      baaRecord,
      activationInfo: {
        tenantName: tenant.name,
        subdomain: tenant.subdomain,
        contactEmail: tenant.contact_email,
        activationCode,
        activationLink,
      }
    };
  } catch (error) {
    console.error('Error uploading BAA:', error);
    throw error;
  }
}

// Fetch BAA documents for a tenant
export async function fetchBAADocuments(tenantId: string) {
  try {
    const { data, error } = await supabaseClient
      .from('baa_documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('signed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching BAA documents:', error);
    throw error;
  }
}

// Fetch audit logs
export async function fetchAuditLogs(filters?: {
  tenantId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}) {
  try {
    let query = supabaseClient
      .from('audit_logs')
      .select(`
        *,
        user:users!audit_logs_user_id_fkey(first_name, last_name, email),
        tenant:tenants!audit_logs_tenant_id_fkey(name)
      `)
      .order('created_at', { ascending: false });

    if (filters?.tenantId) {
      query = query.eq('tenant_id', filters.tenantId);
    }

    if (filters?.action) {
      query = query.eq('action', filters.action);
    }

    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Error fetching audit logs:', error);
      return []; // Return empty array on error
    }

    return (data || []).map((log: any) => ({
      id: log.id,
      tenant_id: log.tenant_id,
      user_id: log.user_id,
      user_name: log.user ? `${log.user.first_name} ${log.user.last_name}` : 'Unknown User',
      tenant_name: log.tenant?.name || 'Unknown Tenant',
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      changes: log.changes,
      metadata: log.metadata,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      created_at: log.created_at,
    }));
  } catch (error) {
    console.warn('Error fetching audit logs:', error);
    return []; // Don't crash the dashboard
  }
}

// Log audit event
export async function logAuditEvent(event: {
  tenant_id: string;
  action: 'created' | 'updated' | 'deleted' | 'finalized' | 'delivered' | 'returned' | 'exported' | 'viewed';
  entity_type: 'tenant' | 'user' | 'patient' | 'chart' | 'medication' | 'export';
  entity_id: string;
  changes?: any;
  metadata?: any;
}) {
  try {
    // Get current user from session
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) return;

    await supabaseClient.from('audit_logs').insert({
      tenant_id: event.tenant_id,
      user_id: user.id,
      action: event.action,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      changes: event.changes || null,
      metadata: event.metadata || null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Audit logging failed:', error);
    // Don't throw - audit logging should not break functionality
  }
}

// Get super admin stats
export async function getSuperAdminStats() {
  try {
    const [
      { data: tenants },
      { count: totalUsers },
      { count: totalPatients },
      { count: totalCharts },
    ] = await Promise.all([
      supabaseClient.from('tenants').select('status, baa_signed, baa_renewal_date'),
      supabaseClient.from('users').select('id', { count: 'exact', head: true }),
      supabaseClient.from('patients').select('id', { count: 'exact', head: true }),
      supabaseClient.from('charts').select('id', { count: 'exact', head: true }),
    ]);

    const activeTenants = tenants?.filter(t => t.status === 'active').length || 0;
    const suspendedTenants = tenants?.filter(t => t.status === 'suspended').length || 0;
    const baaPending = tenants?.filter(t => !t.baa_signed).length || 0;
    
    // Calculate expiring BAAs
    const baaExpiring = tenants?.filter(t => {
      if (!t.baa_signed || !t.baa_renewal_date) return false;
      const renewalDate = new Date(t.baa_renewal_date);
      const daysUntilExpiry = Math.floor((renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }).length || 0;

    return {
      totalTenants: tenants?.length || 0,
      activeTenants,
      suspendedTenants,
      baaPending,
      baaExpiring,
      totalUsers: totalUsers || 0,
      totalPatients: totalPatients || 0,
      totalCharts: totalCharts || 0,
    };
  } catch (error) {
    console.error('Error fetching super admin stats:', error);
    throw error;
  }
}

// Impersonate tenant user (for support)
export async function impersonateTenant(tenantId: string, reason: string) {
  try {
    // Log the impersonation
    await logAuditEvent({
      tenant_id: tenantId,
      action: 'viewed',
      entity_type: 'tenant',
      entity_id: tenantId,
      metadata: { impersonation: true, reason },
    });

    // In a real implementation, this would create a special session token
    // For now, just return success
    return { success: true, tenantId, reason };
  } catch (error) {
    console.error('Error impersonating tenant:', error);
    throw error;
  }
}
