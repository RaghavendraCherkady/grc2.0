export interface DocumentTemplate {
  type: string;
  requiredFields: string[];
  layoutPatterns: string[];
  keyIdentifiers: string[];
  rejectionReasons: string[];
}

export const DOCUMENT_TEMPLATES: { [key: string]: DocumentTemplate } = {
  'Aadhaar Card': {
    type: 'Aadhaar Card',
    requiredFields: [
      'name',
      'dob',
      'gender',
      'aadhaar_number',
      'address'
    ],
    layoutPatterns: [
      'Government of India',
      'UIDAI',
      'Unique Identification Authority of India',
      'भारत सरकार'
    ],
    keyIdentifiers: [
      '12-digit number pattern',
      'QR code presence',
      'hologram or security features'
    ],
    rejectionReasons: []
  },
  'PAN Card': {
    type: 'PAN Card',
    requiredFields: [
      'name',
      'father_name',
      'dob',
      'pan_number',
      'signature'
    ],
    layoutPatterns: [
      'INCOME TAX DEPARTMENT',
      'GOVT. OF INDIA',
      'Permanent Account Number',
      'आयकर विभाग'
    ],
    keyIdentifiers: [
      '10-character PAN format',
      'Income Tax Department logo',
      'hologram'
    ],
    rejectionReasons: []
  },
  'Passport': {
    type: 'Passport',
    requiredFields: [
      'surname',
      'given_name',
      'passport_number',
      'dob',
      'nationality',
      'issue_date',
      'expiry_date'
    ],
    layoutPatterns: [
      'PASSPORT',
      'Republic of India',
      'भारत गणराज्य',
      'P<IND'
    ],
    keyIdentifiers: [
      'MRZ (Machine Readable Zone)',
      'Passport number format',
      'National emblem'
    ],
    rejectionReasons: []
  },
  'Voter ID Card': {
    type: 'Voter ID Card',
    requiredFields: [
      'name',
      'father_name',
      'dob',
      'voter_id_number',
      'address'
    ],
    layoutPatterns: [
      'Election Commission of India',
      'ELECTORAL PHOTO IDENTITY CARD',
      'भारत निर्वाचन आयोग',
      'EPIC'
    ],
    keyIdentifiers: [
      'Voter ID number format',
      'Election Commission logo',
      'hologram'
    ],
    rejectionReasons: []
  },
  'Driving License': {
    type: 'Driving License',
    requiredFields: [
      'name',
      'father_name',
      'dob',
      'license_number',
      'issue_date',
      'validity'
    ],
    layoutPatterns: [
      'DRIVING LICENCE',
      'Form of Driving Licence',
      'Transport Department',
      'State Government'
    ],
    keyIdentifiers: [
      'DL number with state code',
      'Vehicle classes',
      'Photo and signature'
    ],
    rejectionReasons: []
  },
  'Utility Bill': {
    type: 'Utility Bill',
    requiredFields: [
      'name',
      'address',
      'bill_date',
      'account_number'
    ],
    layoutPatterns: [
      'electricity',
      'water',
      'gas',
      'telephone',
      'bill',
      'invoice'
    ],
    keyIdentifiers: [
      'Service provider name',
      'Bill amount',
      'Due date'
    ],
    rejectionReasons: []
  },
  'Bank Statement': {
    type: 'Bank Statement',
    requiredFields: [
      'name',
      'address',
      'account_number',
      'bank_name',
      'statement_period'
    ],
    layoutPatterns: [
      'BANK',
      'Account Statement',
      'Statement of Account',
      'Customer Name',
      'Account Number'
    ],
    keyIdentifiers: [
      'Bank logo',
      'Transaction details',
      'Account balance'
    ],
    rejectionReasons: []
  }
};

export interface TemplateValidationResult {
  isValid: boolean;
  confidence: number;
  matchedTemplate: string | null;
  matchedFields: string[];
  missingFields: string[];
  detectedPatterns: string[];
  rejectionReason?: string;
  suggestions?: string;
}

