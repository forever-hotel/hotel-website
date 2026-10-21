export type AuthState = { error?: string };

export function safeReturn(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u001f\u007f]/.test(value)
  )
    return '/profile';
  try {
    const url = new URL(value, 'https://hotel.invalid');
    if (
      url.origin !== 'https://hotel.invalid' ||
      ![
        '/',
        '/rooms',
        '/profile',
        '/booking',
        '/booking/confirmation',
      ].includes(url.pathname)
    )
      return '/profile';
    return url.pathname + url.search + url.hash;
  } catch {
    return '/profile';
  }
}

export function validateCredentials(
  email: string,
  password: string,
  registration = false,
): string | undefined {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320)
    return 'Enter a valid email address.';
  if (
    !password ||
    new TextEncoder().encode(password).length > 72 ||
    (registration && password.length < 8)
  )
    return registration
      ? 'Use a password of at least 8 characters and at most 72 bytes.'
      : 'Enter your password (at most 72 bytes).';
}

export function registrationName(
  firstName: string,
  lastName: string,
): string | null {
  const name = `${firstName.trim()} ${lastName.trim()}`;
  return firstName.trim() &&
    lastName.trim() &&
    name.length <= 255 &&
    /^\p{L}[\p{L}\p{M} '’-]*$/u.test(name)
    ? name
    : null;
}

export function authError(status: number): string {
  if (status === 401) return 'Email or password is incorrect.';
  if (status === 409)
    return 'An account with this email already exists. Please sign in.';
  if (status === 400) return 'Please check your details and try again.';
  if (status === 429)
    return 'Too many attempts. Please wait before trying again.';
  return 'The account service is unavailable. Please try again.';
}
