import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Mail,
  MessageSquare,
  Phone,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  channel: 'email' | 'sms' | 'voice';
  title: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  error_message: string | null;
  metadata: any;
  entity_type: string | null;
  entity_id: string | null;
}

export function CommunicationLog() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [dateRange, setDateRange] = useState<string>('all');

  const isAdmin = profile?.role === 'compliance_manager' || profile?.role === 'cco' || profile?.role === 'system_admin';

  useEffect(() => {
    fetchNotifications();
  }, [user, isAdmin]);

  useEffect(() => {
    applyFilters();
  }, [notifications, searchQuery, selectedChannel, selectedStatus, selectedType, dateRange]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...notifications];

    if (searchQuery) {
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedChannel !== 'all') {
      filtered = filtered.filter((n) => n.channel === selectedChannel);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((n) => n.status === selectedStatus);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter((n) => n.type.includes(selectedType));
    }

    if (dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(
        (n) => new Date(n.created_at) >= filterDate
      );
    }

    setFilteredNotifications(filtered);
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-5 h-5 text-[#0A4A55]" />;
      case 'sms':
        return <MessageSquare className="w-5 h-5 text-green-600" />;
      case 'voice':
        return <Phone className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-slate-100 text-slate-700',
      sent: 'bg-blue-100 text-blue-700',
      delivered: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      read: 'bg-purple-100 text-purple-700',
    };

    const icons = {
      pending: <Clock className="w-4 h-4" />,
      sent: <CheckCircle className="w-4 h-4" />,
      delivered: <CheckCircle className="w-4 h-4" />,
      failed: <XCircle className="w-4 h-4" />,
      read: <Eye className="w-4 h-4" />,
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          styles[status as keyof typeof styles]
        }`}
      >
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Channel', 'Type', 'Title', 'Status', 'Message'];
    const rows = filteredNotifications.map((n) => [
      new Date(n.created_at).toLocaleString('en-IN'),
      n.channel.toUpperCase(),
      getTypeLabel(n.type),
      n.title,
      n.status.toUpperCase(),
      n.message.replace(/,/g, ';').substring(0, 100),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `communication-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const stats = {
    total: filteredNotifications.length,
    email: filteredNotifications.filter((n) => n.channel === 'email').length,
    sms: filteredNotifications.filter((n) => n.channel === 'sms').length,
    voice: filteredNotifications.filter((n) => n.channel === 'voice').length,
    delivered: filteredNotifications.filter((n) => n.status === 'delivered' || n.status === 'sent').length,
    failed: filteredNotifications.filter((n) => n.status === 'failed').length,
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A4A55] mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading communication log...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Communication Log</h1>
        <p className="text-slate-600 mt-1">
          Track all email, SMS, and voice notifications
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="bg-slate-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Email</p>
              <p className="text-2xl font-bold text-[#0A4A55]">{stats.email}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Mail className="w-6 h-6 text-[#0A4A55]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">SMS</p>
              <p className="text-2xl font-bold text-green-600">{stats.sms}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Voice</p>
              <p className="text-2xl font-bold text-amber-600">{stats.voice}</p>
            </div>
            <div className="bg-amber-100 p-3 rounded-lg">
              <Phone className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="voice">Voice</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="kyc">KYC</option>
              <option value="loan">Loan</option>
              <option value="emi">EMI</option>
              <option value="payment">Payment</option>
            </select>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No notifications found</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className="p-4 hover:bg-slate-50 transition cursor-pointer"
                onClick={() => setSelectedNotification(notification)}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getChannelIcon(notification.channel)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">
                            {notification.title}
                          </h3>
                          {getStatusBadge(notification.status)}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          {getTypeLabel(notification.type)} •{' '}
                          {notification.channel.toUpperCase()}
                        </p>
                        <p className="text-sm text-slate-700 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-slate-600">
                          {new Date(notification.created_at).toLocaleDateString('en-IN')}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(notification.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    {notification.error_message && (
                      <div className="mt-2 flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{notification.error_message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
        />
      )}
    </div>
  );
}

interface NotificationDetailModalProps {
  notification: Notification;
  onClose: () => void;
}

function NotificationDetailModal({ notification, onClose }: NotificationDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Notification Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <XCircle className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="text-sm font-medium text-slate-700">Title</label>
            <p className="text-slate-900 mt-1">{notification.title}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Message</label>
            <p className="text-slate-900 mt-1 whitespace-pre-wrap">
              {notification.message}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Channel</label>
              <p className="text-slate-900 mt-1 capitalize">{notification.channel}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Type</label>
              <p className="text-slate-900 mt-1">
                {notification.type
                  .split('_')
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ')}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Status</label>
            <div className="mt-1">{getStatusBadge(notification.status)}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Created At</label>
              <p className="text-slate-900 mt-1 text-sm">
                {new Date(notification.created_at).toLocaleString('en-IN')}
              </p>
            </div>
            {notification.sent_at && (
              <div>
                <label className="text-sm font-medium text-slate-700">Sent At</label>
                <p className="text-slate-900 mt-1 text-sm">
                  {new Date(notification.sent_at).toLocaleString('en-IN')}
                </p>
              </div>
            )}
          </div>

          {notification.metadata && Object.keys(notification.metadata).length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700">Metadata</label>
              <pre className="mt-1 text-xs bg-slate-50 p-3 rounded-lg overflow-auto">
                {JSON.stringify(notification.metadata, null, 2)}
              </pre>
            </div>
          )}

          {notification.error_message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <label className="text-sm font-medium text-red-700">Error Message</label>
              <p className="text-red-900 mt-1 text-sm">{notification.error_message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function getStatusBadge(status: string) {
    const styles = {
      pending: 'bg-slate-100 text-slate-700',
      sent: 'bg-blue-100 text-blue-700',
      delivered: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      read: 'bg-purple-100 text-purple-700',
    };

    const icons = {
      pending: <Clock className="w-4 h-4" />,
      sent: <CheckCircle className="w-4 h-4" />,
      delivered: <CheckCircle className="w-4 h-4" />,
      failed: <XCircle className="w-4 h-4" />,
      read: <Eye className="w-4 h-4" />,
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          styles[status as keyof typeof styles]
        }`}
      >
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }
}
