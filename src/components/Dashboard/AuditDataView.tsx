import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Download,
  Filter,
  Search,
  FileText,
  AlertTriangle,
  Users,
  Activity,
  Eye,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface KycRecord {
  id: string;
  customer_name: string;
  customer_email: string;
  status: string;
  ai_status: string;
  ai_confidence_score: number | null;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_comments: string | null;
  profiles?: { full_name: string; role: string };
}

interface LoanRecord {
  id: string;
  loan_type: string;
  loan_amount: number;
  status: string;
  ai_risk_rating: string | null;
  ai_risk_score: number | null;
  submitted_at: string | null;
  assessed_by: string | null;
  approved_by: string | null;
  assessor_comments: string | null;
  kyc_applications?: { customer_name: string };
  assessor_profile?: { full_name: string; role: string };
  approver_profile?: { full_name: string; role: string };
}

interface AlertRecord {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  is_resolved: boolean;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  profiles?: { full_name: string; role: string };
}

interface AuditLogRecord {
  id: string;
  user_id: string | null;
  user_role: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  action_details: any;
  is_ai_action: boolean;
  ai_confidence: number | null;
  created_at: string;
  profiles?: { full_name: string; email: string };
}

type ViewType = 'kyc' | 'loans' | 'alerts' | 'audit_logs';

