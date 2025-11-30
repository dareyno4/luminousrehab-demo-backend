import { supabaseClient } from "../lib/supabase";

// Types
export interface Document {
  id: string;
  chart_id: string;
  tenant_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  created_at: string;
  uploaded_by: string | null;
  ocr_status?: 'pending' | 'processing' | 'completed' | 'failed' | null;
  ocr_text?: string;
}

export interface DocumentWithChart extends Document {
  chart?: {
    id: string;
    patient: {
      id: string;
      first_name: string;
      last_name: string;
      date_of_birth: string;
    };
  };
}

// Helper to derive the storage path from a public URL
function getStoragePathFromPublicUrl(publicUrl: string): string | null {
  // Supabase public URL looks like:
  // https://<project>.supabase.co/storage/v1/object/public/chart-documents/<path>
  const marker = "/storage/v1/object/public/chart-documents/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length);
}

// Get a signed URL for viewing a document (valid for 1 hour)
export async function getSignedDocumentUrl(fileUrl: string): Promise<string> {
  const storagePath = getStoragePathFromPublicUrl(fileUrl);
  
  if (!storagePath) {
    console.warn('Could not extract storage path, returning original URL');
    return fileUrl;
  }

  try {
    const { data, error } = await supabaseClient.storage
      .from('chart-documents')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      return fileUrl; // Fallback to original URL
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Exception creating signed URL:', err);
    return fileUrl; // Fallback to original URL
  }
}

export async function uploadDocument(
  file: File, 
  chartId: string, 
  tenantId: string, 
  uploadedBy: string
) {
  const fileExt = file.name.split('.').pop();
  const path = `${tenantId}/${chartId}/${crypto.randomUUID()}.${fileExt}`;

  // 1: Upload to storage
  const { data: uploadData, error: uploadError } = await supabaseClient.storage
    .from("chart-documents")
    .upload(path, file);

  if (uploadError) throw uploadError;

  // 2: Get URL
  const { data: urlData } = supabaseClient.storage
    .from("chart-documents")
    .getPublicUrl(path);

  const fileUrl = urlData.publicUrl;

  // 3: Insert metadata row into documents table
  const { data: docRow, error: docError } = await supabaseClient
    .from("documents")
    .insert({
      chart_id: chartId,
      tenant_id: tenantId,
      file_name: file.name,
      file_type: file.type,
      file_url: fileUrl,
      uploaded_by: uploadedBy,
      ocr_status: file.type.includes('image') || file.type.includes('pdf') ? 'pending' : null,
    })
    .select()
    .single();

  if (docError) throw docError;
  return docRow as Document;
}

// Upload document without assigning to a chart yet (for scheduler workflow)
// NOTE: This function will NOT work with the current schema since chart_id is NOT NULL
// You need to either:
// 1. Change chart_id to allow NULL: ALTER TABLE documents ALTER COLUMN chart_id DROP NOT NULL;
// 2. Create a special "unassigned" chart and use that as placeholder
export async function uploadUnassignedDocument(
  file: File,
  tenantId: string,
  uploadedBy: string | null
) {
  throw new Error('Cannot upload unassigned documents - chart_id is required in schema. Please attach to a chart or modify schema to allow NULL chart_id.');
  
  // Original code kept for reference:
  /*
  const fileExt = file.name.split('.').pop();
  const path = `${tenantId}/unassigned/${crypto.randomUUID()}.${fileExt}`;

  const { data: uploadData, error: uploadError } = await supabaseClient.storage
    .from("chart-documents")
    .upload(path, file);

  if (uploadError) throw uploadError;

  const { data: urlData } = supabaseClient.storage
    .from("chart-documents")
    .getPublicUrl(path);

  const fileUrl = urlData.publicUrl;

  const { data: docRow, error: docError } = await supabaseClient
    .from("documents")
    .insert({
      chart_id: null, // This will fail with NOT NULL constraint
      tenant_id: tenantId,
      file_name: file.name,
      file_type: file.type,
      file_url: fileUrl,
      uploaded_by: uploadedBy,
      ocr_status: file.type.includes('image') || file.type.includes('pdf') ? 'pending' : null,
    })
    .select()
    .single();

  if (docError) throw docError;
  return docRow as Document;
  */
}

// Attach an unassigned document to a chart
export async function attachDocumentToChart(documentId: string, chartId: string) {
  const { data, error } = await supabaseClient
    .from("documents")
    .update({ chart_id: chartId })
    .eq("id", documentId)
    .select()
    .single();

  if (error) throw error;
  return data as Document;
}

// Fetch all documents in a tenant
export async function fetchAllDocuments(tenantId: string) {
  const { data, error } = await supabaseClient
    .from("documents")
    .select(`
      *,
      charts!fk_documents_chart (
        id,
        patients!charts_patient_id_fkey (
          id,
          first_name,
          last_name,
          date_of_birth
        )
      )
    `)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
  
  // Transform to match expected structure
  const transformed = (data || []).map((doc: any) => ({
    ...doc,
    chart: doc.charts ? {
      id: doc.charts.id,
      patient: doc.charts.patients
    } : undefined
  }));
  
  return transformed as DocumentWithChart[];
}

// Fetch unassigned documents (not attached to any chart) - Note: Since chart_id is NOT NULL in schema, this may not apply
export async function fetchUnassignedDocuments(tenantId: string) {
  // If chart_id is NOT NULL in your schema, you may need to create a dummy/unassigned chart
  // or change the schema to allow NULL chart_id values
  const { data, error } = await supabaseClient
    .from("documents")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error('Error fetching unassigned documents:', error);
    throw error;
  }
  return data as DocumentWithChart[];
}

// Fetch documents for a specific chart
export async function fetchDocumentsForChart(chartId: string) {
  const { data, error } = await supabaseClient
    .from("documents")
    .select("*")
    .eq("chart_id", chartId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error('Error fetching documents for chart:', error);
    throw error;
  }
  return data as DocumentWithChart[];
}

export async function deleteDocument(docId: string, fileUrl: string) {
  // Best-effort storage cleanup using path derived from public URL
  const storagePath = getStoragePathFromPublicUrl(fileUrl);
  if (storagePath) {
    await supabaseClient.storage
      .from("chart-documents")
      .remove([storagePath]);
    // We intentionally ignore storage errors here to not block DB cleanup.
  }

  const { error } = await supabaseClient
    .from("documents")
    .delete()
    .eq("id", docId);

  if (error) throw error;
  return { success: true } as const;
}

// Get document statistics for a tenant
export async function getDocumentStats(tenantId: string) {
  // Total documents
  const { count: totalDocs, error: totalError } = await supabaseClient
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if (totalError) throw totalError;

  // Unassigned documents
  const { count: unassignedDocs, error: unassignedError } = await supabaseClient
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .is("chart_id", null);

  if (unassignedError) throw unassignedError;

  // OCR processing
  const { count: ocrProcessing, error: ocrError } = await supabaseClient
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("ocr_status", ["pending", "processing"]);

  if (ocrError) throw ocrError;

  // Failed uploads/OCR
  const { count: failedDocs, error: failedError } = await supabaseClient
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("ocr_status", "failed");

  if (failedError) throw failedError;

  return {
    total: totalDocs || 0,
    unassigned: unassignedDocs || 0,
    ocrProcessing: ocrProcessing || 0,
    failed: failedDocs || 0,
  };
}