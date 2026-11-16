import type { Metadata } from 'next';
import { PasswordResetPage } from '@/features/auth/components/password-reset-page';

export const metadata: Metadata = {
  title: 'Forgot password | Forever City Hotel',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default function ForgotPasswordPage() {
  return <PasswordResetPage />;
}
