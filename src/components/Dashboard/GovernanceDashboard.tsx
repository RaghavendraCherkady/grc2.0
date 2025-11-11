import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Users, FileText, AlertCircle } from 'lucide-react';
import type { AlertSeverity } from '../../lib/database.types';
import { AuditDataView } from './AuditDataView';

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
  aiAccuracy: number;
  avgProcessingTimeHours: number;
  complianceScore: number;
}

interface DashboardCardProps {
  icon: React.ReactNode;
  value: string | number;
  title: string;
  subtitle: string;
  borderColor: string;
  iconColor: string;
  onClick?: () => void;
}

function DashboardCard({ icon, value, title, subtitle, borderColor, iconColor, onClick }: DashboardCardProps) {
  const CardWrapper = onClick ? 'button' : 'div';
  const interactiveClasses = onClick
    ? 'cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95'
    : '';

  return (
    <CardWrapper
      onClick={onClick}
      className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${borderColor} ${interactiveClasses} text-left w-full relative overflow-hidden group`}
    >
      {onClick && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`${iconColor} transform group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
          <span className="text-2xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors duration-300">{value}</span>
        </div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1 group-hover:text-blue-800 transition-colors duration-300">{title}</h3>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </CardWrapper>
  );
}

type View = 'dashboard' | 'kyc' | 'loan' | 'review' | 'communications' | 'notifications' | 'audit' | 'voice_demo' | 'web_voice' | 'ai_confidence';

interface GovernanceDashboardProps {
  onNavigate?: (view: View) => void;
}

export function GovernanceDashboard({ onNavigate }: GovernanceDashboardProps) {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalKycApplications: 0,
    verifiedKyc: 0,
    totalLoanApplications: 0,
    approvedLoans: 0,
    pendingReviews: 0,
    criticalAlerts: 0,
    aiAccuracy: 0,
    avgProcessingTimeHours: 0,
    complianceScore: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  if (profile?.role === 'internal_auditor') {
    return <AuditDataView />;
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [kycData, kycWithConfidence, loanData, alertsData] = await Promise.all([
        supabase.from('kyc_applications').select('status', { count: 'exact' }),
        supabase.from('kyc_applications').select('status, ai_confidence_score, submitted_at, verified_at'),
        supabase.from('loan_applications').select('status, ai_risk_rating', { count: 'exact' }),
        supabase
          .from('governance_alerts')
          .select('*')
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      let aiAccuracy = 85;
      let avgProcessingTimeHours = 2.5;
      let complianceScore = 92;

      if (kycWithConfidence.data && kycWithConfidence.data.length > 0) {
        const withConfidence = kycWithConfidence.data.filter(k => k.ai_confidence_score !== null);
        if (withConfidence.length > 0) {
          const avgConfidence = withConfidence.reduce((sum, k) => sum + (k.ai_confidence_score || 0), 0) / withConfidence.length;
          aiAccuracy = avgConfidence;
        }

        const processed = kycWithConfidence.data.filter(k => k.verified_at && k.submitted_at);
        if (processed.length > 0) {
          const totalHours = processed.reduce((sum, k) => {
            const submitted = new Date(k.submitted_at).getTime();
            const verified = new Date(k.verified_at).getTime();
            return sum + ((verified - submitted) / (1000 * 60 * 60));
          }, 0);
          avgProcessingTimeHours = totalHours / processed.length;
        }
      }

      if (kycData.data) {
        const verified = kycData.data.filter(k => k.status === 'verified').length;
        const total = kycData.count || 0;
        if (total > 0) {
          complianceScore = Math.round(((verified / total) * 100));
        }
      }

      if (kycData.data) {
        const verified = kycData.data.filter(k => k.status === 'verified').length;
        setStats(prev => ({
          ...prev,
          totalKycApplications: kycData.count || 0,
          verifiedKyc: verified,
          aiAccuracy,
          avgProcessingTimeHours,
          complianceScore,
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A4A55]"></div>
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
          <p className="text-sm text-slate-600">Role: <span className="font-semibold text-[#0A4A55]">{profile?.role}</span></p>
          <p className="text-sm text-slate-600">Department: {profile?.department || 'N/A'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard
          icon={<Users className="w-8 h-8" />}
          value={stats.totalKycApplications}
          title="Total KYC Applications"
          subtitle={`${stats.verifiedKyc} verified`}
          borderColor="border-blue-500"
          iconColor="text-[#0A4A55]"
          onClick={onNavigate ? () => onNavigate('review') : undefined}
        />

        <DashboardCard
          icon={<TrendingUp className="w-8 h-8" />}
          value={stats.totalLoanApplications}
          title="Loan Applications"
          subtitle={`${stats.approvedLoans} approved`}
          borderColor="border-green-500"
          iconColor="text-green-600"
          onClick={onNavigate ? () => onNavigate('review') : undefined}
        />

        <DashboardCard
          icon={<Clock className="w-8 h-8" />}
          value={stats.pendingReviews}
          title="Pending Reviews"
          subtitle="Require attention"
          borderColor="border-amber-500"
          iconColor="text-amber-600"
          onClick={onNavigate ? () => onNavigate('review') : undefined}
        />

        <DashboardCard
          icon={<AlertTriangle className="w-8 h-8" />}
          value={stats.criticalAlerts}
          title="Critical Alerts"
          subtitle="Unresolved issues"
          borderColor="border-red-500"
          iconColor="text-red-600"
          onClick={onNavigate ? () => onNavigate('review') : undefined}
        />

        <DashboardCard
          icon={<CheckCircle className="w-8 h-8" />}
          value={`${stats.aiAccuracy.toFixed(1)}%`}
          title="AI Confidence"
          subtitle="Average AI score"
          borderColor="border-emerald-500"
          iconColor="text-emerald-600"
          onClick={onNavigate ? () => onNavigate('ai_confidence') : undefined}
        />

        <DashboardCard
          icon={<FileText className="w-8 h-8" />}
          value={
            stats.avgProcessingTimeHours < 1
              ? `${Math.round(stats.avgProcessingTimeHours * 60)}m`
              : `${stats.avgProcessingTimeHours.toFixed(1)}h`
          }
          title="Avg. Processing Time"
          subtitle="Submission to decision"
          borderColor="border-purple-500"
          iconColor="text-purple-600"
          onClick={onNavigate ? () => onNavigate('review') : undefined}
        />
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
            <p className="text-4xl font-bold">{stats.complianceScore}%</p>
            <p className="text-sm text-blue-100 mt-1">
              Based on {stats.verifiedKyc} verified / {stats.totalKycApplications} total KYC applications
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">Last Updated: {new Date().toLocaleDateString('en-IN')}</p>
            <p className="text-sm text-blue-100">RBI Compliant</p>
          </div>
        </div>
      </div>
    </div>
  );
}
