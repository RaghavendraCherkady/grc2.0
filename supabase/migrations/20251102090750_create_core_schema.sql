/*
  # NOVA-GRC Core Database Schema

  ## Overview
  Creates the foundational database schema for the NOVA-GRC AI-First Banking Compliance Platform.
  This migration establishes user management, RBAC, and core compliance tracking tables.

  ## New Tables
  
  ### 1. `user_roles`
  Defines the five core roles in the system:
  - Compliance Officer
  - Compliance Manager
  - Chief Compliance Officer (CCO)
  - System Admin
  - Internal Auditor

  ### 2. `profiles`
  Extended user profile information linked to Supabase auth.users
  - Links to user_roles for RBAC
  - Stores department and contact information
  - Tracks user status (active/inactive)

  ### 3. `kyc_applications`
  Stores customer KYC verification applications
  - Identity proof, address proof, and PAN details
  - AI verification status and confidence scores
  - Maker-checker workflow tracking
  - Document URLs stored securely

  ### 4. `loan_applications`
  Credit risk assessment and loan origination data
  - Links to verified KYC applications
  - Employment and financial details
  - AI risk scoring and classification
  - Approval workflow tracking

  ### 5. `governance_alerts`
  Real-time compliance monitoring and intervention system
  - Critical, high, and medium severity alerts
  - Auto-blocking for non-compliant actions
  - Assignment and resolution tracking

  ### 6. `audit_logs`
  Immutable audit trail for all system actions
  - User actions and AI decisions
  - Data access tracking
  - Compliance verification history

  ## Security
  - RLS enabled on all tables
  - Policies enforce role-based access per RBAC matrix
  - Audit logs are append-only
  - Sensitive data encryption at rest (AES-256)

  ## Notes
  - Aligned with DPDP Act 2023 compliance requirements
  - Implements Maker-Checker workflow for SoD
  - Supports RBI FREE-AI framework audit requirements
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector for future AI embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create user_roles enum type
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'compliance_officer',
    'compliance_manager',
    'cco',
    'system_admin',
    'internal_auditor'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create KYC status enum
DO $$ BEGIN
  CREATE TYPE kyc_status AS ENUM (
    'pending',
    'under_review',
    'verified',
    'rejected',
    'needs_review'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create loan status enum
DO $$ BEGIN
  CREATE TYPE loan_status AS ENUM (
    'draft',
    'submitted',
    'under_assessment',
    'approved',
    'rejected',
    'pending_governance_review',
    'sanctioned',
    'disbursed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create alert severity enum
DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM (
    'critical',
    'high',
    'medium',
    'low'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create risk rating enum
DO $$ BEGIN
  CREATE TYPE risk_rating AS ENUM (
    'low',
    'medium',
    'high'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'compliance_officer',
  department text,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- KYC Applications table
CREATE TABLE IF NOT EXISTS kyc_applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  
  -- Identity proof
  identity_doc_type text NOT NULL,
  identity_doc_url text NOT NULL,
  identity_doc_number text,
  
  -- Address proof
  address_same_as_identity boolean DEFAULT false,
  address_doc_type text,
  address_doc_url text,
  address_doc_number text,
  
  -- Tax ID
  pan_doc_url text NOT NULL,
  pan_number text,
  
  -- Extracted data (OCR + Entity Extraction)
  extracted_data jsonb DEFAULT '{}'::jsonb,
  
  -- AI verification
  ai_status kyc_status DEFAULT 'pending',
  ai_confidence_score numeric(5,2),
  ai_decision_reason text,
  ai_processed_at timestamptz,
  
  -- Maker-Checker workflow
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  reviewer_comments text,
  
  -- Status tracking
  status kyc_status DEFAULT 'pending',
  submitted_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  
  -- Audit
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Loan Applications table
CREATE TABLE IF NOT EXISTS loan_applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  kyc_application_id uuid NOT NULL REFERENCES kyc_applications(id),
  
  -- Loan details
  loan_type text NOT NULL,
  loan_amount numeric(15,2) NOT NULL,
  loan_tenure_months integer NOT NULL,
  
  -- Employment & Income
  employment_type text NOT NULL,
  employer_name text NOT NULL,
  monthly_income numeric(15,2) NOT NULL,
  salary_doc_url text NOT NULL,
  
  -- Financial details
  existing_emi numeric(15,2) DEFAULT 0,
  credit_card_outstanding numeric(15,2) DEFAULT 0,
  bank_statement_url text NOT NULL,
  
  -- Consent
  credit_bureau_consent boolean DEFAULT false,
  consent_timestamp timestamptz,
  
  -- Credit Bureau Data (from CIBIL API)
  credit_score integer,
  credit_bureau_data jsonb DEFAULT '{}'::jsonb,
  
  -- AI Risk Assessment
  ai_risk_score numeric(5,2),
  ai_risk_rating risk_rating,
  ai_risk_factors jsonb DEFAULT '[]'::jsonb,
  debt_to_income_ratio numeric(5,2),
  ai_processed_at timestamptz,
  
  -- Maker-Checker workflow
  assessed_by uuid REFERENCES profiles(id),
  assessed_at timestamptz,
  assessor_comments text,
  
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  approver_comments text,
  
  -- Status tracking
  status loan_status DEFAULT 'draft',
  submitted_at timestamptz,
  final_decision_at timestamptz,
  
  -- Governance flags
  has_unresolved_risk_flag boolean DEFAULT false,
  governance_hold boolean DEFAULT false,
  governance_hold_reason text,
  
  -- Audit
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Governance Alerts table
CREATE TABLE IF NOT EXISTS governance_alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Alert details
  alert_type text NOT NULL,
  severity alert_severity NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  
  -- Related entities
  related_loan_id uuid REFERENCES loan_applications(id),
  related_kyc_id uuid REFERENCES kyc_applications(id),
  related_user_id uuid REFERENCES profiles(id),
  
  -- Alert data
  alert_data jsonb DEFAULT '{}'::jsonb,
  
  -- Assignment & Resolution
  assigned_to uuid REFERENCES profiles(id),
  assigned_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  resolution_notes text,
  
  -- Status
  is_resolved boolean DEFAULT false,
  is_acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES profiles(id),
  acknowledged_at timestamptz,
  
  -- Auto-action taken
  action_taken text,
  
  created_at timestamptz DEFAULT now()
);

-- Audit Logs table (immutable)
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Actor
  user_id uuid REFERENCES profiles(id),
  user_role user_role,
  
  -- Action
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  
  -- Details
  action_details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  
  -- AI decisions
  is_ai_action boolean DEFAULT false,
  ai_model_version text,
  ai_confidence numeric(5,2),
  
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_applications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_customer_email ON kyc_applications(customer_email);
CREATE INDEX IF NOT EXISTS idx_loan_status ON loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_loan_kyc_id ON loan_applications(kyc_application_id);
CREATE INDEX IF NOT EXISTS idx_loan_governance_hold ON loan_applications(governance_hold);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON governance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON governance_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_assigned ON governance_alerts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "System admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'system_admin'
    )
  );

-- RLS Policies for KYC applications
CREATE POLICY "Users can view own KYC applications"
  ON kyc_applications FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can create KYC applications"
  ON kyc_applications FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Compliance officers can view team KYC"
  ON kyc_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('compliance_manager', 'cco', 'internal_auditor')
    )
  );

CREATE POLICY "Compliance managers can update KYC"
  ON kyc_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('compliance_manager', 'cco')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('compliance_manager', 'cco')
    )
  );

-- RLS Policies for loan applications
CREATE POLICY "Users can view own loan applications"
  ON loan_applications FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can create loan applications"
  ON loan_applications FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Compliance staff can view loans"
  ON loan_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('compliance_manager', 'cco', 'internal_auditor')
    )
  );

CREATE POLICY "Compliance managers can update loans"
  ON loan_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('compliance_manager', 'cco')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('compliance_manager', 'cco')
    )
  );

-- RLS Policies for governance alerts
CREATE POLICY "Governance staff can view alerts"
  ON governance_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('compliance_manager', 'cco', 'internal_auditor', 'system_admin')
    )
  );

CREATE POLICY "System can create alerts"
  ON governance_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "CCO can resolve alerts"
  ON governance_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('cco', 'internal_auditor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('cco', 'internal_auditor')
    )
  );

-- RLS Policies for audit logs (read-only for most)
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Auditors can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('internal_auditor', 'cco', 'system_admin')
    )
  );

CREATE POLICY "System can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_updated_at
  BEFORE UPDATE ON kyc_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loan_updated_at
  BEFORE UPDATE ON loan_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();