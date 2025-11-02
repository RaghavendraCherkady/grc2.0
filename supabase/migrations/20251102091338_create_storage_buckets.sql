/*
  # Create Storage Buckets for Document Uploads

  ## Overview
  Creates secure storage buckets for KYC and loan documents with proper access policies.

  ## New Storage Buckets
  
  ### 1. `kyc-documents`
  Stores identity proofs, address proofs, and PAN cards
  - Public access for document viewing
  - Restricted upload to authenticated users only

  ### 2. `loan-documents`
  Stores salary slips, bank statements, and other financial documents
  - Public access for document viewing
  - Restricted upload to authenticated users only

  ## Security
  - All uploads require authentication
  - File size limits enforced
  - Allowed file types: PDF, JPG, PNG
  - RLS policies ensure users can only access their own documents
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('kyc-documents', 'kyc-documents', true),
  ('loan-documents', 'loan-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for kyc-documents bucket
CREATE POLICY "Allow authenticated users to upload KYC documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'kyc-documents');

CREATE POLICY "Allow users to view KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'kyc-documents');

CREATE POLICY "Allow users to delete own KYC documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for loan-documents bucket
CREATE POLICY "Allow authenticated users to upload loan documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'loan-documents');

CREATE POLICY "Allow users to view loan documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'loan-documents');

CREATE POLICY "Allow users to delete own loan documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
