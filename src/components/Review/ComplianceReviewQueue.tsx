import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, Eye, FileText, TrendingUp, Clock } from 'lucide-react';
import type { KycStatus, LoanStatus } from '../../lib/database.types';
import { KYCDetailView } from './KYCDetailView';

interface KYCApplication {
  id: string;
  customer_name: string;
  customer_email: string;
  status: KycStatus;
  ai_confidence_score: number | null;
  submitted_at: string;
}

interface LoanApplication {
  id: string;
  loan_type: string;
  loan_amount: number;
  status: LoanStatus;
  ai_risk_rating: string | null;
  ai_risk_score: number | null;
  submitted_at: string | null;
  kyc_applications: { customer_name: string };
}

export function ComplianceReviewQueue() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'kyc' | 'loans'>('kyc');
  const [kycApplications, setKycApplications] = useState<KYCApplication[]>([]);
  const [loanApplications, setLoanApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKycId, setSelectedKycId] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, [activeTab]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      if (activeTab === 'kyc') {
        const { data, error } = await supabase
          .from('kyc_applications')
          .select('id, customer_name, customer_email, status, ai_confidence_score, submitted_at')
          .in('status', ['pending', 'under_review', 'needs_review'])
          .order('submitted_at', { ascending: false });

        if (!error && data) {
          setKycApplications(data);
        }
      } else {
        const { data, error } = await supabase
          .from('loan_applications')
          .select(`
            id,
            loan_type,
            loan_amount,
            status,
            ai_risk_rating,
            ai_risk_score,
            submitted_at,
            kyc_applications(customer_name)
          `)
          .in('status', ['submitted', 'under_assessment', 'pending_governance_review'])
          .order('submitted_at', { ascending: false });

        if (!error && data) {
          setLoanApplications(data as any);
        }
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKycReview = async (id: string, decision: 'verified' | 'rejected') => {
    const { error } = await supabase
      .from('kyc_applications')
      .update({
        status: decision,
        reviewed_by: profile?.id,
        reviewed_at: new Date().toISOString(),
        verified_at: decision === 'verified' ? new Date().toISOString() : null,
      })
      .eq('id', id);

    if (!error) {
      fetchApplications();
    }
  };

  const handleLoanReview = async (id: string, decision: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('loan_applications')
      .update({
        status: decision,
        assessed_by: profile?.id,
        assessed_at: new Date().toISOString(),
        final_decision_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (!error) {
      fetchApplications();
    }
  };

  const canReview = profile?.role === 'compliance_manager' || profile?.role === 'cco';

  const getRiskColor = (rating: string | null) => {
    switch (rating) {
      case 'low': return 'text-green-700 bg-green-100';
      case 'medium': return 'text-amber-700 bg-amber-100';
      case 'high': return 'text-red-700 bg-red-100';
      default: return 'text-slate-700 bg-slate-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'submitted': return 'text-blue-700 bg-blue-100';
      case 'under_review':
      case 'under_assessment': return 'text-amber-700 bg-amber-100';
      case 'needs_review': return 'text-orange-700 bg-orange-100';
      case 'pending_governance_review': return 'text-red-700 bg-red-100';
      default: return 'text-slate-700 bg-slate-100';
    }
  };

  return (
    <>
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Review Queue</h1>
        <p className="text-slate-600 mt-1">Review and approve pending applications</p>
      </div>

      <div className="bg-white rounded-xl shadow-md">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('kyc')}
              className={`px-6 py-4 font-medium text-sm transition ${
                activeTab === 'kyc'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                KYC Applications ({kycApplications.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('loans')}
              className={`px-6 py-4 font-medium text-sm transition ${
                activeTab === 'loans'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Loan Applications ({loanApplications.length})
              </div>
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading applications...</p>
            </div>
          ) : activeTab === 'kyc' ? (
            <div className="space-y-4">
              {kycApplications.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-slate-600">No pending KYC applications</p>
                </div>
              ) : (
                kycApplications.map(app => (
                  <div key={app.id} className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="font-semibold text-slate-900">{app.customer_name}</h3>
                          <span className={`ml-3 text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(app.status)}`}>
                            {app.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{app.customer_email}</p>
                        <div className="flex items-center mt-2 text-sm text-slate-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(app.submitted_at).toLocaleString('en-IN')}
                        </div>
                        {app.ai_confidence_score && (
                          <p className="text-sm text-slate-600 mt-2">
                            AI Confidence: <span className="font-semibold">{app.ai_confidence_score.toFixed(1)}%</span>
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => setSelectedKycId(app.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {canReview && (
                          <>
                            <button
                              onClick={() => handleKycReview(app.id, 'verified')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                              title="Approve"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleKycReview(app.id, 'rejected')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Reject"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {loanApplications.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-slate-600">No pending loan applications</p>
                </div>
              ) : (
                loanApplications.map(app => (
                  <div key={app.id} className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="font-semibold text-slate-900">{app.kyc_applications.customer_name}</h3>
                          <span className={`ml-3 text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(app.status)}`}>
                            {app.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-slate-500">Loan Type</p>
                            <p className="text-sm font-medium text-slate-900">{app.loan_type}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Amount</p>
                            <p className="text-sm font-medium text-slate-900">
                              ₹{app.loan_amount.toLocaleString('en-IN')}
                            </p>
                          </div>
                          {app.ai_risk_rating && (
                            <div>
                              <p className="text-xs text-slate-500">AI Risk Rating</p>
                              <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${getRiskColor(app.ai_risk_rating)}`}>
                                {app.ai_risk_rating.toUpperCase()}
                              </span>
                            </div>
                          )}
                          {app.ai_risk_score && (
                            <div>
                              <p className="text-xs text-slate-500">Risk Score</p>
                              <p className="text-sm font-medium text-slate-900">{app.ai_risk_score.toFixed(1)}</p>
                            </div>
                          )}
                        </div>
                        {app.submitted_at && (
                          <div className="flex items-center mt-3 text-sm text-slate-500">
                            <Clock className="w-4 h-4 mr-1" />
                            {new Date(app.submitted_at).toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                      {canReview && (
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleLoanReview(app.id, 'approved')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Approve"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleLoanReview(app.id, 'rejected')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {selectedKycId && (
      <KYCDetailView
        kycId={selectedKycId}
        onClose={() => setSelectedKycId(null)}
        onApprove={(id) => handleKycReview(id, 'verified')}
        onReject={(id) => handleKycReview(id, 'rejected')}
      />
    )}
    </>
  );
}
