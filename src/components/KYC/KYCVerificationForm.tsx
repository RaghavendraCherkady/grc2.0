import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { monitoring } from '../../lib/monitoring';
import { createAuditLog } from '../../lib/auditLog';
import { DocumentNumberInput } from './DocumentNumberInput';
import { ValidationBadge } from './ValidationBadge';
import { getDocumentNumberValidator, validateKYCConsistency, calculateNameMatch, ValidationError } from '../../services/kycValidation';
import { verifyDocument, VerificationResult } from '../../services/governmentVerification';

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
    identityDocNumber: '',
    identityFullName: '',
    identityDOB: '',
    identityFatherName: '',
    addressSameAsIdentity: false,
    addressDocType: '',
    addressFile: null as File | null,
    addressDocNumber: '',
    fullAddress: '',
    pinCode: '',
    panFile: null as File | null,
    panNumber: '',
    panFullName: '',
  });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [docNumberError, setDocNumberError] = useState<string | null>(null);
  const [panNumberError, setPanNumberError] = useState<string | null>(null);
  const [templateValidating, setTemplateValidating] = useState(false);
  const [templateValidationError, setTemplateValidationError] = useState<string | null>(null);
  const [identityDocValidated, setIdentityDocValidated] = useState(false);
  const [addressDocValidated, setAddressDocValidated] = useState(false);
  const [panDocValidated, setPanDocValidated] = useState(false);

  const validateDocumentBeforeUpload = async (file: File, documentType: string): Promise<boolean> => {
    if (file.size > 10 * 1024 * 1024) {
      setTemplateValidationError('File size exceeds 10MB limit');
      return false;
    }

    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      setTemplateValidationError('Invalid file format. Only PDF, JPG, JPEG, and PNG are allowed');
      return false;
    }

    setTemplateValidationError(null);
    return true;
  };

  const validateDocumentTemplate = async (
    fileUrl: string,
    documentType: string,
    docCategory: 'identity' | 'address' | 'pan'
  ): Promise<boolean> => {
    setTemplateValidating(true);
    setTemplateValidationError(null);

    try {
      const processUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-kyc-document`;
      const response = await fetch(processUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentUrl: fileUrl,
          documentType: documentType,
          kycApplicationId: 'temp-validation-' + Date.now()
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result.templateValidation?.rejectionReason || result.error || 'Document validation failed';
        setTemplateValidationError(errorMsg);

        if (docCategory === 'identity') setIdentityDocValidated(false);
        if (docCategory === 'address') setAddressDocValidated(false);
        if (docCategory === 'pan') setPanDocValidated(false);

        setTemplateValidating(false);
        return false;
      }

      if (docCategory === 'identity') setIdentityDocValidated(true);
      if (docCategory === 'address') setAddressDocValidated(true);
      if (docCategory === 'pan') setPanDocValidated(true);

      setTemplateValidating(false);
      return true;
    } catch (error: any) {
      setTemplateValidationError('Failed to validate document. Please try again.');
      setTemplateValidating(false);
      return false;
    }
  };

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

  const validateMandatoryFields = (): boolean => {
    const errors: ValidationError[] = [];

    if (formData.identityDocNumber) {
      const validator = getDocumentNumberValidator(formData.identityDocType);
      const error = validator(formData.identityDocNumber);
      if (error) {
        errors.push({ field: 'identityDocNumber', severity: 'error', message: error });
      }
    }

    if (formData.panNumber) {
      const validator = getDocumentNumberValidator('PAN Card');
      const error = validator(formData.panNumber);
      if (error) {
        errors.push({ field: 'panNumber', severity: 'error', message: error });
      }
    }

    const consistencyErrors = validateKYCConsistency({
      identityProof: {
        fullName: formData.identityFullName,
        dateOfBirth: formData.identityDOB,
        documentNumber: formData.identityDocNumber
      },
      taxId: {
        fullName: formData.panFullName,
        panNumber: formData.panNumber
      },
      addressProof: {
        pinCode: formData.pinCode
      }
    });

    errors.push(...consistencyErrors);
    setValidationErrors(errors);

    return errors.filter(e => e.severity === 'error').length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setValidationErrors([]);

    if (!validateMandatoryFields()) {
      setError('Please fix validation errors before submitting');
      setLoading(false);
      return;
    }

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

      setVerifying(true);
      const verifications: VerificationResult[] = [];

      if (formData.identityDocNumber && formData.identityFullName) {
        try {
          const result = await verifyDocument(formData.identityDocType, {
            documentNumber: formData.identityDocNumber,
            fullName: formData.identityFullName,
            dateOfBirth: formData.identityDOB
          });
          verifications.push(result);
        } catch (err) {
          console.warn('Identity verification failed:', err);
        }
      }

      if (formData.panNumber && formData.panFullName) {
        try {
          const result = await verifyDocument('PAN Card', {
            documentNumber: formData.panNumber,
            fullName: formData.panFullName
          });
          verifications.push(result);
        } catch (err) {
          console.warn('PAN verification failed:', err);
        }
      }

      setVerificationResults(verifications);
      setVerifying(false);

      const requiresManualReview = verifications.some(v => v.status !== 'VERIFIED');

      const { data: insertedData, error: insertError } = await supabase
        .from('kyc_applications')
        .insert({
          customer_name: formData.customerName,
          customer_email: formData.customerEmail,
          customer_phone: formData.customerPhone,
          identity_doc_type: formData.identityDocType,
          identity_doc_url: identityUrl,
          identity_doc_number: formData.identityDocNumber || null,
          address_same_as_identity: formData.addressSameAsIdentity,
          address_doc_type: formData.addressSameAsIdentity ? formData.identityDocType : formData.addressDocType,
          address_doc_url: formData.addressSameAsIdentity ? identityUrl : addressUrl,
          address_doc_number: formData.addressDocNumber || null,
          pan_doc_url: panUrl,
          pan_number: formData.panNumber || null,
          extracted_data: {
            identityProof: {
              documentNumber: formData.identityDocNumber,
              fullName: formData.identityFullName,
              dateOfBirth: formData.identityDOB,
              fatherName: formData.identityFatherName
            },
            addressProof: {
              fullAddress: formData.fullAddress,
              pinCode: formData.pinCode
            },
            taxId: {
              panNumber: formData.panNumber,
              fullName: formData.panFullName
            },
            verificationResults: verifications,
            requiresManualReview
          },
          status: requiresManualReview ? 'needs_review' : 'pending',
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
          <div className={`flex items-center ${step >= 1 ? 'text-[#0A4A55]' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white' : 'bg-slate-200'}`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium">Personal Info</span>
          </div>
          <div className={`flex items-center ${step >= 2 ? 'text-[#0A4A55]' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white' : 'bg-slate-200'}`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Identity Proof</span>
          </div>
          <div className={`flex items-center ${step >= 3 ? 'text-[#0A4A55]' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white' : 'bg-slate-200'}`}>
              3
            </div>
            <span className="ml-2 text-sm font-medium">Address Proof</span>
          </div>
          <div className={`flex items-center ${step >= 4 ? 'text-[#0A4A55]' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 4 ? 'bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white' : 'bg-slate-200'}`}>
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
                    onChange={async (e) => {
                      const file = e.target.files?.[0] || null;
                      if (file && formData.identityDocType) {
                        const isValid = await validateDocumentBeforeUpload(file, formData.identityDocType);
                        if (isValid) {
                          setFormData({ ...formData, identityFile: file });
                          setIdentityDocValidated(false);

                          try {
                            const uploadedUrl = await handleFileUpload(file, 'identity');
                            await validateDocumentTemplate(uploadedUrl, formData.identityDocType, 'identity');
                          } catch (err: any) {
                            setTemplateValidationError(err.message || 'Upload failed');
                            e.target.value = '';
                            setFormData({ ...formData, identityFile: null });
                          }
                        } else {
                          e.target.value = '';
                        }
                      } else {
                        setFormData({ ...formData, identityFile: file });
                      }
                    }}
                    required
                    disabled={templateValidating}
                    className="w-full"
                  />
                  <p className="text-sm text-slate-500 mt-2">Max 10MB, PDF/JPG/PNG</p>
                </div>
                {templateValidating && (
                  <div className="mt-2 text-sm text-blue-600 flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Validating document template via OCR...</span>
                  </div>
                )}
                {formData.identityFile && !templateValidating && identityDocValidated && (
                  <div className="mt-2 text-sm text-green-600 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>Document validated: {formData.identityFile.name}</span>
                  </div>
                )}
                {templateValidationError && (
                  <div className="mt-2 text-sm text-red-600 flex items-start">
                    <AlertCircle className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                    <span>{templateValidationError}</span>
                  </div>
                )}
              </div>

              {formData.identityFile && formData.identityDocType && identityDocValidated && !templateValidationError && (
                <div className="border-t pt-4 mt-4 space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      Please provide document details. These will be verified against government databases.
                    </p>
                  </div>

                  <DocumentNumberInput
                    documentType={formData.identityDocType}
                    value={formData.identityDocNumber}
                    onChange={(value) => {
                      setFormData({ ...formData, identityDocNumber: value });
                      setDocNumberError(null);
                    }}
                    error={docNumberError}
                  />

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Full Name (as per document) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.identityFullName}
                      onChange={(e) => setFormData({ ...formData, identityFullName: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter full name as shown on document"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.identityDOB}
                      onChange={(e) => setFormData({ ...formData, identityDOB: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {(formData.identityDocType === 'Aadhaar Card' || formData.identityDocType === 'Voter ID Card') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Father's Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.identityFatherName}
                        onChange={(e) => setFormData({ ...formData, identityFatherName: e.target.value })}
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter father's name"
                      />
                    </div>
                  )}
                </div>
              )}
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
                  className="w-4 h-4 text-[#0A4A55] rounded focus:ring-2 focus:ring-blue-500"
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
                        onChange={async (e) => {
                          const file = e.target.files?.[0] || null;
                          if (file && formData.addressDocType) {
                            const isValid = await validateDocumentBeforeUpload(file, formData.addressDocType);
                            if (isValid) {
                              setFormData({ ...formData, addressFile: file });
                              setAddressDocValidated(false);

                              try {
                                const uploadedUrl = await handleFileUpload(file, 'address');
                                await validateDocumentTemplate(uploadedUrl, formData.addressDocType, 'address');
                              } catch (err: any) {
                                setTemplateValidationError(err.message || 'Upload failed');
                                e.target.value = '';
                                setFormData({ ...formData, addressFile: null });
                              }
                            } else {
                              e.target.value = '';
                            }
                          } else {
                            setFormData({ ...formData, addressFile: file });
                          }
                        }}
                        required
                        disabled={templateValidating}
                        className="w-full"
                      />
                      <p className="text-sm text-slate-500 mt-2">Max 10MB, PDF/JPG/PNG</p>
                    </div>
                    {templateValidating && (
                      <div className="mt-2 text-sm text-blue-600 flex items-center">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span>Validating address document template via OCR...</span>
                      </div>
                    )}
                    {formData.addressFile && !templateValidating && addressDocValidated && (
                      <div className="mt-2 text-sm text-green-600 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span>Address document validated: {formData.addressFile.name}</span>
                      </div>
                    )}
                  </div>

                  {formData.addressFile && addressDocValidated && (
                    <div className="border-t pt-4 mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Complete Address <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={formData.fullAddress}
                          onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                          rows={3}
                          required
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your complete address"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          PIN Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.pinCode}
                          onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                          maxLength={6}
                          required
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter 6-digit PIN code"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {formData.addressSameAsIdentity && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    Address proof will be taken from your identity document.
                  </p>
                </div>
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
                    onChange={async (e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        const isValid = await validateDocumentBeforeUpload(file, 'PAN Card');
                        if (isValid) {
                          setFormData({ ...formData, panFile: file });
                          setPanDocValidated(false);

                          try {
                            const uploadedUrl = await handleFileUpload(file, 'pan');
                            await validateDocumentTemplate(uploadedUrl, 'PAN Card', 'pan');
                          } catch (err: any) {
                            setTemplateValidationError(err.message || 'Upload failed');
                            e.target.value = '';
                            setFormData({ ...formData, panFile: null });
                          }
                        } else {
                          e.target.value = '';
                        }
                      } else {
                        setFormData({ ...formData, panFile: file });
                      }
                    }}
                    required
                    disabled={templateValidating}
                    className="w-full"
                  />
                  <p className="text-sm text-slate-500 mt-2">Max 10MB, PDF/JPG/PNG</p>
                </div>
                {templateValidating && (
                  <div className="mt-2 text-sm text-blue-600 flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Validating PAN card template via OCR...</span>
                  </div>
                )}
                {formData.panFile && !templateValidating && panDocValidated && (
                  <div className="mt-2 text-sm text-green-600 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>PAN card validated: {formData.panFile.name}</span>
                  </div>
                )}
              </div>

              {formData.panFile && panDocValidated && (
                <div className="border-t pt-4 mt-4 space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      Please provide PAN card details for verification.
                    </p>
                  </div>

                  <DocumentNumberInput
                    documentType="PAN Card"
                    value={formData.panNumber}
                    onChange={(value) => {
                      setFormData({ ...formData, panNumber: value });
                      setPanNumberError(null);
                    }}
                    error={panNumberError}
                  />

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Name on PAN Card <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.panFullName}
                      onChange={(e) => setFormData({ ...formData, panFullName: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter name as shown on PAN card"
                    />
                  </div>

                  {formData.identityFullName && formData.panFullName && (
                    <div className="mt-4">
                      {(() => {
                        const match = calculateNameMatch(formData.identityFullName, formData.panFullName);
                        if (match >= 90) {
                          return <ValidationBadge status="verified" message="Name Match" confidence={match} />;
                        } else if (match >= 70) {
                          return <ValidationBadge status="warning" message="Partial Name Match" confidence={match} />;
                        } else {
                          return <ValidationBadge status="error" message="Name Mismatch" confidence={match} />;
                        }
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="mt-4 space-y-2">
              {validationErrors.map((err, idx) => (
                <div
                  key={idx}
                  className={`px-4 py-3 rounded-lg flex items-start ${
                    err.severity === 'error'
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : 'bg-orange-50 border border-orange-200 text-orange-700'
                  }`}
                >
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{err.message}</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {verifying && (
            <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              <span className="text-sm">Verifying documents with government databases...</span>
            </div>
          )}

          {verificationResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {verificationResults.map((result, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <ValidationBadge
                    status={result.status === 'VERIFIED' ? 'verified' : 'warning'}
                    message={result.message}
                    confidence={result.matchPercentage}
                  />
                </div>
              ))}
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
                disabled={
                  templateValidating ||
                  (step === 2 && (!identityDocValidated || templateValidationError !== null)) ||
                  (step === 3 && !formData.addressSameAsIdentity && (!addressDocValidated || templateValidationError !== null))
                }
                className="ml-auto px-6 py-3 bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white rounded-lg hover:shadow-xl hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || verifying || templateValidating || !panDocValidated || templateValidationError !== null}
                className="ml-auto px-6 py-3 bg-gradient-to-br from-[#0A4A55] to-[#106b7d] text-white rounded-lg hover:shadow-xl hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {(loading || verifying) && <Loader2 className="w-4 h-4 animate-spin" />}
                {verifying ? 'Verifying...' : loading ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
