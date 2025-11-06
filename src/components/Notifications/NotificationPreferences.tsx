import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Mail, MessageSquare, Phone, Save, CheckCircle, AlertCircle } from 'lucide-react';

interface Preferences {
  email_enabled: boolean;
  sms_enabled: boolean;
  voice_enabled: boolean;
  kyc_alerts: boolean;
  loan_alerts: boolean;
  emi_reminders: boolean;
  payment_alerts: boolean;
  phone_number: string;
  alternate_email: string;
  preferred_time: string;
}

export function NotificationPreferences() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [preferences, setPreferences] = useState<Preferences>({
    email_enabled: true,
    sms_enabled: true,
    voice_enabled: false,
    kyc_alerts: true,
    loan_alerts: true,
    emi_reminders: true,
    payment_alerts: true,
    phone_number: '',
    alternate_email: '',
    preferred_time: 'morning',
  });

  useEffect(() => {
    fetchPreferences();
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          email_enabled: data.email_enabled ?? true,
          sms_enabled: data.sms_enabled ?? true,
          voice_enabled: data.voice_enabled ?? false,
          kyc_alerts: data.kyc_alerts ?? true,
          loan_alerts: data.loan_alerts ?? true,
          emi_reminders: data.emi_reminders ?? true,
          payment_alerts: data.payment_alerts ?? true,
          phone_number: data.phone_number || '',
          alternate_email: data.alternate_email || '',
          preferred_time: data.preferred_time || 'morning',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
          <div className="flex items-center">
            <Bell className="w-8 h-8 text-white mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-white">Notification Preferences</h2>
              <p className="text-blue-100 text-sm mt-1">
                Choose how you want to receive alerts and reminders
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Notification Channels</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2 rounded-lg mr-3">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Email Notifications</p>
                    <p className="text-sm text-slate-600">Receive notifications via email</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.email_enabled}
                    onChange={(e) => setPreferences({ ...preferences, email_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center">
                  <div className="bg-green-100 p-2 rounded-lg mr-3">
                    <MessageSquare className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">SMS Notifications</p>
                    <p className="text-sm text-slate-600">Receive text messages on your phone</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.sms_enabled}
                    onChange={(e) => setPreferences({ ...preferences, sms_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center">
                  <div className="bg-amber-100 p-2 rounded-lg mr-3">
                    <Phone className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Voice Call Notifications</p>
                    <p className="text-sm text-slate-600">Receive urgent reminders via phone call</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.voice_enabled}
                    onChange={(e) => setPreferences({ ...preferences, voice_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Notification Types</h3>
            <div className="space-y-3">
              <label className="flex items-center p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.kyc_alerts}
                  onChange={(e) => setPreferences({ ...preferences, kyc_alerts: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <p className="font-medium text-slate-900">KYC Alerts</p>
                  <p className="text-sm text-slate-600">Status updates on KYC verification</p>
                </div>
              </label>

              <label className="flex items-center p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.loan_alerts}
                  onChange={(e) => setPreferences({ ...preferences, loan_alerts: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <p className="font-medium text-slate-900">Loan Alerts</p>
                  <p className="text-sm text-slate-600">Updates on loan application status</p>
                </div>
              </label>

              <label className="flex items-center p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.emi_reminders}
                  onChange={(e) => setPreferences({ ...preferences, emi_reminders: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <p className="font-medium text-slate-900">EMI Reminders</p>
                  <p className="text-sm text-slate-600">Payment due date reminders</p>
                </div>
              </label>

              <label className="flex items-center p-3 hover:bg-slate-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.payment_alerts}
                  onChange={(e) => setPreferences({ ...preferences, payment_alerts: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <p className="font-medium text-slate-900">Payment Acknowledgements</p>
                  <p className="text-sm text-slate-600">Confirmation when payments are received</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number
                  <span className="text-slate-500 font-normal ml-1">(for SMS & Voice)</span>
                </label>
                <input
                  type="tel"
                  value={preferences.phone_number}
                  onChange={(e) => setPreferences({ ...preferences, phone_number: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Alternate Email
                  <span className="text-slate-500 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="email"
                  value={preferences.alternate_email}
                  onChange={(e) => setPreferences({ ...preferences, alternate_email: e.target.value })}
                  placeholder="alternate@example.com"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Preferred Time for Reminders
                </label>
                <select
                  value={preferences.preferred_time}
                  onChange={(e) => setPreferences({ ...preferences, preferred_time: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="morning">Morning (9 AM - 12 PM)</option>
                  <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                  <option value="evening">Evening (5 PM - 8 PM)</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start">
              <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">Preferences saved successfully!</span>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
