export interface ValidationError {
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

export const documentNumberValidators = {
  aadhaar: (value: string): string | null => {
    const pattern = /^\d{4}\s?\d{4}\s?\d{4}$/;
    return pattern.test(value) ? null : 'Invalid Aadhaar format (e.g., 1234 5678 9012)';
  },

  pan: (value: string): string | null => {
    const pattern = /^[A-Z]{5}\d{4}[A-Z]$/;
    return pattern.test(value) ? null : 'Invalid PAN format (e.g., ABCDE1234F)';
  },

  voterId: (value: string): string | null => {
    const pattern = /^[A-Z]{3}\d{7}$/;
    return pattern.test(value) ? null : 'Invalid Voter ID format (e.g., ABC1234567)';
  },

  drivingLicense: (value: string): string | null => {
    const pattern = /^[A-Z]{2}\d{13}$/;
    return pattern.test(value) ? null : 'Invalid DL format (e.g., KA0120230012345)';
  },

  passport: (value: string): string | null => {
    const pattern = /^[A-Z]\d{7}$/;
    return pattern.test(value) ? null : 'Invalid Passport format (e.g., A1234567)';
  }
};

export const calculateNameMatch = (name1: string, name2: string): number => {
  if (!name1 || !name2) return 0;

  const normalized1 = name1.toLowerCase().trim().replace(/\s+/g, ' ');
  const normalized2 = name2.toLowerCase().trim().replace(/\s+/g, ' ');

  if (normalized1 === normalized2) return 100;

  const words1 = new Set(normalized1.split(' '));
  const words2 = new Set(normalized2.split(' '));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return Math.round((intersection.size / union.size) * 100);
};

export const calculateAge = (dateOfBirth: string): number => {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
};

export const validatePinCode = (pinCode: string): string | null => {
  const pattern = /^\d{6}$/;
  if (!pattern.test(pinCode)) {
    return 'PIN code must be 6 digits';
  }

  const pin = parseInt(pinCode);
  if (pin < 100000 || pin > 999999) {
    return 'Invalid Indian PIN code';
  }

  return null;
};

export const validateKYCConsistency = (formData: {
  identityProof?: {
    fullName?: string;
    dateOfBirth?: string;
    documentNumber?: string;
  };
  taxId?: {
    fullName?: string;
    panNumber?: string;
  };
  addressProof?: {
    pinCode?: string;
  };
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (formData.identityProof?.fullName && formData.taxId?.fullName) {
    const nameMatch = calculateNameMatch(
      formData.identityProof.fullName,
      formData.taxId.fullName
    );

    if (nameMatch < 70) {
      errors.push({
        field: 'nameMatch',
        severity: 'error',
        message: `Name mismatch detected (${nameMatch}% match). Names must be consistent across documents.`
      });
    } else if (nameMatch < 90) {
      errors.push({
        field: 'nameMatch',
        severity: 'warning',
        message: `Partial name mismatch (${nameMatch}% match). Please verify spelling.`
      });
    }
  }

  if (formData.identityProof?.dateOfBirth) {
    const age = calculateAge(formData.identityProof.dateOfBirth);
    if (age < 18) {
      errors.push({
        field: 'dateOfBirth',
        severity: 'error',
        message: 'Applicant must be at least 18 years old'
      });
    }
  }

  if (formData.addressProof?.pinCode) {
    const pinError = validatePinCode(formData.addressProof.pinCode);
    if (pinError) {
      errors.push({
        field: 'pinCode',
        severity: 'error',
        message: pinError
      });
    }
  }

  return errors;
};

export const getDocumentNumberValidator = (documentType: string) => {
  const docTypeMap: { [key: string]: (value: string) => string | null } = {
    'Aadhaar Card': documentNumberValidators.aadhaar,
    'PAN Card': documentNumberValidators.pan,
    'Voter ID Card': documentNumberValidators.voterId,
    'Driving License': documentNumberValidators.drivingLicense,
    'Passport': documentNumberValidators.passport,
  };

  return docTypeMap[documentType] || (() => null);
};
