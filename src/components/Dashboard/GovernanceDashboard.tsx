import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Users, FileText, AlertCircle } from 'lucide-react';
import type { AlertSeverity } from '../../lib/database.types';

interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  created_at: string;
  is_resolved: boolean;
}

interface Stats {
  totalKycApplications: number;
  verifiedKyc: number;
  totalLoanApplications: number;
  approvedLoans: number;
  pendingReviews: number;
  criticalAlerts: number;
}

export function GovernanceDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalKycApplications: 0,
    verifiedKyc: 0,
    totalLoanApplications: 0,
    approvedLoans: 0,
    pendingReviews: 0,
    criticalAlerts: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [kycData, loanData, alertsData] = await Promise.all([
        supabase.from('kyc_applications').select('status', { count: 'exact' }),
        supabase.from('loan_applications').select('status, ai_risk_rating', { count: 'exact' }),
        supabase
          .from('governance_alerts')
          .select('*')
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (kycData.data) {
        const verified = kycData.data.filter(k => k.status === 'verified').length;
        setStats(prev => ({
          ...prev,
          totalKycApplications: kycData.count || 0,
          verifiedKyc: verified,
        }));
      }

      if (loanData.data) {
        const approved = loanData.data.filter(l => l.status === 'approved').length;
        const pending = loanData.data.filter(l => l.status === 'under_assessment').length;
        setStats(prev => ({
          ...prev,
          totalLoanApplications: loanData.count || 0,
          approvedLoans: approved,
          pendingReviews: pending,
        }));
      }

      if (alertsData.data) {
        setAlerts(alertsData.data);
        const critical = alertsData.data.filter(a => a.severity === 'critical').length;
        setStats(prev => ({
          ...prev,
          criticalAlerts: critical,
        }));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    if (severity === 'critical' || severity === 'high') {
      return <AlertTriangle className="w-5 h-5" />;
    }
    return <AlertCircle className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const canViewGovernance = profile?.role === 'cco' || profile?.role === 'internal_auditor' || profile?.role === 'compliance_manager' || profile?.role === 'system_admin';

  if (!canViewGovernance) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-amber-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-amber-900 mb-2">Access Restricted</h2>
          <p className="text-amber-700">
            You don't have permission to view the Governance Dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Governance Dashboard</h1>
          <p className="text-slate-600 mt-1">Real-time compliance monitoring and oversight</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">Role: <span className="font-semibold text-blue-600">{profile?.role}</span></p>
          <p className="text-sm text-slate-600">Department: {profile?.department || 'N/A'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-slate-900">{stats.totalKycApplications}</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Total KYC Applications</h3>
          <p className="text-xs text-slate-500">{stats.verifiedKyc} verified</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-slate-900">{stats.totalLoanApplications}</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Loan Applications</h3>
          <p className="text-xs text-slate-500">{stats.approvedLoans} approved</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-amber-500">
          <div className="flex items-center justify-between mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
            <span className="text-2xl font-bold text-slate-900">{stats.pendingReviews}</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Pending Reviews</h3>
          <p className="text-xs text-slate-500">Require attention</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <span className="text-2xl font-bold text-slate-900">{stats.criticalAlerts}</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Critical Alerts</h3>
          <p className="text-xs text-slate-500">Unresolved issues</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
            <span className="text-2xl font-bold text-slate-900">98.5%</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">AI Accuracy</h3>
          <p className="text-xs text-slate-500">KYC verification rate</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <FileText className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold text-slate-900">2.3h</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Avg. Processing Time</h3>
          <p className="text-xs text-slate-500">Time to decision</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Non-Compliance Alerts</h2>
          <span className="text-sm text-slate-600">{alerts.length} active alerts</span>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-slate-600">No active alerts. All systems operating normally.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    {getSeverityIcon(alert.severity)}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">{alert.title}</h3>
                        <p className="text-sm mt-1">{alert.description}</p>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/50 uppercase ml-4">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs mt-2 opacity-75">
                      {new Date(alert.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-md p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Compliance Adherence Score</h3>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-4xl font-bold">96.2%</p>
            <p className="text-sm text-blue-100 mt-1">RBI FREE-AI Framework Compliance</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">Last Audit: Dec 2024</p>
            <p className="text-sm text-blue-100">Next Review: Jan 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
}
