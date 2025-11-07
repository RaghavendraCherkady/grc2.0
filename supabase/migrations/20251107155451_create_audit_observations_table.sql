-- Create Audit Observations Table
-- 1. New Tables: audit_observations
-- 2. Security: Enable RLS with policies
-- 3. Indexes: For performance

-- Create observation_severity enum
DO $$ BEGIN
  CREATE TYPE observation_severity AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create observation_status enum
DO $$ BEGIN
  CREATE TYPE observation_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'deferred');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create audit_observations table
CREATE TABLE IF NOT EXISTS audit_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auditor_id uuid REFERENCES profiles(id),
  observation_type text NOT NULL,
  severity observation_severity NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  area_audited text NOT NULL,
  related_entity_type text,
  related_entity_id uuid,
  related_user_id uuid REFERENCES profiles(id),
  evidence jsonb DEFAULT '[]'::jsonb,
  recommendations text,
  management_response text,
  action_plan text,
  responsible_party text,
  target_completion_date date,
  status observation_status DEFAULT 'open',
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE audit_observations ENABLE ROW LEVEL SECURITY;

-- Policies for internal_auditor - can create and view all observations
CREATE POLICY "Internal auditors can view all observations"
  ON audit_observations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('internal_auditor', 'cco', 'system_admin')
    )
  );

CREATE POLICY "Internal auditors can create observations"
  ON audit_observations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('internal_auditor', 'cco', 'system_admin')
    )
    AND auditor_id = auth.uid()
  );

CREATE POLICY "Internal auditors can update their observations"
  ON audit_observations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('internal_auditor', 'cco', 'system_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('internal_auditor', 'cco', 'system_admin')
    )
  );

-- Compliance managers can view and respond to observations
CREATE POLICY "Compliance managers can view observations"
  ON audit_observations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('compliance_manager', 'cco', 'system_admin')
    )
  );

CREATE POLICY "Compliance managers can update management response"
  ON audit_observations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('compliance_manager', 'cco', 'system_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('compliance_manager', 'cco', 'system_admin')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_observations_auditor_id ON audit_observations(auditor_id);
CREATE INDEX IF NOT EXISTS idx_audit_observations_status ON audit_observations(status);
CREATE INDEX IF NOT EXISTS idx_audit_observations_severity ON audit_observations(severity);
CREATE INDEX IF NOT EXISTS idx_audit_observations_created_at ON audit_observations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_observations_related_entity ON audit_observations(related_entity_type, related_entity_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_audit_observations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_audit_observations_updated_at
  BEFORE UPDATE ON audit_observations
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_observations_updated_at();
