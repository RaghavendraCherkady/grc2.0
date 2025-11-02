import { useState, useEffect } from 'react';
import { Activity, Database, Cpu, CheckCircle, XCircle, Clock } from 'lucide-react';

interface HealthCheck {
  status: string;
  timestamp: string;
  latency: number;
  checks: {
    database: { status: string; latency?: number; error?: string };
    openai: { status: string };
  };
  version: string;
}

export function SystemStatus() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-check`
      );
      const data = await response.json();
      setHealth(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'configured':
        return 'text-green-600 bg-green-100';
      case 'degraded':
      case 'not_configured':
        return 'text-amber-600 bg-amber-100';
      case 'unhealthy':
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-slate-600 bg-slate-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'configured':
        return <CheckCircle className="w-5 h-5" />;
      case 'degraded':
      case 'not_configured':
        return <Clock className="w-5 h-5" />;
      case 'unhealthy':
      case 'error':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!health) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">System Status</h2>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getStatusColor(health.status)}`}>
            {getStatusIcon(health.status)}
            <span className="text-sm font-medium uppercase">{health.status}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Database</h3>
              <p className="text-xs text-slate-500">Supabase PostgreSQL</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getStatusColor(health.checks.database.status)}`}>
            {getStatusIcon(health.checks.database.status)}
            <span className="text-sm font-medium">{health.checks.database.status}</span>
          </div>
          {health.checks.database.latency && (
            <p className="text-xs text-slate-600 mt-2">
              Latency: {health.checks.database.latency.toFixed(2)}ms
            </p>
          )}
          {health.checks.database.error && (
            <p className="text-xs text-red-600 mt-2">{health.checks.database.error}</p>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Cpu className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">OpenAI API</h3>
              <p className="text-xs text-slate-500">AI Processing</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getStatusColor(health.checks.openai.status)}`}>
            {getStatusIcon(health.checks.openai.status)}
            <span className="text-sm font-medium">{health.checks.openai.status}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">System Health</h3>
              <p className="text-xs text-slate-500">Overall Status</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Response Time:</span>
              <span className="font-medium text-slate-900">{health.latency.toFixed(2)}ms</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Version:</span>
              <span className="font-medium text-slate-900">{health.version}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Last Check:</span>
              <span className="font-medium text-slate-900">
                {new Date(health.timestamp).toLocaleTimeString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Monitoring Active</h3>
            <p className="text-sm text-blue-800">
              System health is checked every 30 seconds. All services are monitored in real-time with automatic
              alerting for any degradation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
