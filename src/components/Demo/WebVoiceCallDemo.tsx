import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Phone, PhoneOff, Mic, MicOff, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import Vapi from '@vapi-ai/web';

const VAPI_PUBLIC_KEY = '465ae04e-f94a-42a6-bbc3-98e5bf902c4f';

export function WebVoiceCallDemo() {
  const { user } = useAuth();
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<string>('idle');
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const vapiRef = useRef<Vapi | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
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

  useEffect(() => {
    vapiRef.current = new Vapi(VAPI_PUBLIC_KEY);

    vapiRef.current.on('call-start', () => {
      setIsCallActive(true);
      setCallStatus('connected');
      setError(null);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    });

    vapiRef.current.on('call-end', () => {
      setIsCallActive(false);
      setCallStatus('ended');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    vapiRef.current.on('speech-start', () => {
      setCallStatus('speaking');
    });

    vapiRef.current.on('speech-end', () => {
      setCallStatus('listening');
    });

    vapiRef.current.on('error', (error: any) => {
      console.error('Vapi error:', error);
      setError(error.message || 'An error occurred during the call');
      setIsCallActive(false);
      setCallStatus('error');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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

  const startCall = async () => {
    if (!user) {
      setError('You must be logged in to start a call');
      return;
    }

    setError(null);
    setCallStatus('connecting');
    setCallDuration(0);

    try {
      const isApprovalMessage = formData.notificationType.includes('approved');

      await vapiRef.current?.start({
        model: {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: isApprovalMessage
                ? `You are a friendly customer service assistant calling to deliver good news. Your name is Maya from the loan processing department. Keep the conversation brief, professional, and enthusiastic. Congratulate ${formData.customerName} warmly. After delivering the good news, ask if they have any questions. Keep responses concise and friendly.`
                : `You are a professional customer service assistant calling to provide a payment reminder. Your name is Maya from the accounts department. Be polite, helpful, and professional. Remind ${formData.customerName} about their upcoming payment. After delivering the reminder, ask if they need any assistance. Keep responses clear and concise.`,
            },
          ],
        },
        voice: {
          provider: 'playht',
          voiceId: 'jennifer',
        },
        firstMessage: `Hello ${formData.customerName}! ${formData.message}`,
        name: 'Loan Assistant',
      });
    } catch (err: any) {
      console.error('Error starting call:', err);
      setError(err.message || 'Failed to start call');
      setCallStatus('idle');
    }
  };

  const endCall = () => {
    vapiRef.current?.stop();
    setIsCallActive(false);
    setCallStatus('idle');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const toggleMute = () => {
    if (vapiRef.current) {
      vapiRef.current.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-lg p-8 text-white mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Phone className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Web Voice Call Demo</h1>
              <p className="text-emerald-100 mt-1">
                Test AI-powered voice calls directly in your browser
              </p>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 mt-4">
            <p className="text-sm text-emerald-50">
              This demo uses Vapi.ai Web SDK to create interactive voice conversations directly in your browser.
              No phone numbers needed - just click and talk!
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
                disabled={isCallActive}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter customer name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notification Type
              </label>
              <select
                value={formData.notificationType}
                onChange={(e) => handleNotificationTypeChange(e.target.value)}
                disabled={isCallActive}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={isCallActive}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                rows={4}
                placeholder="Enter the message to be spoken"
              />
              <p className="text-xs text-slate-500 mt-1">
                This message will be spoken by the AI assistant at the start of the call
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

            {isCallActive && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                        <Phone className="w-6 h-6 text-white" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-emerald-900">Call Active</h4>
                      <p className="text-sm text-emerald-700 capitalize">{callStatus}</p>
                    </div>
                  </div>
                  <div className="text-2xl font-mono font-bold text-emerald-900">
                    {formatDuration(callDuration)}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleMute}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition ${
                      isMuted
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    {isMuted ? 'Unmute' : 'Mute'}
                  </button>
                  <button
                    onClick={endCall}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                  >
                    <PhoneOff className="w-5 h-5" />
                    End Call
                  </button>
                </div>
              </div>
            )}

            {callStatus === 'ended' && !isCallActive && !error && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Call Ended</h4>
                  <p className="text-sm text-blue-700">
                    Call duration: {formatDuration(callDuration)}
                  </p>
                </div>
              </div>
            )}

            {!isCallActive && (
              <button
                onClick={startCall}
                disabled={callStatus === 'connecting' || !formData.message}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
              >
                {callStatus === 'connecting' ? (
                  <>
                    <Loader className="w-6 h-6 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Phone className="w-6 h-6" />
                    Start Voice Call
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-emerald-600" />
            How It Works
          </h3>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <div className="bg-emerald-100 text-emerald-600 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                1
              </div>
              <p>
                <strong>Browser-Based:</strong> The call happens directly in your browser using WebRTC technology. No phone numbers needed!
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-emerald-100 text-emerald-600 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                2
              </div>
              <p>
                <strong>AI Assistant:</strong> An intelligent AI assistant will speak your message and can respond to your questions naturally.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-emerald-100 text-emerald-600 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                3
              </div>
              <p>
                <strong>Interactive:</strong> You can talk back, ask questions, and have a natural conversation with the AI.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-emerald-100 text-emerald-600 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                4
              </div>
              <p>
                <strong>Real-Time:</strong> The conversation happens in real-time with natural voice interactions.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <h3 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Advantages of Web Calling
          </h3>
          <ul className="space-y-2 text-sm text-emerald-800">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600">•</span>
              <span>No phone numbers required - works entirely in the browser</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600">•</span>
              <span>Free to test and demo without phone carrier costs</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600">•</span>
              <span>Interactive conversations with AI assistant</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600">•</span>
              <span>Instant connection - no waiting for phone to ring</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600">•</span>
              <span>Perfect for testing and demonstrations</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