export function AuditDataView() {
  const [activeView, setActiveView] = useState<ViewType>('kyc');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [kycRecords, setKycRecords] = useState<KycRecord[]>([]);
  const [loanRecords, setLoanRecords] = useState<LoanRecord[]>([]);
  const [alertRecords, setAlertRecords] = useState<AlertRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  useEffect(() => {
    fetchData();
  }, [activeView]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeView) {
        case 'kyc':
          await fetchKycRecords();
          break;
        case 'loans':
          await fetchLoanRecords();
          break;
        case 'alerts':
          await fetchAlertRecords();
          break;
        case 'audit_logs':
          await fetchAuditLogs();
          break;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKycRecords = async () => {
    const { data, error } = await supabase
      .from('kyc_applications')
      .select(`
        id,
        customer_name,
        customer_email,
        status,
        ai_status,
        ai_confidence_score,
        submitted_at,
        reviewed_by,
        reviewed_at,
        reviewer_comments,
        profiles:reviewed_by (full_name, role)
      `)
      .order('submitted_at', { ascending: false });

    if (!error && data) {
      setKycRecords(data);
    }
  };

  const fetchLoanRecords = async () => {
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
        assessed_by,
        approved_by,
        assessor_comments,
        kyc_applications (customer_name),
        assessor_profile:assessed_by (full_name, role),
        approver_profile:approved_by (full_name, role)
      `)
      .order('submitted_at', { ascending: false });

    if (!error && data) {
      setLoanRecords(data as any);
    }
  };

  const fetchAlertRecords = async () => {
    const { data, error } = await supabase
      .from('governance_alerts')
      .select(`
        id,
        alert_type,
        severity,
        title,
        description,
        is_resolved,
        created_at,
        resolved_at,
        resolved_by,
        resolution_notes,
        profiles:resolved_by (full_name, role)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAlertRecords(data);
    }
  };

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        user_id,
        user_role,
        action_type,
        entity_type,
        entity_id,
        action_details,
        is_ai_action,
        ai_confidence,
        created_at,
        profiles:user_id (full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (!error && data) {
      setAuditLogs(data);
    }
  };

  const exportToCSV = () => {
    let data: any[] = [];
    let filename = '';

    switch (activeView) {
      case 'kyc':
        data = kycRecords;
        filename = 'kyc_applications.csv';
        break;
      case 'loans':
        data = loanRecords;
        filename = 'loan_applications.csv';
        break;
      case 'alerts':
        data = alertRecords;
        filename = 'governance_alerts.csv';
        break;
      case 'audit_logs':
        data = auditLogs;
        filename = 'audit_logs.csv';
        break;
    }

    if (data.length === 0) return;

    const headers = Object.keys(data[0]).filter(key => typeof data[0][key] !== 'object');
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filterRecords = (records: any[]) => {
    if (!searchTerm) return records;

    return records.filter(record =>
      JSON.stringify(record).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      verified: 'bg-green-100 text-green-800',
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-blue-100 text-blue-800',
      under_assessment: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      pending_governance_review: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'border-red-500 bg-red-50',
      high: 'border-orange-500 bg-orange-50',
      medium: 'border-yellow-500 bg-yellow-50',
      low: 'border-blue-500 bg-blue-50',
    };
    return colors[severity] || 'border-slate-500 bg-slate-50';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Audit Data View</h1>
        <p className="text-sm text-slate-600">
          Complete access to all records for audit and compliance review
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
        <div className="grid grid-cols-4 gap-px bg-slate-200">
          <button
            onClick={() => setActiveView('kyc')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeView === 'kyc'
                ? 'bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            KYC Applications ({kycRecords.length})
          </button>
          <button
            onClick={() => setActiveView('loans')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeView === 'loans'
                ? 'bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            Loan Applications ({loanRecords.length})
          </button>
          <button
            onClick={() => setActiveView('alerts')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeView === 'alerts'
                ? 'bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Alert History ({alertRecords.length})
          </button>
          <button
            onClick={() => setActiveView('audit_logs')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeView === 'audit_logs'
                ? 'bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Audit Logs ({auditLogs.length})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1 mr-4">
            <Search className="w-5 h-5 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none text-sm"
            />
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white rounded-lg hover:shadow-xl hover:scale-[1.02] transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A4A55] mx-auto"></div>
          <p className="text-slate-600 mt-4">Loading records...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {activeView === 'kyc' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">AI Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">AI Score</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Reviewed By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filterRecords(kycRecords).map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm">{record.customer_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{record.customer_email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(record.ai_status)}`}>
                          {record.ai_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {record.ai_confidence_score ? `${record.ai_confidence_score.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {record.profiles ? (
                          <div>
                            <div className="font-medium">{record.profiles.full_name}</div>
                            <div className="text-xs text-slate-500">{record.profiles.role}</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(record.submitted_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filterRecords(kycRecords).length === 0 && (
                <div className="text-center py-8 text-slate-500">No records found</div>
              )}
            </div>
          )}

          {activeView === 'loans' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Loan Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">AI Risk</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Assessed By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Approved By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filterRecords(loanRecords).map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm">
                        {record.kyc_applications?.customer_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">{record.loan_type}</td>
                      <td className="px-4 py-3 text-sm font-medium">₹{record.loan_amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {record.ai_risk_rating && (
                          <div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              record.ai_risk_rating === 'low' ? 'bg-green-100 text-green-800' :
                              record.ai_risk_rating === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {record.ai_risk_rating}
                            </span>
                            {record.ai_risk_score && (
                              <div className="text-xs text-slate-500 mt-1">{record.ai_risk_score.toFixed(1)}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {record.assessor_profile ? (
                          <div>
                            <div className="font-medium">{record.assessor_profile.full_name}</div>
                            <div className="text-xs text-slate-500">{record.assessor_profile.role}</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {record.approver_profile ? (
                          <div>
                            <div className="font-medium">{record.approver_profile.full_name}</div>
                            <div className="text-xs text-slate-500">{record.approver_profile.role}</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {record.submitted_at ? new Date(record.submitted_at).toLocaleDateString('en-IN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filterRecords(loanRecords).length === 0 && (
                <div className="text-center py-8 text-slate-500">No records found</div>
              )}
            </div>
          )}

          {activeView === 'alerts' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Resolved By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filterRecords(alertRecords).map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          record.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          record.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {record.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{record.alert_type}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">{record.title}</div>
                        <div className="text-xs text-slate-500 mt-1">{record.description}</div>
                      </td>
                      <td className="px-4 py-3">
                        {record.is_resolved ? (
                          <span className="flex items-center text-green-700 text-sm">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Resolved
                          </span>
                        ) : (
                          <span className="flex items-center text-amber-700 text-sm">
                            <Clock className="w-4 h-4 mr-1" />
                            Open
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {record.profiles ? (
                          <div>
                            <div className="font-medium">{record.profiles.full_name}</div>
                            <div className="text-xs text-slate-500">{record.profiles.role}</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(record.created_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filterRecords(alertRecords).length === 0 && (
                <div className="text-center py-8 text-slate-500">No records found</div>
              )}
            </div>
          )}

          {activeView === 'audit_logs' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filterRecords(auditLogs).map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {record.is_ai_action ? (
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                            <div>
                              <div className="font-medium text-sm">AI System</div>
                              {record.ai_confidence && (
                                <div className="text-xs text-slate-500">Conf: {record.ai_confidence.toFixed(1)}%</div>
                              )}
                            </div>
                          </div>
                        ) : record.profiles ? (
                          <div>
                            <div className="font-medium text-sm">{record.profiles.full_name}</div>
                            <div className="text-xs text-slate-500">{record.profiles.email}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                          {record.user_role || 'system'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{record.action_type}</td>
                      <td className="px-4 py-3 text-sm">{record.entity_type}</td>
                      <td className="px-4 py-3">
                        {record.is_ai_action ? (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            AI
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            Human
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(record.created_at).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filterRecords(auditLogs).length === 0 && (
                <div className="text-center py-8 text-slate-500">No records found</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
