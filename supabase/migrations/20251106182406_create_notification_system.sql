/*
  # Integrated Notification System - Voice, SMS & Email

  ## Summary
  Creates a comprehensive notification system for KYC alerts, loan EMI reminders,
  and payment acknowledgements. Supports multiple channels: email, SMS, and voice calls.

  ## Tables Created

  ### 1. notification_preferences
  Stores user preferences for notification channels
  - Fields: id, user_id, email_enabled, sms_enabled, voice_enabled, 
    kyc_alerts, loan_alerts, emi_reminders, payment_alerts,
    phone_number, alternate_email, preferred_time, created_at, updated_at

  ### 2. notifications
  Central notification log with multi-channel delivery tracking
  - Fields: id, user_id, type, channel, title, message, status,
    metadata, sent_at, delivered_at, read_at, error_message, created_at

  ### 3. notification_templates
  Reusable templates for different notification types
  - Fields: id, template_code, channel, subject, body, variables,
    is_active, created_at, updated_at

  ### 4. emi_schedules
  Stores loan EMI schedules for reminder system
  - Fields: id, loan_application_id, emi_number, due_date, amount,
    status, paid_at, reminder_sent, created_at, updated_at

  ## Security
  - Enable RLS on all tables
  - Users can only view/edit their own preferences
  - System can create notifications
  - Compliance staff can view all notifications for audit

  ## Indexes
  - Index on user_id for fast lookup
  - Index on status and sent_at for querying pending notifications
  - Index on due_date for EMI reminder queries
*/

-- =====================================================
-- NOTIFICATION PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Channel preferences
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT true,
  voice_enabled boolean DEFAULT false,
  
  -- Notification type preferences
  kyc_alerts boolean DEFAULT true,
  loan_alerts boolean DEFAULT true,
  emi_reminders boolean DEFAULT true,
  payment_alerts boolean DEFAULT true,
  
  -- Contact details
  phone_number text,
  alternate_email text,
  preferred_time text DEFAULT 'morning',
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================

CREATE TYPE notification_type AS ENUM (
  'kyc_submitted',
  'kyc_approved',
  'kyc_rejected',
  'kyc_needs_review',
  'loan_submitted',
  'loan_approved',
  'loan_rejected',
  'emi_reminder_7days',
  'emi_reminder_3days',
  'emi_reminder_1day',
  'emi_overdue',
  'payment_received',
  'payment_failed'
);

CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'voice');

CREATE TYPE notification_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'failed',
  'read'
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Notification details
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  status notification_status DEFAULT 'pending',
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Delivery tracking
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  error_message text,
  
  -- Reference to source entity
  entity_type text,
  entity_id uuid,
  
  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- NOTIFICATION TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code text NOT NULL UNIQUE,
  channel notification_channel NOT NULL,
  
  -- Template content
  subject text,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  
  -- Status
  is_active boolean DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- EMI SCHEDULES TABLE
-- =====================================================

CREATE TYPE emi_status AS ENUM ('upcoming', 'paid', 'overdue', 'waived');

CREATE TABLE IF NOT EXISTS emi_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_application_id uuid NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  
  -- EMI details
  emi_number integer NOT NULL,
  due_date date NOT NULL,
  amount numeric(15,2) NOT NULL,
  
  -- Status
  status emi_status DEFAULT 'upcoming',
  paid_at timestamptz,
  payment_reference text,
  
  -- Reminder tracking
  reminder_sent_7days boolean DEFAULT false,
  reminder_sent_3days boolean DEFAULT false,
  reminder_sent_1day boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS notification_preferences_user_id_idx 
  ON notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx 
  ON notifications(user_id);

CREATE INDEX IF NOT EXISTS notifications_status_sent_idx 
  ON notifications(status, sent_at);

CREATE INDEX IF NOT EXISTS notifications_type_idx 
  ON notifications(type);

