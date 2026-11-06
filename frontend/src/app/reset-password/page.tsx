import type { Metadata } from 'next';
import { PasswordResetPage } from '@/features/auth/components/password-reset-page';

export const metadata: Metadata = {
  title: 'Reset password | Forever City Hotel',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default function ResetPasswordPage() {
  return <PasswordResetPage reset />;
}
