import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import type { KycStatus } from '../../lib/database.types';
import { monitoring } from '../../lib/monitoring';
import { createAuditLog } from '../../lib/auditLog';
import { KYCSelector } from './KYCSelector';

interface KYCApplication {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: KycStatus;
  submitted_at: string;
}

const LOAN_TYPES = ['Personal Loan', 'Home Loan', 'Car Loan', 'Business Loan', 'Education Loan'];
const EMPLOYMENT_TYPES = ['Salaried', 'Self-Employed', 'Business Owner', 'Professional'];

export function LoanApplicationForm() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [kycApplication, setKycApplication] = useState<KYCApplication | null>(null);
  const [showKycSelector, setShowKycSelector] = useState(true);

  const [formData, setFormData] = useState({
    loanType: '',
    loanAmount: '',
    loanTenure: '',
    employmentType: '',
    employerName: '',
    monthlyIncome: '',
    salaryFile: null as File | null,
    existingEmi: '',
    creditCardOutstanding: '',
    bankStatementFile: null as File | null,
    creditBureauConsent: false,
  });

  const handleKycSelect = (kyc: KYCApplication) => {
    setKycApplication(kyc);
    setShowKycSelector(false);
    setStep(1);
  };

  const handleCancelKycSelection = () => {
    setShowKycSelector(true);
    setKycApplication(null);
    setStep(0);
  };

  const handleFileUpload = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('loan-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('loan-documents')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const calculateDTI = () => {
    const income = parseFloat(formData.monthlyIncome) || 0;
    const emi = parseFloat(formData.existingEmi) || 0;
    const tenure = parseInt(formData.loanTenure) || 1;
    const amount = parseFloat(formData.loanAmount) || 0;

    const newEmi = (amount * 0.01) / tenure;
    const totalEmi = emi + newEmi;

    return income > 0 ? ((totalEmi / income) * 100).toFixed(2) : '0';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!kycApplication) {
      setError('KYC verification required before applying for a loan');
      setLoading(false);
      return;
    }

    try {
      const salaryUrl = formData.salaryFile
        ? await handleFileUpload(formData.salaryFile, 'salary')
        : '';

      const bankStatementUrl = formData.bankStatementFile
        ? await handleFileUpload(formData.bankStatementFile, 'bank-statements')
        : '';

      const dti = parseFloat(calculateDTI());

      const { data: insertedData, error: insertError } = await supabase
        .from('loan_applications')
        .insert({
          kyc_application_id: kycApplication.id,
          loan_type: formData.loanType,
          loan_amount: parseFloat(formData.loanAmount),
          loan_tenure_months: parseInt(formData.loanTenure),
          employment_type: formData.employmentType,
          employer_name: formData.employerName,
          monthly_income: parseFloat(formData.monthlyIncome),
          salary_doc_url: salaryUrl,
          existing_emi: parseFloat(formData.existingEmi) || 0,
          credit_card_outstanding: parseFloat(formData.creditCardOutstanding) || 0,
          bank_statement_url: bankStatementUrl,
          credit_bureau_consent: formData.creditBureauConsent,
          consent_timestamp: new Date().toISOString(),
          debt_to_income_ratio: dti,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (insertedData?.id) {
        try {
          const assessUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assess-loan-risk`;
          await fetch(assessUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ loanApplicationId: insertedData.id }),
          });
        } catch (riskError) {
          console.log('AI risk assessment will be processed');
        }
      }

      await createAuditLog({
        userId: user?.id,
        actionType: 'loan_application_submitted',
        entityType: 'loan_application',
        entityId: insertedData?.id,
        actionDetails: {
          loanType: formData.loanType,
          loanAmount: formData.loanAmount,
          kycApplicationId: kycApplication?.id,
        },
      });

      monitoring.info('Loan application submitted successfully', {
        userId: user?.id,
        applicationId: insertedData?.id,
        loanAmount: formData.loanAmount,
      });

      setSuccess(true);
    } catch (err: any) {
      monitoring.error('Loan application submission failed', {
        error: err.message,
        userId: user?.id,
      });
      setError(err.message || 'Failed to submit loan application');
    } finally {
      setLoading(false);
    }
  };

  if (showKycSelector || !kycApplication) {
    return (
      <KYCSelector
        onSelect={handleKycSelect}
        onCancel={() => window.history.back()}
      />
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 mb-2">Loan Application Submitted</h2>
          <p className="text-green-700 mb-4">
            Your loan application has been submitted successfully. Our AI risk assessment engine is processing your application.
          </p>
          <div className="bg-white rounded-lg p-4 text-left">
            <h3 className="font-semibold text-slate-900 mb-2">Application Summary</h3>
            <div className="space-y-1 text-sm text-slate-600">
              <p><span className="font-medium">Loan Type:</span> {formData.loanType}</p>
              <p><span className="font-medium">Amount:</span> ₹{parseFloat(formData.loanAmount).toLocaleString('en-IN')}</p>
              <p><span className="font-medium">Tenure:</span> {formData.loanTenure} months</p>
              <p><span className="font-medium">DTI Ratio:</span> {calculateDTI()}%</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-[#0A4A55] mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Loan Application</h2>
              <p className="text-sm text-slate-600">Customer: {kycApplication.customer_name}</p>
            </div>
          </div>
          <button
            onClick={handleCancelKycSelection}
            className="px-4 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
          >
            Change Customer
          </button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className={`flex items-center ${step >= 1 ? 'text-[#0A4A55]' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white' : 'bg-slate-200'}`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium">Loan Details</span>
          </div>
          <div className={`flex items-center ${step >= 2 ? 'text-[#0A4A55]' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white' : 'bg-slate-200'}`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Employment</span>
          </div>
          <div className={`flex items-center ${step >= 3 ? 'text-[#0A4A55]' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white' : 'bg-slate-200'}`}>
              3
            </div>
            <span className="ml-2 text-sm font-medium">Financials</span>
          </div>
          <div className={`flex items-center ${step >= 4 ? 'text-[#0A4A55]' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 4 ? 'bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white' : 'bg-slate-200'}`}>
              4
            </div>
            <span className="ml-2 text-sm font-medium">Consent</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Loan Type</label>
                <select
                  value={formData.loanType}
                  onChange={(e) => setFormData({ ...formData, loanType: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select loan type</option>
                  {LOAN_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Loan Amount Requested (₹)</label>
                <input
                  type="number"
                  value={formData.loanAmount}
                  onChange={(e) => setFormData({ ...formData, loanAmount: e.target.value })}
                  required
                  min="10000"
                  step="1000"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Loan Tenure (Months)</label>
                <input
                  type="number"
                  value={formData.loanTenure}
                  onChange={(e) => setFormData({ ...formData, loanTenure: e.target.value })}
                  required
                  min="6"
                  max="360"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter tenure in months"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Employment Type</label>
                <select
                  value={formData.employmentType}
                  onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select employment type</option>
                  {EMPLOYMENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Employer / Business Name</label>
                <input
                  type="text"
                  value={formData.employerName}
                  onChange={(e) => setFormData({ ...formData, employerName: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter employer or business name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Monthly Income (after tax) (₹)</label>
                <input
                  type="number"
                  value={formData.monthlyIncome}
                  onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                  required
                  min="1"
                  step="1000"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter monthly income"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Upload Latest Salary Slip or ITR</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFormData({ ...formData, salaryFile: e.target.files?.[0] || null })}
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Total Monthly EMI (Existing Loans) (₹)</label>
                <input
                  type="number"
                  value={formData.existingEmi}
                  onChange={(e) => setFormData({ ...formData, existingEmi: e.target.value })}
                  min="0"
                  step="100"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter existing EMI (0 if none)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Credit Card(s) Total Outstanding (₹)</label>
                <input
                  type="number"
                  value={formData.creditCardOutstanding}
                  onChange={(e) => setFormData({ ...formData, creditCardOutstanding: e.target.value })}
                  min="0"
                  step="100"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter outstanding amount (0 if none)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Upload 6-Month Bank Statement</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFormData({ ...formData, bankStatementFile: e.target.files?.[0] || null })}
                    required
                    className="w-full"
                  />
                  <p className="text-sm text-slate-500 mt-2">Max 10MB, PDF only</p>
                </div>
              </div>
              {formData.monthlyIncome && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Estimated DTI Ratio:</span> {calculateDTI()}%
                  </p>
                  <p className="text-xs text-[#0A4A55] mt-1">
                    Lower DTI ratios indicate better creditworthiness
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Credit Bureau Authorization</h3>
                <p className="text-sm text-slate-700 mb-4">
                  To process your loan application, we need to retrieve your credit history and score from CIBIL and other credit information companies.
                </p>
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={formData.creditBureauConsent}
                    onChange={(e) => setFormData({ ...formData, creditBureauConsent: e.target.checked })}
                    required
                    className="w-4 h-4 text-[#0A4A55] rounded focus:ring-2 focus:ring-blue-500 mt-1"
                  />
                  <label htmlFor="consent" className="ml-3 text-sm text-slate-700">
                    I hereby authorize NOVA-GRC and its representatives to retrieve my credit history and score from CIBIL and other credit information companies for the purpose of processing my loan application. I understand that this information will be used to assess my creditworthiness.
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Application Summary</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p><span className="font-medium">Loan Type:</span> {formData.loanType}</p>
                  <p><span className="font-medium">Amount:</span> ₹{parseFloat(formData.loanAmount || '0').toLocaleString('en-IN')}</p>
                  <p><span className="font-medium">Tenure:</span> {formData.loanTenure} months</p>
                  <p><span className="font-medium">Monthly Income:</span> ₹{parseFloat(formData.monthlyIncome || '0').toLocaleString('en-IN')}</p>
                  <p><span className="font-medium">DTI Ratio:</span> {calculateDTI()}%</p>
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
                className="ml-auto px-6 py-3 bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white rounded-lg hover:shadow-xl hover:scale-[1.02] transition"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !formData.creditBureauConsent}
                className="ml-auto px-6 py-3 bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white rounded-lg hover:shadow-xl hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed"
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
