import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isEmail } from 'class-validator';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';

@Injectable()
export class ContactService {
  constructor(private readonly config: ConfigService) {}

  async send(
    enquiry: CreateEnquiryDto,
  ): Promise<{ status: 'accepted' | 'sandbox' }> {
    const mode = this.config.get<string>('CONTACT_EMAIL_MODE', 'off');
    const key = this.config.get<string>('BREVO_API_KEY');
    const from = this.config.get<string>('CONTACT_EMAIL_FROM');
    const to = this.config.get<string>('CONTACT_EMAIL_TO');
    if (
      !['sandbox', 'send'].includes(mode) ||
      !key ||
      !from ||
      !to ||
      !isEmail(from) ||
      !isEmail(to)
    ) {
      throw this.unavailable();
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': key,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          to: [{ email: to }],
          sender: { email: from, name: 'Forever City Hotel' },
          replyTo: { email: enquiry.email, name: enquiry.name },
          subject: `Website enquiry: ${enquiry.subject}`,
          textContent: `Name: ${enquiry.name}\nEmail: ${enquiry.email}\nPhone: ${enquiry.phone || 'Not supplied'}\n\n${enquiry.message}`,
          // Brevo sandbox is a message header in the JSON body, not an HTTP header.
          ...(mode === 'sandbox'
            ? { headers: { 'X-Sib-Sandbox': 'drop' } }
            : {}),
        }),
      });
      // Brevo returns 201 with a messageId for both live and sandbox requests.
      if (response.status !== 201) throw this.unavailable();
      const result: unknown = await response.json();
      if (
        !result ||
        typeof result !== 'object' ||
        !('messageId' in result) ||
        typeof result.messageId !== 'string' ||
        !result.messageId.trim()
      ) {
        throw this.unavailable();
      }
      return { status: mode === 'sandbox' ? 'sandbox' : 'accepted' };
    } catch {
      // Do not log credentials, personal input, or raw provider error responses.
      throw this.unavailable();
    }
  }

  private unavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      error: 'CONTACT_UNAVAILABLE',
      message: 'Contact sending is unavailable. Please try again later.',
    });
  }
}
