import type { Metadata } from 'next';
import { AuthPage } from '@/features/auth/components/auth-page';

export const metadata: Metadata = {
  title: 'Create account | Forever City Hotel',
  robots: { index: false, follow: false },
};
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <AuthPage register returnTo={params.returnTo} />;
}
