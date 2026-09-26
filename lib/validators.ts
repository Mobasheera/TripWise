/**
 * UPI ID validation.
 * Rule (per the standard UPI ID grammar): alphanumeric handle of
 * 2–256 chars (dots/hyphens allowed, no whitespace), an "@", then a
 * bank/PSP handle of at least 3 letters (a-z only).
 *   e.g. valid:   rahul.12chauhan-1@okicici, 9136812895@ybl
 *        invalid: rahul 1998, BNZAA2318JM, empty string
 */
const UPI_REGEX = /^[a-zA-Z0-9.-]{2,256}@[a-zA-Z][a-zA-Z]{2,64}$/;

export function isValidUpiId(value: string): boolean {
  if (!value) return false;
  return UPI_REGEX.test(value.trim());
}