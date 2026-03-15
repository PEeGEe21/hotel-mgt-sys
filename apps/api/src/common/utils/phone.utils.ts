import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

export function normalizePhone(
  phone?: string | null,
  defaultCountry: CountryCode = 'NG',
): string | null {
  if (!phone) return null;

  const parsed = parsePhoneNumberFromString(phone, defaultCountry);

  if (!parsed) return null;

  return parsed.number.replace('+', '');
}
