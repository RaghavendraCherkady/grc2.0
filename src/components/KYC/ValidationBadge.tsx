import { CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';

interface ValidationBadgeProps {
  status: 'verified' | 'pending' | 'warning' | 'error';
  message?: string;
  confidence?: number;
}

export function ValidationBadge({ status, message, confidence }: ValidationBadgeProps) {
  const config = {
    verified: {
      bg: 'bg-green-50',
      text: 'text-green-800',
      border: 'border-green-300',
      icon: CheckCircle,
      defaultMessage: 'Verified'
    },
    pending: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      border: 'border-yellow-300',
      icon: Clock,
      defaultMessage: 'Pending'
    },
    warning: {
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      border: 'border-orange-300',
      icon: AlertTriangle,
      defaultMessage: 'Warning'
    },
    error: {
      bg: 'bg-red-50',
      text: 'text-red-800',
      border: 'border-red-300',
      icon: XCircle,
      defaultMessage: 'Error'
    }
  };

  const { bg, text, border, icon: Icon, defaultMessage } = config[status];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${bg} ${border}`}>
      <Icon className={`w-4 h-4 ${text}`} />
      <span className={`text-sm font-medium ${text}`}>
        {message || defaultMessage}
      </span>
      {confidence !== undefined && (
        <span className={`text-xs ${text} opacity-75`}>
          ({confidence}%)
        </span>
      )}
    </div>
  );
}
