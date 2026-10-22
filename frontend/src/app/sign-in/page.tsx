import type { Metadata } from 'next';
import { AuthPage } from '@/features/auth/components/auth-page';

export const metadata: Metadata = {
  title: 'Sign in | Forever City Hotel',
  robots: { index: false, follow: false },
};
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <AuthPage
      register={false}
      returnTo={params.returnTo}
      registered={params.registered === '1'}
      expired={params.expired === '1'}
    />
  );
}
