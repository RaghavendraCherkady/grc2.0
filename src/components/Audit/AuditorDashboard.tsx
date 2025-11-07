import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText,
  TrendingUp,
  AlertTriangle,
  Activity,
  Calendar,
  Download,
  Eye,
  Plus,
  Filter,
  Search,
  ClipboardList
} from 'lucide-react';
import { AuditObservationForm } from './AuditObservationForm';

type RecordType = 'kyc' | 'loan' | 'alert' | 'audit_log' | 'observation';

export function AuditorDashboard() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<RecordType>('kyc');
  const [records, setRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showObservationForm, setShowObservationForm] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  useEffect(() => {
    fetchRecords();
  }, [selectedType]);

  useEffect(() => {
    applyFilters();
  }, [records, searchQuery, dateFrom, dateTo]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let query;
      let data;
      let error;

      switch (selectedType) {
        case 'kyc':
          ({ data, error } = await supabase
            .from('kyc_applications')
            .select(`
              *,
              created_by_profile:profiles!kyc_applications_created_by_fkey(full_name, email),
              reviewed_by_profile:profiles!kyc_applications_reviewed_by_fkey(full_name)
            `)
            .order('created_at', { ascending: false }));
          break;

        case 'loan':
          ({ data, error } = await supabase
            .from('loan_applications')
            .select(`
              *,
              kyc_applications(customer_name, customer_email),
              created_by_profile:profiles!loan_applications_created_by_fkey(full_name, email),
              assessed_by_profile:profiles!loan_applications_assessed_by_fkey(full_name),
              approved_by_profile:profiles!loan_applications_approved_by_fkey(full_name)
            `)
            .order('created_at', { ascending: false }));
          break;

        case 'alert':
          ({ data, error } = await supabase
            .from('governance_alerts')
            .select(`
              *,
              assigned_to_profile:profiles!governance_alerts_assigned_to_fkey(full_name),
              resolved_by_profile:profiles!governance_alerts_resolved_by_fkey(full_name)
            `)
            .order('created_at', { ascending: false }));
          break;

        case 'audit_log':
          ({ data, error } = await supabase
            .from('audit_logs')
            .select(`
              *,
              profiles(full_name, email, role)
            `)
            .order('created_at', { ascending: false })
            .limit(500));
          break;

        case 'observation':
          ({ data, error } = await supabase
            .from('audit_observations')
            .select(`
              *,
              auditor:profiles!audit_observations_auditor_id_fkey(full_name),
              resolver:profiles!audit_observations_resolved_by_fkey(full_name)
            `)
            .order('created_at', { ascending: false }));
          break;
      }

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...records];

    if (searchQuery) {
      filtered = filtered.filter((record) =>
        JSON.stringify(record).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.created_at || record.submitted_at);
        return recordDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.created_at || record.submitted_at);
        return recordDate <= toDate;
      });
    }

    setFilteredRecords(filtered);
  };

  const exportToCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = Object.keys(filteredRecords[0]);
    const csvRows = [
      headers.join(','),
      ...filteredRecords.map((record) =>
        headers.map((header) => {
          const value = record[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value).replace(/,/g, ';');
          return String(value).replace(/,/g, ';');
        }).join(',')
      ),
    ];

    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${selectedType}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-slate-100 text-slate-700',
      under_review: 'bg-blue-100 text-blue-700',
      verified: 'bg-green-100 text-green-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      open: 'bg-amber-100 text-amber-700',
      resolved: 'bg-green-100 text-green-700',
      closed: 'bg-slate-100 text-slate-700',
    };

    const style = styles[status] || 'bg-slate-100 text-slate-700';

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
        {status.replace(/_/g, ' ').toUpperCase()}
      </span>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      medium: 'bg-amber-100 text-amber-700 border-amber-200',
      low: 'bg-blue-100 text-blue-700 border-blue-200',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[severity]}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  const stats = {
    total: filteredRecords.length,
    byType: selectedType,
    dateRange: dateFrom && dateTo
      ? `${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}`
      : 'All time',
  };

  if (showObservationForm) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <AuditObservationForm
            onSuccess={() => {
              setShowObservationForm(false);
              if (selectedType === 'observation') {
                fetchRecords();
              }
            }}
            onCancel={() => setShowObservationForm(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Audit Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Review and analyze KYC, Loan, Alert, and Audit Log records
          </p>
        </div>
        <button
          onClick={() => setShowObservationForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          New Observation
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <button
          onClick={() => setSelectedType('kyc')}
          className={`p-4 rounded-lg border-2 transition ${
            selectedType === 'kyc'
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-200 bg-white hover:border-blue-300'
          }`}
        >
          <FileText className={`w-6 h-6 mb-2 ${selectedType === 'kyc' ? 'text-blue-600' : 'text-slate-600'}`} />
          <p className="font-semibold text-slate-900">KYC Records</p>
          <p className="text-sm text-slate-600 mt-1">{selectedType === 'kyc' ? stats.total : '—'}</p>
        </button>

        <button
          onClick={() => setSelectedType('loan')}
          className={`p-4 rounded-lg border-2 transition ${
            selectedType === 'loan'
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-200 bg-white hover:border-blue-300'
          }`}
        >
          <TrendingUp className={`w-6 h-6 mb-2 ${selectedType === 'loan' ? 'text-blue-600' : 'text-slate-600'}`} />
          <p className="font-semibold text-slate-900">Loan Records</p>
          <p className="text-sm text-slate-600 mt-1">{selectedType === 'loan' ? stats.total : '—'}</p>
        </button>

        <button
          onClick={() => setSelectedType('alert')}
          className={`p-4 rounded-lg border-2 transition ${
            selectedType === 'alert'
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-200 bg-white hover:border-blue-300'
          }`}
        >
          <AlertTriangle className={`w-6 h-6 mb-2 ${selectedType === 'alert' ? 'text-blue-600' : 'text-slate-600'}`} />
          <p className="font-semibold text-slate-900">Alerts</p>
          <p className="text-sm text-slate-600 mt-1">{selectedType === 'alert' ? stats.total : '—'}</p>
        </button>

        <button
          onClick={() => setSelectedType('audit_log')}
          className={`p-4 rounded-lg border-2 transition ${
            selectedType === 'audit_log'
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-200 bg-white hover:border-blue-300'
          }`}
        >
          <Activity className={`w-6 h-6 mb-2 ${selectedType === 'audit_log' ? 'text-blue-600' : 'text-slate-600'}`} />
          <p className="font-semibold text-slate-900">Audit Logs</p>
          <p className="text-sm text-slate-600 mt-1">{selectedType === 'audit_log' ? stats.total : '—'}</p>
        </button>

        <button
          onClick={() => setSelectedType('observation')}
          className={`p-4 rounded-lg border-2 transition ${
            selectedType === 'observation'
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-200 bg-white hover:border-blue-300'
          }`}
        >
          <ClipboardList className={`w-6 h-6 mb-2 ${selectedType === 'observation' ? 'text-blue-600' : 'text-slate-600'}`} />
          <p className="font-semibold text-slate-900">Observations</p>
          <p className="text-sm text-slate-600 mt-1">{selectedType === 'observation' ? stats.total : '—'}</p>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-600" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="From"
              />
              <span className="text-slate-600">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="To"
              />
            </div>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
            <span>
              <strong>{stats.total}</strong> records
            </span>
            <span className="text-slate-400">•</span>
            <span>{stats.dateRange}</span>
            {(searchQuery || dateFrom || dateTo) && (
              <>
                <span className="text-slate-400">•</span>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        </div>

        <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading records...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center">
              <Filter className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No records found</p>
            </div>
          ) : (
            filteredRecords.map((record) => (
              <RecordRow
                key={record.id}
                record={record}
                type={selectedType}
                onView={() => setSelectedRecord(record)}
                getStatusBadge={getStatusBadge}
                getSeverityBadge={getSeverityBadge}
              />
            ))
          )}
        </div>
      </div>

      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          type={selectedType}
          onClose={() => setSelectedRecord(null)}
          getStatusBadge={getStatusBadge}
          getSeverityBadge={getSeverityBadge}
        />
      )}
    </div>
  );
}

