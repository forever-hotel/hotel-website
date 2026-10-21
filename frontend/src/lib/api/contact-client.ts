export type EnquiryInput = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
};

export async function submitEnquiry(
  input: EnquiryInput,
): Promise<{ accepted: boolean; message: string }> {
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(12000),
    });
    if (response.status === 429)
      return {
        accepted: false,
        message:
          'Too many enquiries. Please wait a minute before trying again.',
      };
    if (response.status === 400)
      return {
        accepted: false,
        message:
          'Please check your name, email, phone and message, then try again.',
      };
    if (!response.ok) throw new Error('Request failed');
    const data: unknown = await response.json();
    if (data && typeof data === 'object' && 'status' in data) {
      if (data.status === 'accepted')
        return {
          accepted: true,
          message:
            'Your enquiry has been accepted for email delivery. Inbox delivery is not yet confirmed.',
        };
      if (data.status === 'sandbox')
        return {
          accepted: false,
          message:
            'Test mode: your enquiry was validated, but no email was sent.',
        };
    }
    throw new Error('Unexpected response');
  } catch {
    return {
      accepted: false,
      message:
        'We could not confirm your enquiry. Your details are kept below; please try again later.',
    };
  }
}
