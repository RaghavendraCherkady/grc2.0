/*
  # Update RBAC Policies

  ## Summary
  Updates Row Level Security policies to match new RBAC requirements:

  ## Policy Changes by Role

  ### 1. Compliance Officer (UNCHANGED)
  - Can view and create their own KYC applications
  - Can view and create their own loan applications
  - Can view their own audit logs

  ### 2. Compliance Manager (UPDATED)
  - Can view **and approve** all KYC applications
  - Can view **and approve** all loan applications
  - Can view governance alerts
  - Can update KYC and loan application statuses

  ### 3. Chief Compliance Officer / CCO (UPDATED)
  - Full compliance access (view all)
  - Can resolve governance alerts
  - **CANNOT** create/fill KYC applications
  - **CANNOT** create/fill loan applications
  - Can only view and approve/reject applications

  ### 4. Internal Auditor (UPDATED)
  - Can view all audit logs, alerts, and applications
  - Can resolve alerts
  - **CANNOT** access KYC application form
  - **CANNOT** access loan application form
  - Read-only access to KYC and loan data

  ### 5. System Administrator (UPDATED)
  - Full system access including all audit logs and alerts
  - Can view all applications
  - Can manage all data

  ## Changes Made
  - Drop all existing policies
  - Recreate policies with updated permissions
  - Add new approval permissions for compliance managers
  - Restrict CCO and Internal Auditor from creating applications
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own KYC applications" ON kyc_applications;
DROP POLICY IF EXISTS "Users can create KYC applications" ON kyc_applications;
DROP POLICY IF EXISTS "Compliance officers can view team KYC" ON kyc_applications;
DROP POLICY IF EXISTS "Compliance managers can update KYC" ON kyc_applications;

DROP POLICY IF EXISTS "Users can view own loan applications" ON loan_applications;
DROP POLICY IF EXISTS "Users can create loan applications" ON loan_applications;
DROP POLICY IF EXISTS "Compliance staff can view loans" ON loan_applications;
DROP POLICY IF EXISTS "Compliance managers can update loans" ON loan_applications;

DROP POLICY IF EXISTS "Governance staff can view alerts" ON governance_alerts;
DROP POLICY IF EXISTS "CCO can resolve alerts" ON governance_alerts;
DROP POLICY IF EXISTS "System can create alerts" ON governance_alerts;

DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Auditors can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON audit_logs;

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- KYC APPLICATIONS TABLE POLICIES
-- =====================================================

-- Compliance Officers: Can view and create their own KYC applications
CREATE POLICY "Compliance officers can view own KYC"
  ON kyc_applications FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'compliance_officer'
    )
  );

CREATE POLICY "Compliance officers can create KYC"
  ON kyc_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'compliance_officer'
    )
  );

-- Compliance Managers: Can view and approve all KYC applications
CREATE POLICY "Compliance managers can view all KYC"
  ON kyc_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'compliance_manager'
    )
  );

CREATE POLICY "Compliance managers can update KYC"
  ON kyc_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'compliance_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'compliance_manager'
    )
  );

-- CCO: Can view all KYC but CANNOT create
CREATE POLICY "CCO can view all KYC"
  ON kyc_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cco'
    )
  );

CREATE POLICY "CCO can update KYC status"
  ON kyc_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cco'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cco'
    )
  );

-- Internal Auditor: Can view all KYC but CANNOT create or update
CREATE POLICY "Internal auditors can view all KYC"
  ON kyc_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'internal_auditor'
    )
  );

-- System Admin: Can view and manage all KYC
CREATE POLICY "System admin can view all KYC"
  ON kyc_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "System admin can update KYC"
  ON kyc_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- =====================================================
-- LOAN APPLICATIONS TABLE POLICIES
-- =====================================================

-- Compliance Officers: Can view and create their own loan applications
CREATE POLICY "Compliance officers can view own loans"
  ON loan_applications FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'compliance_officer'
    )
  );

CREATE POLICY "Compliance officers can create loans"
  ON loan_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'compliance_officer'
    )
  );

-- Compliance Managers: Can view and approve all loan applications
CREATE POLICY "Compliance managers can view all loans"
  ON loan_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'compliance_manager'
    )
  );

CREATE POLICY "Compliance managers can update loans"
  ON loan_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'compliance_manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'compliance_manager'
    )
  );

-- CCO: Can view all loans but CANNOT create
CREATE POLICY "CCO can view all loans"
  ON loan_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cco'
    )
  );

CREATE POLICY "CCO can update loan status"
  ON loan_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cco'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cco'
    )
  );

-- Internal Auditor: Can view all loans but CANNOT create or update
CREATE POLICY "Internal auditors can view all loans"
  ON loan_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'internal_auditor'
    )
  );

-- System Admin: Can view and manage all loans
CREATE POLICY "System admin can view all loans"
  ON loan_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "System admin can update loans"
  ON loan_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- =====================================================
-- GOVERNANCE ALERTS TABLE POLICIES
-- =====================================================

-- Compliance Managers: Can view alerts
CREATE POLICY "Compliance managers can view alerts"
  ON governance_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'compliance_manager'
    )
  );

-- CCO: Can view and resolve alerts
CREATE POLICY "CCO can view alerts"
  ON governance_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cco'
    )
  );

CREATE POLICY "CCO can resolve alerts"
  ON governance_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cco'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cco'
    )
  );

-- Internal Auditor: Can view and resolve alerts
CREATE POLICY "Internal auditors can view alerts"
  ON governance_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'internal_auditor'
    )
  );

CREATE POLICY "Internal auditors can resolve alerts"
  ON governance_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'internal_auditor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'internal_auditor'
    )
  );

-- System Admin: Can view and manage all alerts
CREATE POLICY "System admin can view alerts"
  ON governance_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "System admin can update alerts"
  ON governance_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- System can create alerts
CREATE POLICY "System can create alerts"
  ON governance_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- AUDIT LOGS TABLE POLICIES
-- =====================================================

-- Compliance Officers: Can view their own audit logs
CREATE POLICY "Compliance officers can view own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'compliance_officer'
    )
  );

-- Compliance Managers: Can view their own audit logs
CREATE POLICY "Compliance managers can view own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'compliance_manager'
    )
  );

-- CCO: Can view all audit logs
CREATE POLICY "CCO can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cco'
    )
  );

-- Internal Auditor: Can view all audit logs
CREATE POLICY "Internal auditors can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'internal_auditor'
    )
  );

-- System Admin: Can view all audit logs
CREATE POLICY "System admin can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- System can create audit logs
CREATE POLICY "System can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
