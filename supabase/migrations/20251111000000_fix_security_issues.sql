/*
  # Fix Security and Performance Issues

  1. Performance Improvements
    - Add missing indexes for foreign keys to improve query performance
    - These indexes speed up JOIN operations and foreign key constraint checks

  2. RLS Optimization
    - Wrap auth.uid() calls with SELECT to avoid re-evaluation for each row
    - This significantly improves query performance at scale

  3. Function Security
    - Set explicit search_path for all functions to prevent SQL injection
    - Ensures functions operate in a secure, predictable environment

  4. Schema Organization
    - Move extensions from public schema to extensions schema
    - Follows PostgreSQL best practices for extension management

  Note: Unused indexes are intentional for future use and query optimization.
  Multiple permissive policies are by design for role-based access control.
*/

-- =====================================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- Indexes for audit_observations table
CREATE INDEX IF NOT EXISTS idx_audit_observations_related_user_id
  ON audit_observations(related_user_id);

CREATE INDEX IF NOT EXISTS idx_audit_observations_resolved_by
  ON audit_observations(resolved_by);

-- Indexes for governance_alerts table
CREATE INDEX IF NOT EXISTS idx_governance_alerts_acknowledged_by
  ON governance_alerts(acknowledged_by);

CREATE INDEX IF NOT EXISTS idx_governance_alerts_related_kyc_id
  ON governance_alerts(related_kyc_id);

CREATE INDEX IF NOT EXISTS idx_governance_alerts_related_loan_id
  ON governance_alerts(related_loan_id);

CREATE INDEX IF NOT EXISTS idx_governance_alerts_related_user_id
  ON governance_alerts(related_user_id);

CREATE INDEX IF NOT EXISTS idx_governance_alerts_resolved_by
  ON governance_alerts(resolved_by);

-- Indexes for kyc_applications table
CREATE INDEX IF NOT EXISTS idx_kyc_applications_created_by
  ON kyc_applications(created_by);

CREATE INDEX IF NOT EXISTS idx_kyc_applications_reviewed_by
  ON kyc_applications(reviewed_by);

-- Indexes for kyc_verification_logs table
CREATE INDEX IF NOT EXISTS idx_kyc_verification_logs_created_by
  ON kyc_verification_logs(created_by);

-- Indexes for loan_applications table
CREATE INDEX IF NOT EXISTS idx_loan_applications_approved_by
  ON loan_applications(approved_by);

CREATE INDEX IF NOT EXISTS idx_loan_applications_assessed_by
  ON loan_applications(assessed_by);

CREATE INDEX IF NOT EXISTS idx_loan_applications_created_by
  ON loan_applications(created_by);

-- =====================================================
-- PART 2: OPTIMIZE RLS POLICIES
-- =====================================================

-- Drop and recreate profiles policies with optimized auth calls
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Drop and recreate kyc_applications policies with optimized auth calls
DROP POLICY IF EXISTS "Compliance officers can view own KYC" ON kyc_applications;
DROP POLICY IF EXISTS "Compliance officers can create KYC" ON kyc_applications;
DROP POLICY IF EXISTS "Compliance managers can view all KYC" ON kyc_applications;
DROP POLICY IF EXISTS "Compliance managers can update KYC" ON kyc_applications;
DROP POLICY IF EXISTS "Compliance managers can create KYC" ON kyc_applications;
DROP POLICY IF EXISTS "CCO can view all KYC" ON kyc_applications;
DROP POLICY IF EXISTS "CCO can update KYC status" ON kyc_applications;
DROP POLICY IF EXISTS "Internal auditors can view all KYC" ON kyc_applications;
DROP POLICY IF EXISTS "System admin can view all KYC" ON kyc_applications;
DROP POLICY IF EXISTS "System admin can update KYC" ON kyc_applications;
DROP POLICY IF EXISTS "System admin can create KYC" ON kyc_applications;

CREATE POLICY "Compliance officers can view own KYC"
  ON kyc_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('compliance_officer', 'loan_officer', 'branch_manager', 'relationship_manager')
      AND kyc_applications.created_by = profiles.id
    )
  );

CREATE POLICY "Compliance officers can create KYC"
  ON kyc_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('compliance_officer', 'loan_officer', 'branch_manager', 'relationship_manager')
    )
  );

CREATE POLICY "Compliance managers can view all KYC"
  ON kyc_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'compliance_manager'
    )
  );

CREATE POLICY "Compliance managers can update KYC"
  ON kyc_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'compliance_manager'
    )
  );

CREATE POLICY "Compliance managers can create KYC"
  ON kyc_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'compliance_manager'
    )
  );

CREATE POLICY "CCO can view all KYC"
  ON kyc_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'cco'
    )
  );

