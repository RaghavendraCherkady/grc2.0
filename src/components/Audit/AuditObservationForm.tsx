import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, CheckCircle, FileText, Save, X } from 'lucide-react';

interface AuditObservationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  relatedEntity?: {
    type: string;
    id: string;
  };
}

export function AuditObservationForm({ onSuccess, onCancel, relatedEntity }: AuditObservationFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    observation_type: 'finding',
    severity: 'medium',
    title: '',
    description: '',
    area_audited: '',
    related_entity_type: relatedEntity?.type || '',
    related_entity_id: relatedEntity?.id || '',
    recommendations: '',
    responsible_party: '',
    target_completion_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('audit_observations')
        .insert({
          auditor_id: user.id,
          observation_type: formData.observation_type,
          severity: formData.severity,
          title: formData.title,
          description: formData.description,
          area_audited: formData.area_audited,
          related_entity_type: formData.related_entity_type || null,
          related_entity_id: formData.related_entity_id || null,
          recommendations: formData.recommendations,
          responsible_party: formData.responsible_party,
          target_completion_date: formData.target_completion_date || null,
          status: 'open',
        });

      if (insertError) throw insertError;

      setSuccess(true);

      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error('Error creating audit observation:', err);
      setError(err.message || 'Failed to create audit observation');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-green-900 mb-2">Observation Recorded</h3>
        <p className="text-green-700">The audit observation has been successfully created.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-700 mb-2">
          <FileText className="w-5 h-5" />
          <h3 className="font-semibold">New Audit Observation</h3>
        </div>
        <p className="text-sm text-slate-600">
          Record findings, risks, or compliance gaps identified during your audit
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-red-900 mb-1">Error</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Observation Type <span className="text-red-600">*</span>
          </label>
          <select
            required
            value={formData.observation_type}
            onChange={(e) => setFormData({ ...formData, observation_type: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="finding">Finding</option>
            <option value="recommendation">Recommendation</option>
            <option value="risk">Risk Identified</option>
            <option value="compliance_gap">Compliance Gap</option>
            <option value="best_practice">Best Practice</option>
            <option value="concern">Concern</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Severity <span className="text-red-600">*</span>
          </label>
          <select
            required
            value={formData.severity}
            onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Title <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Brief summary of the observation"
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Area Audited <span className="text-red-600">*</span>
        </label>
        <select
          required
          value={formData.area_audited}
          onChange={(e) => setFormData({ ...formData, area_audited: e.target.value })}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select area...</option>
          <option value="KYC Process">KYC Process</option>
          <option value="Loan Underwriting">Loan Underwriting</option>
          <option value="Risk Assessment">Risk Assessment</option>
          <option value="Governance Controls">Governance Controls</option>
          <option value="Data Security">Data Security</option>
          <option value="Compliance Monitoring">Compliance Monitoring</option>
          <option value="Document Management">Document Management</option>
          <option value="User Access Controls">User Access Controls</option>
          <option value="Audit Trail">Audit Trail</option>
          <option value="Notification System">Notification System</option>
          <option value="EMI Management">EMI Management</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Description <span className="text-red-600">*</span>
        </label>
        <textarea
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Detailed description of what was observed, including context and potential impact..."
          rows={6}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Recommendations
        </label>
        <textarea
          value={formData.recommendations}
          onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
          placeholder="Your recommendations for addressing this observation..."
          rows={4}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Responsible Party
          </label>
          <input
            type="text"
            value={formData.responsible_party}
            onChange={(e) => setFormData({ ...formData, responsible_party: e.target.value })}
            placeholder="Department or person responsible"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Target Completion Date
          </label>
          <input
            type="date"
            value={formData.target_completion_date}
            onChange={(e) => setFormData({ ...formData, target_completion_date: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white rounded-lg hover:shadow-xl hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Create Observation
            </>
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition disabled:opacity-50 font-medium"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </form>
  );
}
