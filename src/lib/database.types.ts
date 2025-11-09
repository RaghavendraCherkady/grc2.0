export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole =
  | 'compliance_officer'
  | 'compliance_manager'
  | 'cco'
  | 'system_admin'
  | 'internal_auditor';

export type KycStatus =
  | 'pending'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'needs_review';

export type LoanStatus =
  | 'draft'
  | 'submitted'
  | 'under_assessment'
  | 'approved'
  | 'rejected'
  | 'pending_governance_review'
  | 'sanctioned'
  | 'disbursed';

export type AlertSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

export type RiskRating =
  | 'low'
  | 'medium'
  | 'high';

export interface ExtractedKYCData {
  identityProof?: {
    documentNumber: string;
    fullName: string;
    dateOfBirth: string;
    fatherName?: string;
    address?: string;
  };
  addressProof?: {
    fullAddress: string;
    pinCode: string;
  };
  taxId?: {
    panNumber: string;
    fullName: string;
  };
  ocrConfidence?: number;
}

export interface KYCFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  identityDocType: string;
  identityFile: File | null;
  identityDocNumber?: string;
  identityFullName?: string;
  identityDOB?: string;
  identityFatherName?: string;
  addressSameAsIdentity: boolean;
  addressDocType: string;
  addressFile: File | null;
  addressDocNumber?: string;
  fullAddress?: string;
  pinCode?: string;
  panFile: File | null;
  panNumber?: string;
  panFullName?: string;
  extractedData?: ExtractedKYCData;
  verificationResults?: any[];
  requiresManualReview?: boolean;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          department: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          department?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          department?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      kyc_applications: {
        Row: {
          id: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          identity_doc_type: string;
          identity_doc_url: string;
          identity_doc_number: string | null;
          address_same_as_identity: boolean;
          address_doc_type: string | null;
          address_doc_url: string | null;
          address_doc_number: string | null;
          pan_doc_url: string;
          pan_number: string | null;
          extracted_data: Json;
          ai_status: KycStatus;
          ai_confidence_score: number | null;
          ai_decision_reason: string | null;
          ai_processed_at: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          reviewer_comments: string | null;
          status: KycStatus;
          submitted_at: string;
          verified_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          identity_doc_type: string;
          identity_doc_url: string;
          identity_doc_number?: string | null;
          address_same_as_identity?: boolean;
          address_doc_type?: string | null;
          address_doc_url?: string | null;
          address_doc_number?: string | null;
          pan_doc_url: string;
          pan_number?: string | null;
          extracted_data?: Json;
          ai_status?: KycStatus;
          ai_confidence_score?: number | null;
          ai_decision_reason?: string | null;
          ai_processed_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reviewer_comments?: string | null;
          status?: KycStatus;
          submitted_at?: string;
          verified_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string;
          identity_doc_type?: string;
          identity_doc_url?: string;
          identity_doc_number?: string | null;
          address_same_as_identity?: boolean;
          address_doc_type?: string | null;
          address_doc_url?: string | null;
          address_doc_number?: string | null;
          pan_doc_url?: string;
          pan_number?: string | null;
          extracted_data?: Json;
          ai_status?: KycStatus;
          ai_confidence_score?: number | null;
          ai_decision_reason?: string | null;
          ai_processed_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reviewer_comments?: string | null;
          status?: KycStatus;
          submitted_at?: string;
          verified_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      loan_applications: {
        Row: {
          id: string;
          kyc_application_id: string;
          loan_type: string;
          loan_amount: number;
          loan_tenure_months: number;
          employment_type: string;
          employer_name: string;
          monthly_income: number;
          salary_doc_url: string;
          existing_emi: number;
          credit_card_outstanding: number;
          bank_statement_url: string;
          credit_bureau_consent: boolean;
          consent_timestamp: string | null;
          credit_score: number | null;
          credit_bureau_data: Json;
          ai_risk_score: number | null;
          ai_risk_rating: RiskRating | null;
          ai_risk_factors: Json;
          debt_to_income_ratio: number | null;
          ai_processed_at: string | null;
          assessed_by: string | null;
          assessed_at: string | null;
          assessor_comments: string | null;
          approved_by: string | null;
          approved_at: string | null;
          approver_comments: string | null;
          status: LoanStatus;
          submitted_at: string | null;
          final_decision_at: string | null;
          has_unresolved_risk_flag: boolean;
          governance_hold: boolean;
          governance_hold_reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kyc_application_id: string;
          loan_type: string;
          loan_amount: number;
          loan_tenure_months: number;
          employment_type: string;
          employer_name: string;
          monthly_income: number;
          salary_doc_url: string;
          existing_emi?: number;
          credit_card_outstanding?: number;
          bank_statement_url: string;
          credit_bureau_consent?: boolean;
          consent_timestamp?: string | null;
          credit_score?: number | null;
          credit_bureau_data?: Json;
          ai_risk_score?: number | null;
          ai_risk_rating?: RiskRating | null;
          ai_risk_factors?: Json;
          debt_to_income_ratio?: number | null;
          ai_processed_at?: string | null;
          assessed_by?: string | null;
          assessed_at?: string | null;
          assessor_comments?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          approver_comments?: string | null;
          status?: LoanStatus;
          submitted_at?: string | null;
          final_decision_at?: string | null;
          has_unresolved_risk_flag?: boolean;
          governance_hold?: boolean;
          governance_hold_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kyc_application_id?: string;
          loan_type?: string;
          loan_amount?: number;
          loan_tenure_months?: number;
          employment_type?: string;
          employer_name?: string;
          monthly_income?: number;
          salary_doc_url?: string;
          existing_emi?: number;
          credit_card_outstanding?: number;
          bank_statement_url?: string;
          credit_bureau_consent?: boolean;
          consent_timestamp?: string | null;
          credit_score?: number | null;
          credit_bureau_data?: Json;
          ai_risk_score?: number | null;
          ai_risk_rating?: RiskRating | null;
          ai_risk_factors?: Json;
          debt_to_income_ratio?: number | null;
          ai_processed_at?: string | null;
          assessed_by?: string | null;
          assessed_at?: string | null;
          assessor_comments?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          approver_comments?: string | null;
          status?: LoanStatus;
          submitted_at?: string | null;
          final_decision_at?: string | null;
          has_unresolved_risk_flag?: boolean;
          governance_hold?: boolean;
          governance_hold_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      governance_alerts: {
        Row: {
          id: string;
          alert_type: string;
          severity: AlertSeverity;
          title: string;
          description: string;
          related_loan_id: string | null;
          related_kyc_id: string | null;
          related_user_id: string | null;
          alert_data: Json;
          assigned_to: string | null;
          assigned_at: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          resolution_notes: string | null;
          is_resolved: boolean;
          is_acknowledged: boolean;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          action_taken: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          alert_type: string;
          severity: AlertSeverity;
          title: string;
          description: string;
          related_loan_id?: string | null;
          related_kyc_id?: string | null;
          related_user_id?: string | null;
          alert_data?: Json;
          assigned_to?: string | null;
          assigned_at?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          resolution_notes?: string | null;
          is_resolved?: boolean;
          is_acknowledged?: boolean;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          action_taken?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          alert_type?: string;
          severity?: AlertSeverity;
          title?: string;
          description?: string;
          related_loan_id?: string | null;
          related_kyc_id?: string | null;
          related_user_id?: string | null;
          alert_data?: Json;
          assigned_to?: string | null;
          assigned_at?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          resolution_notes?: string | null;
          is_resolved?: boolean;
          is_acknowledged?: boolean;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          action_taken?: string | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          user_role: UserRole | null;
          action_type: string;
          entity_type: string;
          entity_id: string | null;
          action_details: Json;
          ip_address: string | null;
          user_agent: string | null;
          is_ai_action: boolean;
          ai_model_version: string | null;
          ai_confidence: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          user_role?: UserRole | null;
          action_type: string;
          entity_type: string;
          entity_id?: string | null;
          action_details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          is_ai_action?: boolean;
          ai_model_version?: string | null;
          ai_confidence?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          user_role?: UserRole | null;
          action_type?: string;
          entity_type?: string;
          entity_id?: string | null;
          action_details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          is_ai_action?: boolean;
          ai_model_version?: string | null;
          ai_confidence?: number | null;
          created_at?: string;
        };
      };
    };
  };
}