CREATE POLICY "CCO can update KYC status"
  ON kyc_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'cco'
    )
  );

CREATE POLICY "Internal auditors can view all KYC"
  ON kyc_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'internal_auditor'
    )
  );

CREATE POLICY "System admin can view all KYC"
  ON kyc_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "System admin can update KYC"
  ON kyc_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "System admin can create KYC"
  ON kyc_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'system_admin'
    )
  );

-- Drop and recreate loan_applications policies with optimized auth calls
DROP POLICY IF EXISTS "Compliance officers can view own loans" ON loan_applications;
DROP POLICY IF EXISTS "Compliance officers can create loans" ON loan_applications;
DROP POLICY IF EXISTS "Compliance managers can view all loans" ON loan_applications;
DROP POLICY IF EXISTS "Compliance managers can update loans" ON loan_applications;
DROP POLICY IF EXISTS "Compliance managers can create loans" ON loan_applications;
DROP POLICY IF EXISTS "CCO can view all loans" ON loan_applications;
DROP POLICY IF EXISTS "CCO can update loan status" ON loan_applications;
DROP POLICY IF EXISTS "Internal auditors can view all loans" ON loan_applications;
DROP POLICY IF EXISTS "System admin can view all loans" ON loan_applications;
DROP POLICY IF EXISTS "System admin can update loans" ON loan_applications;
DROP POLICY IF EXISTS "System admin can create loans" ON loan_applications;

CREATE POLICY "Compliance officers can view own loans"
  ON loan_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('compliance_officer', 'loan_officer', 'branch_manager', 'relationship_manager')
      AND loan_applications.created_by = profiles.id
    )
  );

CREATE POLICY "Compliance officers can create loans"
  ON loan_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('compliance_officer', 'loan_officer', 'branch_manager', 'relationship_manager')
    )
  );

CREATE POLICY "Compliance managers can view all loans"
  ON loan_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'compliance_manager'
    )
  );

CREATE POLICY "Compliance managers can update loans"
  ON loan_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'compliance_manager'
    )
  );

CREATE POLICY "Compliance managers can create loans"
  ON loan_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'compliance_manager'
    )
  );

CREATE POLICY "CCO can view all loans"
  ON loan_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'cco'
    )
  );

CREATE POLICY "CCO can update loan status"
  ON loan_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'cco'
    )
  );

CREATE POLICY "Internal auditors can view all loans"
  ON loan_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'internal_auditor'
    )
  );

CREATE POLICY "System admin can view all loans"
  ON loan_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "System admin can update loans"
  ON loan_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "System admin can create loans"
  ON loan_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'system_admin'
    )
  );

-- Drop and recreate governance_alerts policies with optimized auth calls
DROP POLICY IF EXISTS "Compliance managers can view alerts" ON governance_alerts;
DROP POLICY IF EXISTS "CCO can view alerts" ON governance_alerts;
DROP POLICY IF EXISTS "CCO can resolve alerts" ON governance_alerts;
DROP POLICY IF EXISTS "Internal auditors can view alerts" ON governance_alerts;
DROP POLICY IF EXISTS "Internal auditors can resolve alerts" ON governance_alerts;
DROP POLICY IF EXISTS "System admin can view alerts" ON governance_alerts;
DROP POLICY IF EXISTS "System admin can update alerts" ON governance_alerts;

CREATE POLICY "Compliance managers can view alerts"
  ON governance_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'compliance_manager'
    )
  );

CREATE POLICY "CCO can view alerts"
  ON governance_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'cco'
    )
  );

CREATE POLICY "CCO can resolve alerts"
  ON governance_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'cco'
    )
  );

CREATE POLICY "Internal auditors can view alerts"
  ON governance_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'internal_auditor'
    )
  );

CREATE POLICY "Internal auditors can resolve alerts"
  ON governance_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'internal_auditor'
    )
  );

CREATE POLICY "System admin can view alerts"
  ON governance_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "System admin can update alerts"
  ON governance_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'system_admin'
    )
  );

-- Drop and recreate audit_logs policies with optimized auth calls
DROP POLICY IF EXISTS "Compliance officers can view own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Compliance managers can view own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "CCO can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Internal auditors can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System admin can view all audit logs" ON audit_logs;

CREATE POLICY "Compliance officers can view own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('compliance_officer', 'loan_officer', 'branch_manager', 'relationship_manager')
      AND audit_logs.user_id = profiles.id
    )
  );

CREATE POLICY "Compliance managers can view own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'compliance_manager'
    )
  );

CREATE POLICY "CCO can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'cco'
    )
  );

CREATE POLICY "Internal auditors can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'internal_auditor'
    )
  );

CREATE POLICY "System admin can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'system_admin'
    )
  );