CREATE INDEX IF NOT EXISTS emi_schedules_loan_id_idx 
  ON emi_schedules(loan_application_id);

CREATE INDEX IF NOT EXISTS emi_schedules_due_date_idx 
  ON emi_schedules(due_date, status);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE emi_schedules ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- NOTIFICATION PREFERENCES POLICIES
-- =====================================================

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can create own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- NOTIFICATIONS POLICIES
-- =====================================================

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Compliance staff can view all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('compliance_manager', 'cco', 'internal_auditor', 'system_admin')
    )
  );

-- =====================================================
-- NOTIFICATION TEMPLATES POLICIES
-- =====================================================

CREATE POLICY "All users can view active templates"
  ON notification_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "System admin can manage templates"
  ON notification_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- =====================================================
-- EMI SCHEDULES POLICIES
-- =====================================================

CREATE POLICY "Users can view own EMI schedules"
  ON emi_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM loan_applications
      WHERE loan_applications.id = emi_schedules.loan_application_id
      AND loan_applications.created_by = auth.uid()
    )
  );

CREATE POLICY "Compliance staff can view all EMI schedules"
  ON emi_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('compliance_officer', 'compliance_manager', 'cco', 'system_admin')
    )
  );

CREATE POLICY "System can manage EMI schedules"
  ON emi_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('system_admin', 'compliance_manager')
    )
  );

-- =====================================================
-- SEED DEFAULT NOTIFICATION TEMPLATES
-- =====================================================

INSERT INTO notification_templates (template_code, channel, subject, body, variables) VALUES
-- KYC Email Templates
('kyc_submitted_email', 'email', 'KYC Application Submitted - {{applicationId}}', 
'Dear {{customerName}},

Your KYC application has been successfully submitted for verification.

Application ID: {{applicationId}}
Submission Date: {{submittedAt}}

Our compliance team will review your documents within 2-3 business days. You will receive a notification once the review is complete.

Thank you for choosing NOVA-GRC.

Best regards,
NOVA-GRC Compliance Team', 
'["customerName", "applicationId", "submittedAt"]'::jsonb),

('kyc_approved_email', 'email', 'KYC Application Approved - {{applicationId}}', 
'Dear {{customerName}},

Congratulations! Your KYC application has been approved.

Application ID: {{applicationId}}
Approval Date: {{approvedAt}}

You can now proceed with loan applications and other financial services.

Thank you for your patience.

Best regards,
NOVA-GRC Compliance Team', 
'["customerName", "applicationId", "approvedAt"]'::jsonb),

('kyc_rejected_email', 'email', 'KYC Application Requires Attention - {{applicationId}}', 
'Dear {{customerName}},

Your KYC application requires additional attention.

Application ID: {{applicationId}}
Review Date: {{reviewedAt}}
Reason: {{reason}}

Please contact our support team or resubmit your application with the required corrections.

Best regards,
NOVA-GRC Compliance Team', 
'["customerName", "applicationId", "reviewedAt", "reason"]'::jsonb),

-- Loan Email Templates
('loan_approved_email', 'email', 'Loan Application Approved - {{loanId}}', 
'Dear {{customerName}},

Great news! Your loan application has been approved.

Loan ID: {{loanId}}
Loan Type: {{loanType}}
Approved Amount: ₹{{loanAmount}}
Tenure: {{tenure}} months
Interest Rate: {{interestRate}}%

Your first EMI of ₹{{emiAmount}} is due on {{firstEmiDate}}.

Our team will contact you shortly to complete the disbursement process.

Best regards,
NOVA-GRC Lending Team', 
'["customerName", "loanId", "loanType", "loanAmount", "tenure", "interestRate", "emiAmount", "firstEmiDate"]'::jsonb),

