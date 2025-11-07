import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Phone, Play, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';

export function VoiceCallDemo() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    phoneNumber: '+919876543210',
    customerName: 'Rahul Kumar',
    notificationType: 'kyc_approved',
    message: 'Congratulations! Your KYC application has been approved. You can now proceed with your loan application.',
  });

  const notificationTypes = [
    {
      value: 'kyc_approved',
      label: 'KYC Approved (Congratulations)',
      defaultMessage: 'Congratulations! Your KYC application has been approved. You can now proceed with your loan application.',
    },
    {
      value: 'loan_approved',
      label: 'Loan Approved (Congratulations)',
      defaultMessage: 'Great news! Your loan application has been approved. The amount will be disbursed to your account shortly.',
    },
    {
      value: 'emi_reminder_7days',
      label: 'EMI Reminder - 7 Days',
      defaultMessage: 'This is a friendly reminder that your EMI payment of Rs. 5,000 is due in 7 days. Please ensure sufficient balance in your account.',
    },
    {
      value: 'emi_reminder_3days',
      label: 'EMI Reminder - 3 Days',
      defaultMessage: 'Your EMI payment of Rs. 5,000 is due in 3 days. Please pay on time to avoid late fees and maintain your credit score.',
    },
    {
      value: 'emi_reminder_1day',
      label: 'EMI Reminder - 1 Day',
      defaultMessage: 'Urgent: Your EMI payment of Rs. 5,000 is due tomorrow. Please make the payment immediately to avoid penalties.',
    },
  ];

  const handleNotificationTypeChange = (type: string) => {
    const selected = notificationTypes.find((nt) => nt.value === type);
    if (selected) {
      setFormData({
        ...formData,
        notificationType: type,
        message: selected.defaultMessage,
      });
    }
  };

  const makeVoiceCall = async () => {
    if (!user) {
      setError('You must be logged in to make a voice call');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-voice-notification`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formData.phoneNumber,
          message: formData.message,
          userId: user.id,
          notificationType: formData.notificationType,
          customerName: formData.customerName,
          entityType: 'demo',
          entityId: crypto.randomUUID(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        throw new Error(data.error || 'Voice call failed');
      }
    } catch (err: any) {
      console.error('Error making voice call:', err);
      setError(err.message || 'Failed to initiate voice call');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-8 text-white mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Phone className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Voice Call Demo</h1>
              <p className="text-blue-100 mt-1">
                Test AI-powered voice notifications via Vapi
              </p>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-50">
              This demo uses Vapi.ai to make automated voice calls with intelligent AI assistants.
              The system automatically selects the appropriate assistant based on the notification type.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Call Configuration</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Customer Name
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter customer name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Phone Number (with country code)
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+919876543210"
              />
              <p className="text-xs text-slate-500 mt-1">
                Format: +91XXXXXXXXXX (Indian numbers)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notification Type
              </label>
              <select
                value={formData.notificationType}
                onChange={(e) => handleNotificationTypeChange(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {notificationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Enter the message to be spoken"
              />
              <p className="text-xs text-slate-500 mt-1">
                This message will be spoken by the AI assistant during the call
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 mb-1">Call Failed</h4>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">Call Initiated Successfully!</h4>
                    <p className="text-sm text-green-700">
                      The voice call has been initiated. The customer should receive a call shortly.
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Call ID:</span>
                    <code className="bg-slate-100 px-2 py-1 rounded text-slate-900 font-mono text-xs">
                      {result.callId}
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Phone Number:</span>
                    <span className="font-medium text-slate-900">{result.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Notification ID:</span>
                    <code className="bg-slate-100 px-2 py-1 rounded text-slate-900 font-mono text-xs">
                      {result.notificationId}
                    </code>
                  </div>
                </div>
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-xs text-blue-700">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    You can track this call in the Communication Log under the Notifications section.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={makeVoiceCall}
              disabled={loading || !formData.phoneNumber || !formData.message}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white rounded-lg hover:shadow-xl hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
            >
              {loading ? (
                <>
                  <Loader className="w-6 h-6 animate-spin" />
                  Initiating Call...
                </>
              ) : (
                <>
                  <Play className="w-6 h-6" />
                  Make Voice Call
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#0A4A55]" />
            How It Works
          </h3>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-[#0A4A55] rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                1
              </div>
              <p>
                <strong>Assistant Selection:</strong> The system automatically selects the appropriate Vapi AI assistant based on notification type:
                <br />
                <span className="text-xs text-slate-600 ml-6">
                  • KYC/Loan Approved → Congratulations Assistant<br />
                  • EMI Reminders → Loan Reminder Assistant
                </span>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-[#0A4A55] rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                2
              </div>
              <p>
                <strong>Call Initiation:</strong> The function sends a request to Vapi.ai API with customer details and message.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-[#0A4A55] rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                3
              </div>
              <p>
                <strong>AI Conversation:</strong> The AI assistant calls the customer and delivers the message in a natural, conversational manner.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-[#0A4A55] rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                4
              </div>
              <p>
                <strong>Logging:</strong> All call details are logged in the notifications table for audit and tracking purposes.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Important Notes
          </h3>
          <ul className="space-y-2 text-sm text-amber-800">
            <li className="flex items-start gap-2">
              <span className="text-amber-600">•</span>
              <span>This demo uses real Vapi.ai API and will make actual phone calls</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600">•</span>
              <span>Ensure the phone number is correct before making a call</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600">•</span>
              <span>Voice calls are logged in the Communication Log for tracking</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600">•</span>
              <span>Each call may take 30-60 seconds to connect and complete</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
