import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, AlertTriangle, FileText, TrendingUp, Clock, Target, Brain, Shield } from 'lucide-react';

interface VerificationLog {
  id: string;
  kyc_application_id: string;
  verification_step: string;
  ai_decision: string;
  confidence_score: number;
  reasoning: string;
  supporting_documents: any;
  created_at: string;
  customer_name?: string;
  customer_email?: string;
}

interface AIStats {
  totalVerifications: number;
  avgConfidence: number;
  autoApproved: number;
  manualReview: number;
  highConfidenceRate: number;
}

export function AIConfidenceView() {
  const [logs, setLogs] = useState<VerificationLog[]>([]);
  const [stats, setStats] = useState<AIStats>({
    totalVerifications: 0,
    avgConfidence: 0,
    autoApproved: 0,
    manualReview: 0,
    highConfidenceRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<VerificationLog | null>(null);

  useEffect(() => {
    fetchAIConfidenceData();
  }, []);

  const fetchAIConfidenceData = async () => {
    try {
      const { data: logsData, error: logsError } = await supabase
        .from('kyc_verification_logs')
        .select(`
          *,
          kyc_applications!inner(customer_name, customer_email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;

      const enrichedLogs = logsData?.map(log => ({
        ...log,
        customer_name: log.kyc_applications?.customer_name,
        customer_email: log.kyc_applications?.customer_email,
      })) || [];

      setLogs(enrichedLogs);

      if (enrichedLogs.length > 0) {
        const totalVerifications = enrichedLogs.length;
        const avgConfidence = enrichedLogs.reduce((sum, log) => sum + (log.confidence_score || 0), 0) / totalVerifications;
        const autoApproved = enrichedLogs.filter(log => log.ai_decision === 'auto_approved').length;
        const manualReview = enrichedLogs.filter(log => log.ai_decision.includes('manual_review')).length;
        const highConfidenceRate = (enrichedLogs.filter(log => (log.confidence_score || 0) >= 85).length / totalVerifications) * 100;

        setStats({
          totalVerifications,
          avgConfidence,
          autoApproved,
          manualReview,
          highConfidenceRate,
        });
      }
    } catch (error) {
      console.error('Error fetching AI confidence data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 80) return 'text-blue-600 bg-blue-50';
    if (score >= 70) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 70) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getDecisionBadgeColor = (decision: string) => {
    if (decision === 'auto_approved') return 'bg-green-100 text-green-800 border-green-200';
    if (decision === 'manual_review_recommended') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A4A55]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">AI Confidence Metrics & Methodology</h1>
        <p className="text-slate-600 mt-1">Understanding how AI evaluates and scores KYC applications</p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start space-x-4">
          <Brain className="w-10 h-10 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">AI Confidence Methodology</h2>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-start space-x-2">
                <Target className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Document Verification (40%):</strong> AI analyzes document authenticity, legibility, and validity using computer vision and OCR technology.
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Data Consistency (30%):</strong> Cross-validates information across multiple documents (name, DOB, address) to ensure consistency.
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>RAG Compliance Check (20%):</strong> Uses Retrieval-Augmented Generation to verify compliance with RBI regulations using a vector database of regulatory rules.
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Completeness (10%):</strong> Ensures all required documents are present (Identity, Address, PAN).
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-blue-200">
              <h3 className="font-semibold text-slate-900 mb-2">Decision Thresholds:</h3>
              <ul className="space-y-1 text-sm text-slate-700">
                <li><strong className="text-green-600">≥90% + Compliant:</strong> Auto-approved (straight-through processing)</li>
                <li><strong className="text-blue-600">80-89%:</strong> Manual review recommended (human verification advised)</li>
                <li><strong className="text-red-600">&lt;80%:</strong> Manual review required (must be reviewed by compliance officer)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-3">
            <FileText className="w-7 h-7 text-blue-600" />
            <span className="text-2xl font-bold text-slate-900">{stats.totalVerifications}</span>
          </div>
          <h3 className="text-xs font-semibold text-slate-700">Total Verifications</h3>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-7 h-7 text-emerald-600" />
            <span className="text-2xl font-bold text-slate-900">{stats.avgConfidence.toFixed(1)}%</span>
          </div>
          <h3 className="text-xs font-semibold text-slate-700">Avg. Confidence</h3>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="w-7 h-7 text-green-600" />
            <span className="text-2xl font-bold text-slate-900">{stats.autoApproved}</span>
          </div>
          <h3 className="text-xs font-semibold text-slate-700">Auto-Approved</h3>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-amber-500">
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle className="w-7 h-7 text-amber-600" />
            <span className="text-2xl font-bold text-slate-900">{stats.manualReview}</span>
          </div>
          <h3 className="text-xs font-semibold text-slate-700">Manual Review</h3>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-3">
            <Target className="w-7 h-7 text-purple-600" />
            <span className="text-2xl font-bold text-slate-900">{stats.highConfidenceRate.toFixed(1)}%</span>
          </div>
          <h3 className="text-xs font-semibold text-slate-700">High Confidence Rate</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Verification Log History</h2>

        {logs.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No verification logs available yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <div
                key={log.id}
                className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedLog(log)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-slate-900">{log.customer_name || 'Unknown Customer'}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getConfidenceBadgeColor(log.confidence_score || 0)}`}>
                        {log.confidence_score?.toFixed(1)}% Confidence
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDecisionBadgeColor(log.ai_decision)}`}>
                        {log.ai_decision.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{log.customer_email}</p>
                    <p className="text-sm text-slate-700">{log.reasoning}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500 ml-4">
                    <p>{new Date(log.created_at).toLocaleDateString('en-IN')}</p>
                    <p>{new Date(log.created_at).toLocaleTimeString('en-IN')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedLog(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedLog.customer_name}</h2>
                <p className="text-slate-600">{selectedLog.customer_email}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-600 mb-1">Confidence Score</p>
                  <p className={`text-2xl font-bold ${getConfidenceColor(selectedLog.confidence_score || 0)}`}>
                    {selectedLog.confidence_score?.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-600 mb-1">AI Decision</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {selectedLog.ai_decision.replace(/_/g, ' ').toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-slate-900 mb-2">AI Reasoning</h3>
                <p className="text-sm text-slate-700">{selectedLog.reasoning}</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">Verification Details</h3>
                <div className="text-sm space-y-1">
                  <p><strong>Step:</strong> {selectedLog.verification_step}</p>
                  <p><strong>Timestamp:</strong> {new Date(selectedLog.created_at).toLocaleString('en-IN')}</p>
                  <p><strong>Application ID:</strong> <span className="font-mono text-xs">{selectedLog.kyc_application_id}</span></p>
                </div>
              </div>

              {selectedLog.supporting_documents && Array.isArray(selectedLog.supporting_documents) && selectedLog.supporting_documents.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Supporting Documents</h3>
                  <div className="space-y-2">
                    {selectedLog.supporting_documents.map((doc: any, idx: number) => (
                      <div key={idx} className="bg-white rounded p-3 border border-slate-200">
                        <p className="text-sm font-medium text-slate-900">Document {idx + 1}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          Validation: {doc.validation?.isValid ? '✓ Valid' : '✗ Invalid'}
                          {doc.validation?.confidence && ` (${doc.validation.confidence.toFixed(1)}% confidence)`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
