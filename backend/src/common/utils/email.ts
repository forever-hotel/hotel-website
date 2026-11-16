/**
 * Trims and lowercases an email address (SDS Table 14). Emails are stored in
 * this form so the UNIQUE constraint on guests.email also catches case changes.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
