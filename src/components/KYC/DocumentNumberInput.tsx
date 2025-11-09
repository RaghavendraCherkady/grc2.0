interface DocumentNumberInputProps {
  documentType: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  disabled?: boolean;
}

export function DocumentNumberInput({
  documentType,
  value,
  onChange,
  error,
  disabled = false
}: DocumentNumberInputProps) {
  const placeholders: { [key: string]: string } = {
    'Aadhaar Card': '1234 5678 9012',
    'PAN Card': 'ABCDE1234F',
    'Voter ID Card': 'ABC1234567',
    'Driving License': 'KA0120230012345',
    'Passport': 'A1234567'
  };

  const formats: { [key: string]: string } = {
    'Aadhaar Card': '12 digits with spaces',
    'PAN Card': '5 letters, 4 digits, 1 letter',
    'Voter ID Card': '3 letters, 7 digits',
    'Driving License': '2 letters, 13 digits',
    'Passport': '1 letter, 7 digits'
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">
        Document Number <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder={placeholders[documentType] || 'Enter document number'}
        disabled={disabled}
        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 ${
          error ? 'border-red-300 bg-red-50' : 'border-slate-300'
        }`}
      />
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <p className="text-xs text-slate-500">
          Format: {formats[documentType] || 'Enter valid document number'}
        </p>
      )}
    </div>
  );
}
