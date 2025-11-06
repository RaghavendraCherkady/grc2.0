import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Home,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle
} from 'lucide-react';
import { DocumentPreview } from '../DocumentPreview';
import type { KycStatus } from '../../lib/database.types';

interface KYCDetailData {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  identity_doc_type: string;
  identity_doc_url: string;
  identity_doc_number: string;
  address_same_as_identity: boolean;
  address_doc_type: string | null;
  address_doc_url: string | null;
  pan_number: string;
  pan_doc_url: string;
  status: KycStatus;
  ai_confidence_score: number | null;
  ai_verification_notes: string | null;
  submitted_at: string;
  created_by: string;
}

interface KYCDetailViewProps {
  kycId: string;
  onClose: () => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function KYCDetailView({ kycId, onClose, onApprove, onReject }: KYCDetailViewProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kycData, setKycData] = useState<KYCDetailData | null>(null);
  const [error, setError] = useState('');
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    fetchKYCDetails();
  }, [kycId]);

  const fetchKYCDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('kyc_applications')
        .select('*')
        .eq('id', kycId)
        .single();

      if (error) throw error;
      setKycData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load KYC details');
    } finally {
      setLoading(false);
    }
  };

  const canReview = profile?.role === 'compliance_manager' || profile?.role === 'cco';

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading KYC details...</p>
        </div>
      </div>
    );
  }

  if (error || !kycData) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-700 text-center mb-4">{error || 'KYC application not found'}</p>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8">
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">KYC Application Details</h2>
              <p className="text-sm text-slate-600 mt-1">
                Submitted on {new Date(kycData.submitted_at).toLocaleString('en-IN')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-6 h-6 text-slate-600" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="bg-slate-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Full Name</label>
                  <p className="text-slate-900 mt-1">{kycData.customer_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    Email
                  </label>
                  <p className="text-slate-900 mt-1">{kycData.customer_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    Phone
                  </label>
                  <p className="text-slate-900 mt-1">{kycData.customer_phone}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    Address
                  </label>
                  <p className="text-slate-900 mt-1">{kycData.customer_address}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                Identity Documents
              </h3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Document Type</label>
                      <p className="text-slate-900">{kycData.identity_doc_type}</p>
                    </div>
                    <button
                      onClick={() => setPreviewDoc({
                        url: kycData.identity_doc_url,
                        title: `${kycData.identity_doc_type} - ${kycData.customer_name}`
                      })}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Eye className="w-4 h-4" />
                      View Document
                    </button>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Document Number</label>
                    <p className="text-slate-900 font-mono">{kycData.identity_doc_number}</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-sm font-medium text-slate-700">PAN Card</label>
                      <p className="text-slate-900 font-mono">{kycData.pan_number}</p>
                    </div>
                    <button
                      onClick={() => setPreviewDoc({
                        url: kycData.pan_doc_url,
                        title: `PAN Card - ${kycData.customer_name}`
                      })}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Eye className="w-4 h-4" />
                      View PAN
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {!kycData.address_same_as_identity && kycData.address_doc_url && (
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <Home className="w-5 h-5 mr-2 text-green-600" />
                  Address Proof
                </h3>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Document Type</label>
                      <p className="text-slate-900">{kycData.address_doc_type || 'N/A'}</p>
                    </div>
                    <button
                      onClick={() => setPreviewDoc({
                        url: kycData.address_doc_url!,
                        title: `Address Proof - ${kycData.customer_name}`
                      })}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      <Eye className="w-4 h-4" />
                      View Document
                    </button>
                  </div>
                </div>
              </div>
            )}

            {kycData.ai_confidence_score !== null && (
              <div className="bg-amber-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-amber-600" />
                  AI Verification Analysis
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Confidence Score</label>
                    <div className="flex items-center mt-1">
                      <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            kycData.ai_confidence_score >= 80
                              ? 'bg-green-600'
                              : kycData.ai_confidence_score >= 60
                              ? 'bg-amber-600'
                              : 'bg-red-600'
                          }`}
                          style={{ width: `${kycData.ai_confidence_score}%` }}
                        />
                      </div>
                      <span className="ml-3 font-semibold text-slate-900">
                        {kycData.ai_confidence_score.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {kycData.ai_verification_notes && (
                    <div>
                      <label className="text-sm font-medium text-slate-700">AI Notes</label>
                      <p className="text-slate-900 mt-1 text-sm bg-white rounded-lg p-3">
                        {kycData.ai_verification_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {canReview && kycData.status !== 'verified' && kycData.status !== 'rejected' && (
            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Review this KYC application and make a decision
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      onReject?.(kycId);
                      onClose();
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      onApprove?.(kycId);
                      onClose();
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Approve
                  </button>
                </div>
              </div>
            </div>
          )}

          {(kycData.status === 'verified' || kycData.status === 'rejected') && (
            <div className="p-6 border-t border-slate-200">
              <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg ${
                kycData.status === 'verified'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {kycData.status === 'verified' ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">This KYC has been verified</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">This KYC has been rejected</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {previewDoc && (
        <DocumentPreview
          url={previewDoc.url}
          title={previewDoc.title}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </>
  );
}
