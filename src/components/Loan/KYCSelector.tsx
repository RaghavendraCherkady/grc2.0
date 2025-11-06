import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, User, CheckCircle, AlertCircle } from 'lucide-react';
import type { KycStatus } from '../../lib/database.types';

interface KYCApplication {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: KycStatus;
  submitted_at: string;
}

interface KYCSelectorProps {
  onSelect: (kyc: KYCApplication) => void;
  onCancel: () => void;
}

export function KYCSelector({ onSelect, onCancel }: KYCSelectorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kycList, setKycList] = useState<KYCApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVerifiedKYCs();
  }, [user]);

  const fetchVerifiedKYCs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('kyc_applications')
        .select('id, customer_name, customer_email, customer_phone, status, submitted_at')
        .eq('status', 'verified')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      setKycList(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load verified KYC applications');
    } finally {
      setLoading(false);
    }
  };

  const filteredKYCs = kycList.filter((kyc) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      kyc.customer_name.toLowerCase().includes(searchLower) ||
      kyc.customer_email.toLowerCase().includes(searchLower) ||
      kyc.customer_phone.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading verified KYC applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-900 mb-2">Error Loading KYC Data</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (kycList.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-amber-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-amber-900 mb-2">No Verified KYC Applications</h2>
          <p className="text-amber-700 mb-6">
            There are no verified KYC applications available. Please ensure KYC applications are verified before creating loan applications.
          </p>
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Select Verified KYC Customer</h2>
            <p className="text-sm text-slate-600 mt-1">
              Choose a customer with verified KYC to create a loan application
            </p>
          </div>
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredKYCs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No customers found matching "{searchTerm}"</p>
            </div>
          ) : (
            filteredKYCs.map((kyc) => (
              <button
                key={kyc.id}
                onClick={() => onSelect(kyc)}
                className="w-full bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg p-4 text-left transition group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <div className="bg-blue-100 group-hover:bg-blue-200 rounded-full p-2 mr-3">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="font-semibold text-slate-900 group-hover:text-blue-900">
                          {kyc.customer_name}
                        </h3>
                        <CheckCircle className="w-4 h-4 text-green-600 ml-2" />
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{kyc.customer_email}</p>
                      <p className="text-sm text-slate-600">{kyc.customer_phone}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        KYC Verified on {new Date(kyc.submitted_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Verified
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            <span className="font-medium">Total Verified Customers:</span> {kycList.length}
          </p>
        </div>
      </div>
    </div>
  );
}
