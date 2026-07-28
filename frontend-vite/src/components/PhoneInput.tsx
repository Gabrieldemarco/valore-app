import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import flags from '../utils/phoneFlags';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  required?: boolean;
}

const countryCodes = [
  { code: 'UY', dial: '+598', label: 'Uruguay' },
  { code: 'AR', dial: '+54', label: 'Argentina' },
  { code: 'BR', dial: '+55', label: 'Brasil' },
  { code: 'CL', dial: '+56', label: 'Chile' },
  { code: 'PY', dial: '+595', label: 'Paraguay' },
  { code: 'BO', dial: '+591', label: 'Bolivia' },
  { code: 'PE', dial: '+51', label: 'Perú' },
  { code: 'EC', dial: '+593', label: 'Ecuador' },
  { code: 'CO', dial: '+57', label: 'Colombia' },
  { code: 'VE', dial: '+58', label: 'Venezuela' },
  { code: 'MX', dial: '+52', label: 'México' },
  { code: 'ES', dial: '+34', label: 'España' },
  { code: 'US', dial: '+1', label: 'Estados Unidos' },
  { code: 'PA', dial: '+507', label: 'Panamá' },
  { code: 'CR', dial: '+506', label: 'Costa Rica' },
  { code: 'DO', dial: '+1-809', label: 'República Dominicana' },
  { code: 'PR', dial: '+1-787', label: 'Puerto Rico' },
];

function parsePhone(value: string): { dial: string; number: string } {
  const cleaned = value.trim();
  for (const cc of countryCodes) {
    if (cleaned.startsWith(cc.dial)) {
      return { dial: cc.dial, number: cleaned.slice(cc.dial.length) };
    }
  }
  if (cleaned.startsWith('+')) {
    return { dial: '', number: cleaned };
  }
  return { dial: '+598', number: cleaned };
}

export default function PhoneInput({ value, onChange, placeholder, className, style, disabled, required }: Props) {
  const { t } = useTranslation();
  const { dial, number } = useMemo(() => parsePhone(value), [value]);

  const handleDialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDial = e.target.value;
    onChange(newDial + number);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value;
    onChange(dial + newNumber);
  };

  return (
    <div style={{ display: 'flex', gap: 4, ...style }}>
      <select
        className={className || 'glass-input'}
        value={dial}
        onChange={handleDialChange}
        disabled={disabled}
        style={{ width: 130, flexShrink: 0, ...(typeof style === 'object' && style !== null ? {} : {}) }}
      >
        {countryCodes.map(cc => (
          <option key={cc.code} value={cc.dial}>
            {flags[cc.code] || ''} {cc.dial} {t(`phoneInput.${cc.code.toLowerCase()}`, cc.label)}
          </option>
        ))}
      </select>
      <input
        type="tel"
        className={className || 'glass-input'}
        value={number}
        onChange={handleNumberChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className="flex-1 min-w-0"
      />
    </div>
  );
}