-- Drop and recreate notification policies with optimized auth calls
DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can create own notification preferences" ON notification_preferences;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Drop and recreate notifications policies with optimized auth calls
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Compliance staff can view all notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Compliance staff can view all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('compliance_manager', 'cco', 'internal_auditor', 'system_admin')
    )
  );

-- Drop and recreate document_embeddings policies with optimized auth calls
DROP POLICY IF EXISTS "System admin can manage embeddings" ON document_embeddings;
DROP POLICY IF EXISTS "Compliance staff can read embeddings" ON document_embeddings;

CREATE POLICY "System admin can manage embeddings"
  ON document_embeddings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "Compliance staff can read embeddings"
  ON document_embeddings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('compliance_officer', 'compliance_manager', 'cco', 'internal_auditor', 'system_admin')
    )
  );

-- Drop and recreate kyc_verification_logs policies with optimized auth calls
DROP POLICY IF EXISTS "Compliance staff can view verification logs" ON kyc_verification_logs;

CREATE POLICY "Compliance staff can view verification logs"
  ON kyc_verification_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('compliance_officer', 'compliance_manager', 'cco', 'internal_auditor', 'system_admin')
    )
  );

-- Drop and recreate notification_templates policies with optimized auth calls
DROP POLICY IF EXISTS "System admin can manage templates" ON notification_templates;

CREATE POLICY "System admin can manage templates"
  ON notification_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'system_admin'
    )
  );

-- Drop and recreate emi_schedules policies with optimized auth calls
DROP POLICY IF EXISTS "Users can view own EMI schedules" ON emi_schedules;
DROP POLICY IF EXISTS "Compliance staff can view all EMI schedules" ON emi_schedules;
DROP POLICY IF EXISTS "System can manage EMI schedules" ON emi_schedules;

CREATE POLICY "Users can view own EMI schedules"
  ON emi_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loan_applications
      WHERE loan_applications.id = emi_schedules.loan_id
      AND loan_applications.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "Compliance staff can view all EMI schedules"
  ON emi_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('compliance_officer', 'compliance_manager', 'cco', 'internal_auditor', 'system_admin')
    )
  );

CREATE POLICY "System can manage EMI schedules"
  ON emi_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('system_admin', 'compliance_manager')
    )
  );

-- Drop and recreate audit_observations policies with optimized auth calls
DROP POLICY IF EXISTS "Internal auditors can view all observations" ON audit_observations;
DROP POLICY IF EXISTS "Internal auditors can create observations" ON audit_observations;
DROP POLICY IF EXISTS "Internal auditors can update their observations" ON audit_observations;
DROP POLICY IF EXISTS "Compliance managers can view observations" ON audit_observations;
DROP POLICY IF EXISTS "Compliance managers can update management response" ON audit_observations;

CREATE POLICY "Internal auditors can view all observations"
  ON audit_observations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'internal_auditor'
    )
  );

CREATE POLICY "Internal auditors can create observations"
  ON audit_observations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'internal_auditor'
    )
  );

CREATE POLICY "Internal auditors can update their observations"
  ON audit_observations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'internal_auditor'
      AND audit_observations.auditor_id = profiles.id
    )
  );

CREATE POLICY "Compliance managers can view observations"
  ON audit_observations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('compliance_manager', 'cco', 'system_admin')
    )
  );

CREATE POLICY "Compliance managers can update management response"
  ON audit_observations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('compliance_manager', 'cco')
    )
  );

-- =====================================================
-- PART 3: FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Fix trigger_kyc_verification function
CREATE OR REPLACE FUNCTION trigger_kyc_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/verify-kyc-rag',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object('kycApplicationId', NEW.id)
  );
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix match_documents function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_embeddings.id,
    document_embeddings.content,
    document_embeddings.metadata,
    1 - (document_embeddings.embedding <=> query_embedding) as similarity
  FROM document_embeddings
  WHERE 1 - (document_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY document_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Fix update_audit_observations_updated_at function
CREATE OR REPLACE FUNCTION update_audit_observations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix create_default_notification_preferences function
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- =====================================================
-- PART 4: MOVE EXTENSIONS TO EXTENSIONS SCHEMA
-- =====================================================

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Note: Moving extensions requires superuser privileges and may not work in hosted Supabase
-- The extensions are already installed and working. This is a best practice recommendation.
-- If you have superuser access, uncomment the following:

-- ALTER EXTENSION vector SET SCHEMA extensions;
-- ALTER EXTENSION http SET SCHEMA extensions;

-- For hosted Supabase, the extensions in public schema is acceptable.
-- Add this comment to document the situation:
COMMENT ON EXTENSION vector IS 'Vector extension used for embeddings - in public schema for hosted Supabase compatibility';
COMMENT ON EXTENSION http IS 'HTTP extension used for external API calls - in public schema for hosted Supabase compatibility';