interface RecordRowProps {
  record: any;
  type: RecordType;
  onView: () => void;
  getStatusBadge: (status: string) => JSX.Element;
  getSeverityBadge: (severity: string) => JSX.Element;
}

function RecordRow({ record, type, onView, getStatusBadge, getSeverityBadge }: RecordRowProps) {
  const getTitle = () => {
    switch (type) {
      case 'kyc':
        return record.customer_name;
      case 'loan':
        return `${record.kyc_applications?.customer_name} - ${record.loan_type}`;
      case 'alert':
        return record.title;
      case 'audit_log':
        return `${record.action_type} - ${record.entity_type}`;
      case 'observation':
        return record.title;
      default:
        return 'Unknown';
    }
  };

  const getSubtitle = () => {
    switch (type) {
      case 'kyc':
        return `${record.customer_email} • ${record.identity_doc_type}`;
      case 'loan':
        return `₹${Number(record.loan_amount).toLocaleString('en-IN')} • ${record.loan_tenure_months} months`;
      case 'alert':
        return record.description;
      case 'audit_log':
        return record.profiles?.full_name || 'System';
      case 'observation':
        return `${record.area_audited} • ${record.observation_type}`;
      default:
        return '';
    }
  };

  return (
    <div
      className="p-4 hover:bg-slate-50 transition cursor-pointer"
      onClick={onView}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900">{getTitle()}</h3>
            {record.status && getStatusBadge(record.status)}
            {record.severity && getSeverityBadge(record.severity)}
            {record.ai_status && getStatusBadge(record.ai_status)}
          </div>
          <p className="text-sm text-slate-600 mb-2">{getSubtitle()}</p>
          <p className="text-xs text-slate-500">
            {new Date(record.created_at || record.submitted_at).toLocaleString('en-IN')}
          </p>
        </div>
        <button className="p-2 hover:bg-slate-100 rounded-lg transition">
          <Eye className="w-5 h-5 text-slate-600" />
        </button>
      </div>
    </div>
  );
}

interface RecordDetailModalProps {
  record: any;
  type: RecordType;
  onClose: () => void;
  getStatusBadge: (status: string) => JSX.Element;
  getSeverityBadge: (severity: string) => JSX.Element;
}

function RecordDetailModal({ record, type, onClose, getStatusBadge, getSeverityBadge }: RecordDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Record Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <Eye className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <div className="p-6">
          <pre className="bg-slate-50 p-4 rounded-lg overflow-auto text-xs">
            {JSON.stringify(record, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