-- EMI Reminder Templates
('emi_reminder_7days_email', 'email', 'EMI Payment Reminder - Due in 7 Days', 
'Dear {{customerName}},

This is a friendly reminder that your EMI payment is due in 7 days.

Loan ID: {{loanId}}
EMI Number: {{emiNumber}}
Amount Due: ₹{{amount}}
Due Date: {{dueDate}}

Please ensure sufficient funds are available in your account.

To make a payment, log in to your account or contact our support team.

Thank you,
NOVA-GRC Collections Team', 
'["customerName", "loanId", "emiNumber", "amount", "dueDate"]'::jsonb),

('emi_reminder_1day_email', 'email', 'URGENT: EMI Payment Due Tomorrow', 
'Dear {{customerName}},

URGENT REMINDER: Your EMI payment is due tomorrow.

Loan ID: {{loanId}}
EMI Number: {{emiNumber}}
Amount Due: ₹{{amount}}
Due Date: {{dueDate}}

Please make your payment immediately to avoid late fees and negative credit reporting.

For assistance, contact us at: support@novagrc.com

Thank you,
NOVA-GRC Collections Team', 
'["customerName", "loanId", "emiNumber", "amount", "dueDate"]'::jsonb),

('payment_received_email', 'email', 'Payment Received - Thank You', 
'Dear {{customerName}},

Thank you! We have received your EMI payment.

Loan ID: {{loanId}}
Payment Amount: ₹{{amount}}
Payment Date: {{paymentDate}}
Payment Reference: {{reference}}
Remaining EMIs: {{remainingEmis}}

Your next EMI of ₹{{nextEmiAmount}} is due on {{nextDueDate}}.

Thank you for your timely payment.

Best regards,
NOVA-GRC Collections Team', 
'["customerName", "loanId", "amount", "paymentDate", "reference", "remainingEmis", "nextEmiAmount", "nextDueDate"]'::jsonb),

-- SMS Templates
('kyc_approved_sms', 'sms', NULL, 
'NOVA-GRC: Your KYC ({{applicationId}}) has been APPROVED. You can now apply for loans. Thank you!', 
'["applicationId"]'::jsonb),

('loan_approved_sms', 'sms', NULL, 
'NOVA-GRC: Loan Approved! Amount: Rs.{{loanAmount}}, Tenure: {{tenure}}mo. First EMI Rs.{{emiAmount}} due {{firstEmiDate}}. Congratulations!', 
'["loanAmount", "tenure", "emiAmount", "firstEmiDate"]'::jsonb),

('emi_reminder_1day_sms', 'sms', NULL, 
'NOVA-GRC URGENT: Your EMI of Rs.{{amount}} is due TOMORROW ({{dueDate}}). Please pay to avoid late charges.', 
'["amount", "dueDate"]'::jsonb),

('payment_received_sms', 'sms', NULL, 
'NOVA-GRC: Payment of Rs.{{amount}} received. Ref: {{reference}}. Next EMI Rs.{{nextEmiAmount}} due {{nextDueDate}}. Thank you!', 
'["amount", "reference", "nextEmiAmount", "nextDueDate"]'::jsonb),

-- Voice Templates
('emi_reminder_1day_voice', 'voice', NULL, 
'Hello {{customerName}}. This is an urgent reminder from NOVA GRC. Your loan EMI payment of rupees {{amount}} is due tomorrow on {{dueDate}}. Please make your payment immediately to avoid late fees. Thank you.', 
'["customerName", "amount", "dueDate"]'::jsonb),

('emi_overdue_voice', 'voice', NULL, 
'Hello {{customerName}}. This is NOVA GRC. Your loan EMI payment of rupees {{amount}} is now overdue since {{dueDate}}. Please make an immediate payment to avoid additional charges and credit score impact. For assistance call our helpline. Thank you.', 
'["customerName", "amount", "dueDate"]'::jsonb)

ON CONFLICT (template_code) DO NOTHING;

-- =====================================================
-- FUNCTION TO AUTO-CREATE NOTIFICATION PREFERENCES
-- =====================================================

CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_notification_preferences_on_profile_creation
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();