export const validateDocumentTemplate = (
  documentType: string,
  extractedText: string,
  ocrData?: any
): TemplateValidationResult => {
  const template = DOCUMENT_TEMPLATES[documentType];

  if (!template) {
    return {
      isValid: false,
      confidence: 0,
      matchedTemplate: null,
      matchedFields: [],
      missingFields: [],
      detectedPatterns: [],
      rejectionReason: 'Unknown document type',
      suggestions: 'Please select a valid document type'
    };
  }

  const textLower = extractedText.toLowerCase();
  const matchedPatterns: string[] = [];
  const matchedFields: string[] = [];
  const missingFields: string[] = [];

  let patternScore = 0;
  template.layoutPatterns.forEach(pattern => {
    if (textLower.includes(pattern.toLowerCase())) {
      matchedPatterns.push(pattern);
      patternScore += 1;
    }
  });

  const patternMatchPercentage = (patternScore / template.layoutPatterns.length) * 100;

  if (patternMatchPercentage < 30) {
    const wrongDocType = detectWrongDocumentType(textLower);
    return {
      isValid: false,
      confidence: patternMatchPercentage,
      matchedTemplate: wrongDocType,
      matchedFields: [],
      missingFields: template.requiredFields,
      detectedPatterns: matchedPatterns,
      rejectionReason: wrongDocType
        ? `Wrong document type detected. Expected ${documentType}, but found ${wrongDocType}`
        : `Document does not match ${documentType} template. Key identifying patterns not found.`,
      suggestions: wrongDocType
        ? `Please upload a valid ${documentType} instead of ${wrongDocType}`
        : `Ensure the document is a clear, unedited ${documentType} issued by the appropriate authority`
    };
  }

  template.requiredFields.forEach(field => {
    const fieldDetected = detectField(field, extractedText, ocrData);
    if (fieldDetected) {
      matchedFields.push(field);
    } else {
      missingFields.push(field);
    }
  });

  const fieldMatchPercentage = (matchedFields.length / template.requiredFields.length) * 100;
  const overallConfidence = (patternMatchPercentage * 0.6) + (fieldMatchPercentage * 0.4);

  const isValid = overallConfidence >= 60 && patternMatchPercentage >= 40;

  return {
    isValid,
    confidence: Math.round(overallConfidence),
    matchedTemplate: isValid ? documentType : null,
    matchedFields,
    missingFields,
    detectedPatterns: matchedPatterns,
    rejectionReason: !isValid
      ? `Document validation failed. Confidence: ${Math.round(overallConfidence)}%. ${missingFields.length > 0 ? `Missing critical fields: ${missingFields.join(', ')}` : 'Pattern mismatch'}`
      : undefined,
    suggestions: !isValid
      ? `Please ensure the uploaded document is a clear, complete, and authentic ${documentType}`
      : undefined
  };
};

const detectWrongDocumentType = (text: string): string | null => {
  const allTypes = Object.keys(DOCUMENT_TEMPLATES);

  for (const type of allTypes) {
    const template = DOCUMENT_TEMPLATES[type];
    let matches = 0;

    template.layoutPatterns.forEach(pattern => {
      if (text.includes(pattern.toLowerCase())) {
        matches++;
      }
    });

    if (matches >= 2) {
      return type;
    }
  }

  return null;
};

const detectField = (field: string, text: string, ocrData?: any): boolean => {
  const textLower = text.toLowerCase();

  const fieldPatterns: { [key: string]: RegExp[] } = {
    'name': [/name[:\s]+([a-z\s]+)/i, /\b[A-Z][a-z]+ [A-Z][a-z]+\b/],
    'dob': [/date of birth[:\s]+/i, /dob[:\s]+/i, /\d{2}[-/]\d{2}[-/]\d{4}/],
    'gender': [/male|female|transgender/i],
    'aadhaar_number': [/\d{4}\s?\d{4}\s?\d{4}/],
    'pan_number': [/[A-Z]{5}\d{4}[A-Z]/],
    'passport_number': [/[A-Z]\d{7}/],
    'voter_id_number': [/[A-Z]{3}\d{7}/],
    'license_number': [/[A-Z]{2}[-]?\d{13}/],
    'address': [/address[:\s]+/i, /pin[:\s]*\d{6}/i],
    'father_name': [/father['\s]?s?\s+name[:\s]+/i, /s\/o[:\s]+/i],
    'issue_date': [/date of issue[:\s]+/i, /issued[:\s]+/i],
    'expiry_date': [/date of expiry[:\s]+/i, /valid till[:\s]+/i],
    'signature': [/signature/i],
    'account_number': [/account\s+no\.?[:\s]+/i, /a\/c[:\s]+/i],
    'bank_name': [/bank/i],
    'bill_date': [/bill date[:\s]+/i, /dated[:\s]+/i],
    'nationality': [/nationality[:\s]+/i, /indian/i]
  };

  const patterns = fieldPatterns[field] || [];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  if (ocrData && ocrData[field]) {
    return true;
  }

  return false;
};

export const validateBeforeOCR = async (
  file: File,
  documentType: string
): Promise<{ valid: boolean; reason?: string }> => {
  if (file.size > 10 * 1024 * 1024) {
    return {
      valid: false,
      reason: 'File size exceeds 10MB limit'
    };
  }

  const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  const fileName = file.name.toLowerCase();
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    return {
      valid: false,
      reason: 'Invalid file format. Only PDF, JPG, JPEG, and PNG are allowed'
    };
  }

  return { valid: true };
};
