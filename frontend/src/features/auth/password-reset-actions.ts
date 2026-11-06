'use server';

import { cookies } from 'next/headers';
import { postGatewayJson } from '@/lib/api/api-client';
import { validateCredentials } from './validation';

export type PasswordResetState = {
  error?: string;
  message?: string;
  done?: boolean;
};

export async function requestPasswordReset(
  _previous: PasswordResetState,
  form: FormData,
): Promise<PasswordResetState> {
  const email = String(form.get('email') || '').trim();
  if (validateCredentials(email, 'placeholder'))
    return { error: 'Enter a valid email address.' };
  try {
    const response = await postGatewayJson('/hw/guests/forgot-password', {
      email,
    });
    if (response.status === 429)
      return { error: 'Too many attempts. Please wait before trying again.' };
    if (!response.ok)
      return {
        error:
          'Password recovery is unavailable. Please try again later or contact the hotel.',
      };
    return {
      done: true,
      message:
        'If an account exists for that email, a password reset link will be sent. Check your inbox and spam folder. The link expires in 15 minutes.',
    };
  } catch {
    return {
      error: 'Password recovery is unavailable. Please try again later.',
    };
  }
}

export async function resetPassword(
  _previous: PasswordResetState,
  form: FormData,
): Promise<PasswordResetState> {
  const token = String(form.get('token') || '');
  const password = String(form.get('password') || '');
  const error = validateCredentials('guest@example.com', password, true);
  if (error) return { error };
  if (password !== form.get('confirmPassword'))
    return { error: 'Passwords do not match.' };
  if (!/^[0-9a-f-]{36}\.[0-9]{13}\.[A-Za-z0-9_-]{43}$/i.test(token))
    return { error: 'This reset link is invalid. Please request a new one.' };
  try {
    const response = await postGatewayJson('/hw/guests/reset-password', {
      token,
      password,
    });
    if (response.status === 400)
      return {
        error:
          'This reset link is invalid or expired. Please request a new one.',
      };
    if (response.status === 429)
      return { error: 'Too many attempts. Please wait before trying again.' };
    if (!response.ok)
      return {
        error: 'Unable to change your password. Please try again later.',
      };
  } catch {
    return { error: 'Unable to change your password. Please try again later.' };
  }
  (await cookies()).delete('hw_guest_session');
  return {
    done: true,
    message: 'Your password has been changed. Sign in with your new password.',
  };
}
