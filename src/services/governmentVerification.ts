export interface VerificationResult {
  status: 'VERIFIED' | 'MISMATCH' | 'API_ERROR' | 'NOT_FOUND';
  matchPercentage: number;
  message: string;
  details: {
    documentAuthenticity: boolean;
    nameMatch: boolean;
    dobMatch: boolean;
    activeStatus: boolean;
  };
}

export const verifyAadhaar = async (
  aadhaarNumber: string,
  name: string,
  dob: string
): Promise<VerificationResult> => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    status: 'VERIFIED',
    matchPercentage: 95,
    message: 'Aadhaar verified successfully (Mock)',
    details: {
      documentAuthenticity: true,
      nameMatch: true,
      dobMatch: true,
      activeStatus: true
    }
  };
};

export const verifyPAN = async (
  panNumber: string,
  name: string
): Promise<VerificationResult> => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    status: 'VERIFIED',
    matchPercentage: 98,
    message: 'PAN verified successfully (Mock)',
    details: {
      documentAuthenticity: true,
      nameMatch: true,
      dobMatch: true,
      activeStatus: true
    }
  };
};

export const verifyDrivingLicense = async (
  dlNumber: string,
  name: string,
  dob: string
): Promise<VerificationResult> => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    status: 'VERIFIED',
    matchPercentage: 96,
    message: 'Driving License verified successfully (Mock)',
    details: {
      documentAuthenticity: true,
      nameMatch: true,
      dobMatch: true,
      activeStatus: true
    }
  };
};

export const verifyVoterId = async (
  voterIdNumber: string,
  name: string,
  dob: string
): Promise<VerificationResult> => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    status: 'VERIFIED',
    matchPercentage: 94,
    message: 'Voter ID verified successfully (Mock)',
    details: {
      documentAuthenticity: true,
      nameMatch: true,
      dobMatch: true,
      activeStatus: true
    }
  };
};

export const verifyPassport = async (
  passportNumber: string,
  name: string,
  dob: string
): Promise<VerificationResult> => {
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    status: 'VERIFIED',
    matchPercentage: 97,
    message: 'Passport verified successfully (Mock)',
    details: {
      documentAuthenticity: true,
      nameMatch: true,
      dobMatch: true,
      activeStatus: true
    }
  };
};

export const verifyDocument = async (
  documentType: string,
  documentData: {
    documentNumber: string;
    fullName: string;
    dateOfBirth?: string;
  }
): Promise<VerificationResult> => {
  try {
    switch (documentType) {
      case 'Aadhaar Card':
        return await verifyAadhaar(
          documentData.documentNumber,
          documentData.fullName,
          documentData.dateOfBirth || ''
        );
      case 'PAN Card':
        return await verifyPAN(
          documentData.documentNumber,
          documentData.fullName
        );
      case 'Driving License':
        return await verifyDrivingLicense(
          documentData.documentNumber,
          documentData.fullName,
          documentData.dateOfBirth || ''
        );
      case 'Voter ID Card':
        return await verifyVoterId(
          documentData.documentNumber,
          documentData.fullName,
          documentData.dateOfBirth || ''
        );
      case 'Passport':
        return await verifyPassport(
          documentData.documentNumber,
          documentData.fullName,
          documentData.dateOfBirth || ''
        );
      default:
        throw new Error('Unsupported document type');
    }
  } catch (error: any) {
    return {
      status: 'API_ERROR',
      matchPercentage: 0,
      message: error.message || 'Verification failed',
      details: {
        documentAuthenticity: false,
        nameMatch: false,
        dobMatch: false,
        activeStatus: false
      }
    };
  }
};
