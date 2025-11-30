# BAA Document Storage Setup

## Supabase Storage Bucket Configuration

The BAA document upload feature requires a Supabase storage bucket named `baa-documents`.

### Steps to Create the Bucket:

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New Bucket**
4. Configure the bucket:
   - **Name**: `baa-documents`
   - **Public**: Yes (or set up RLS policies for controlled access)
   - **File size limit**: 10MB (recommended for PDF documents)
   - **Allowed MIME types**: `application/pdf`

### Storage Policies (Row Level Security)

After creating the bucket, set up these policies:

#### Policy 1: Allow Super Admins to Upload

```sql
CREATE POLICY "Super admins can upload BAA documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'baa-documents' AND
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'super_admin'
  )
);
```

#### Policy 2: Allow Super Admins to Read

```sql
CREATE POLICY "Super admins can read BAA documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'baa-documents' AND
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'super_admin'
  )
);
```

#### Policy 3: Allow Tenant Admins to Read Their Own BAA

```sql
CREATE POLICY "Tenant admins can read their BAA documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'baa-documents' AND
  (storage.foldername(name))[1] LIKE 'baa-' || (
    SELECT tenant_id::text FROM users WHERE id = auth.uid()
  ) || '-%'
);
```

### Alternative: Public Bucket (Simpler but Less Secure)

For development or if you don't need strict access control:

1. Make the bucket **Public**
2. Anyone with the URL can access the documents
3. No policies needed

### Testing the Upload

1. Try uploading a BAA document through the Super Admin Dashboard
2. Check the browser console for detailed error messages
3. Common errors:
   - **"bucket not found"**: Create the bucket as described above
   - **"new row violates row-level security policy"**: Add the storage policies
   - **"Bucket must be public"**: Either make bucket public or add proper policies
   - **"Only PDF files are allowed"**: Ensure you're uploading a PDF file
   - **"File size must be less than 10MB"**: Reduce file size

### Verifying Storage Setup

Run this query in the Supabase SQL Editor to check if the bucket exists:

```sql
SELECT * FROM storage.buckets WHERE name = 'baa-documents';
```

If it returns no rows, the bucket doesn't exist and needs to be created.
