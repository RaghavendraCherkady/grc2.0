/*
  # Fix INSERT Policies for KYC and Loan Applications

  ## Summary
  Adds missing INSERT policies to allow compliance managers and system admins
  to create KYC and loan applications.

  ## Changes
  - Add INSERT policy for compliance managers on kyc_applications
  - Add INSERT policy for system admins on kyc_applications
  - Add INSERT policy for compliance managers on loan_applications
  - Add INSERT policy for system admins on loan_applications

  ## Notes
  Compliance officers already have INSERT permissions.
  CCO and Internal Auditor intentionally do NOT have INSERT permissions.
*/

-- =====================================================
-- KYC APPLICATIONS INSERT POLICIES
-- =====================================================

-- Compliance Managers can create KYC applications
CREATE POLICY "Compliance managers can create KYC"
  ON kyc_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'compliance_manager'
    )
  );

-- System Admins can create KYC applications
CREATE POLICY "System admin can create KYC"
  ON kyc_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- =====================================================
-- LOAN APPLICATIONS INSERT POLICIES
-- =====================================================

-- Compliance Managers can create loan applications
CREATE POLICY "Compliance managers can create loans"
  ON loan_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'compliance_manager'
    )
  );

-- System Admins can create loan applications
CREATE POLICY "System admin can create loans"
  ON loan_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );
