import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { monitoring } from '../../lib/monitoring';
import { createAuditLog } from '../../lib/auditLog';

const IDENTITY_DOC_TYPES = ['Aadhaar Card', 'Passport', 'Voter ID Card', 'Driving License'];
const ADDRESS_DOC_TYPES = ['Aadhaar Card', 'Passport', 'Voter ID Card', 'Utility Bill', 'Bank Statement'];

export function KYCVerificationForm() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    identityDocType: '',
    identityFile: null as File | null,
    addressSameAsIdentity: false,
    addressDocType: '',
    addressFile: null as File | null,
    panFile: null as File | null,
  });

  const handleFileUpload = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('kyc-documents')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const identityUrl = formData.identityFile
        ? await handleFileUpload(formData.identityFile, 'identity')
        : '';

      const addressUrl = !formData.addressSameAsIdentity && formData.addressFile
        ? await handleFileUpload(formData.addressFile, 'address')
        : '';

      const panUrl = formData.panFile
        ? await handleFileUpload(formData.panFile, 'pan')
        : '';

      const { data: insertedData, error: insertError } = await supabase
        .from('kyc_applications')
        .insert({
          customer_name: formData.customerName,
          customer_email: formData.customerEmail,
          customer_phone: formData.customerPhone,
          identity_doc_type: formData.identityDocType,
          identity_doc_url: identityUrl,
          address_same_as_identity: formData.addressSameAsIdentity,
          address_doc_type: formData.addressSameAsIdentity ? formData.identityDocType : formData.addressDocType,
          address_doc_url: formData.addressSameAsIdentity ? identityUrl : addressUrl,
          pan_doc_url: panUrl,
          status: 'pending',
          created_by: user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Trigger AI verification manually (database trigger will also fire)
      if (insertedData?.id) {
        try {
          const verifyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-kyc-rag`;
          await fetch(verifyUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ kycApplicationId: insertedData.id }),
          });
        } catch (verifyError) {
          console.log('AI verification will be triggered by database trigger');
        }
      }

      await createAuditLog({
        userId: user?.id,
        actionType: 'kyc_application_submitted',
        entityType: 'kyc_application',
        entityId: insertedData?.id,
        actionDetails: {
          customerName: formData.customerName,
          identityDocType: formData.identityDocType,
        },
      });

      monitoring.info('KYC application submitted successfully', {
        userId: user?.id,
        applicationId: insertedData?.id,
      });

      setSuccess(true);
    } catch (err: any) {
      monitoring.error('KYC application submission failed', {
        error: err.message,
        userId: user?.id,
      });
      setError(err.message || 'Failed to submit KYC application');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 mb-2">KYC Application Submitted</h2>
          <p className="text-green-700 mb-4">
            Your KYC application has been submitted successfully. Our RAG-powered AI engine is now processing your documents with OCR and compliance verification.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800">
              <strong>AI Processing Steps:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
              <li>Document OCR and text extraction</li>
              <li>RAG-based compliance check against RBI regulations</li>
              <li>Cross-document data consistency validation</li>
              <li>Risk assessment and confidence scoring</li>
            </ul>
            <p className="text-sm text-blue-800 mt-3">
              You will be notified once verification is complete. High-confidence applications are auto-approved!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">KYC Verification</h2>
        <p className="text-slate-600 mb-6">Complete your identity verification to access banking services</p>

        <div className="flex items-center justify-between mb-8">
          <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium">Personal Info</span>
          </div>
          <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Identity Proof</span>
          </div>
          <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
              3
            </div>
            <span className="ml-2 text-sm font-medium">Address Proof</span>
          </div>
          <div className={`flex items-center ${step >= 4 ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 4 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
              4
            </div>
            <span className="ml-2 text-sm font-medium">PAN Card</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Document Type</label>
                <select
                  value={formData.identityDocType}
                  onChange={(e) => setFormData({ ...formData, identityDocType: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose document type</option>
                  {IDENTITY_DOC_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload {formData.identityDocType || 'Identity Document'}
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFormData({ ...formData, identityFile: e.target.files?.[0] || null })}
                    required
                    className="w-full"
                  />
                  <p className="text-sm text-slate-500 mt-2">Max 10MB, PDF/JPG/PNG</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="sameAddress"
                  checked={formData.addressSameAsIdentity}
                  onChange={(e) => setFormData({ ...formData, addressSameAsIdentity: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="sameAddress" className="ml-2 text-sm text-slate-700">
                  My Identity Proof is also my Address Proof
                </label>
              </div>

              {!formData.addressSameAsIdentity && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Document Type</label>
                    <select
                      value={formData.addressDocType}
                      onChange={(e) => setFormData({ ...formData, addressDocType: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Choose document type</option>
                      {ADDRESS_DOC_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Upload {formData.addressDocType || 'Address Document'}
                    </label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
                      <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setFormData({ ...formData, addressFile: e.target.files?.[0] || null })}
                        required
                        className="w-full"
                      />
                      <p className="text-sm text-slate-500 mt-2">Max 10MB, PDF/JPG/PNG</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Upload PAN Card</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFormData({ ...formData, panFile: e.target.files?.[0] || null })}
                    required
                    className="w-full"
                  />
                  <p className="text-sm text-slate-500 mt-2">Max 10MB, PDF/JPG/PNG</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="flex justify-between mt-8">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Previous
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="ml-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="ml-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
