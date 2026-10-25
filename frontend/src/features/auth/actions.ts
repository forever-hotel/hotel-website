'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { postGatewayJson } from '@/lib/api/api-client';
import {
  authError,
  registrationName,
  safeReturn,
  validateCredentials,
} from './validation';
import type { AuthState } from './validation';

export async function signIn(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const email = String(form.get('email') || '').trim();
  const password = String(form.get('password') || '');
  const error = validateCredentials(email, password);
  if (error) return { error };
  let token: string;
  let expiresIn: number;
  try {
    const response = await postGatewayJson('/hw/guests/login', {
      email,
      password,
    });
    if (!response.ok) return { error: authError(response.status) };
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== 'object' ||
      !('accessToken' in data) ||
      typeof data.accessToken !== 'string' ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
        data.accessToken,
      ) ||
      data.accessToken.length > 3500 ||
      !('expiresIn' in data) ||
      typeof data.expiresIn !== 'number' ||
      !Number.isSafeInteger(data.expiresIn) ||
      data.expiresIn <= 0
    )
      throw new Error('Invalid authentication response');
    token = data.accessToken;
    expiresIn = Math.min(data.expiresIn, 86400);
  } catch {
    return { error: authError(503) };
  }
  (await cookies()).set('hw_guest_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: expiresIn,
  });
  redirect(safeReturn(form.get('returnTo')));
}

export async function signUp(
  _previous: AuthState,
  form: FormData,
): Promise<AuthState> {
  const fullName = registrationName(
    String(form.get('firstName') || ''),
    String(form.get('lastName') || ''),
  );
  if (!fullName)
    return {
      error:
        'Enter your first and last names using letters, spaces, hyphens or apostrophes (255 characters total).',
    };
  const email = String(form.get('email') || '').trim();
  const password = String(form.get('password') || '');
  const error = validateCredentials(email, password, true);
  if (error) return { error };
  if (password !== form.get('confirmPassword'))
    return { error: 'Passwords do not match.' };
  try {
    const response = await postGatewayJson('/hw/guests/register', {
      fullName,
      email,
      password,
    });
    if (response.status !== 201) return { error: authError(response.status) };
  } catch {
    return { error: authError(503) };
  }
  redirect(
    `/sign-in?registered=1&returnTo=${encodeURIComponent(safeReturn(form.get('returnTo')))}`,
  );
}

export async function signOut(): Promise<void> {
  (await cookies()).delete('hw_guest_session');
  redirect('/sign-in');
}
