/*
  # Create RAG System for KYC Document Processing

  ## Summary
  Sets up vector embeddings storage for RAG-based KYC document verification.
  This enables AI-powered document analysis using semantic search against 
  compliance regulations and historical verification data.

  ## New Tables
  1. `document_embeddings`
     - Stores vector embeddings of regulatory documents and compliance rules
     - Used for RAG retrieval during KYC verification
     - Fields: id, document_type, content, embedding (vector), metadata, created_at

  2. `kyc_verification_logs`
     - Audit trail of AI verification decisions
     - Fields: id, kyc_application_id, verification_step, ai_decision, 
       confidence_score, reasoning, supporting_documents, created_at

  ## Indexes
  - HNSW index on embeddings for fast similarity search
  - Index on kyc_application_id for quick lookup

  ## Security
  - Enable RLS on both tables
  - Only compliance staff can read verification logs
  - System admin can manage document embeddings
*/

-- Create document embeddings table for RAG
CREATE TABLE IF NOT EXISTS document_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx 
  ON document_embeddings 
  USING hnsw (embedding vector_cosine_ops);

-- Create KYC verification logs table
CREATE TABLE IF NOT EXISTS kyc_verification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_application_id uuid NOT NULL REFERENCES kyc_applications(id) ON DELETE CASCADE,
  verification_step text NOT NULL,
  ai_decision text NOT NULL,
  confidence_score decimal(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  reasoning text,
  supporting_documents jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS kyc_verification_logs_application_idx 
  ON kyc_verification_logs(kyc_application_id);

-- Enable RLS
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_verification_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DOCUMENT EMBEDDINGS POLICIES
-- =====================================================

CREATE POLICY "System admin can manage embeddings"
  ON document_embeddings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "Compliance staff can read embeddings"
  ON document_embeddings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('compliance_officer', 'compliance_manager', 'cco')
    )
  );

-- =====================================================
-- KYC VERIFICATION LOGS POLICIES
-- =====================================================

CREATE POLICY "Compliance staff can view verification logs"
  ON kyc_verification_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('compliance_officer', 'compliance_manager', 'cco', 'internal_auditor', 'system_admin')
    )
  );

CREATE POLICY "System can insert verification logs"
  ON kyc_verification_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- FUNCTION TO MATCH DOCUMENTS BY SIMILARITY
-- =====================================================

CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  document_type text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_embeddings.id,
    document_embeddings.document_type,
    document_embeddings.content,
    1 - (document_embeddings.embedding <=> query_embedding) AS similarity
  FROM document_embeddings
  WHERE 1 - (document_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY document_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
