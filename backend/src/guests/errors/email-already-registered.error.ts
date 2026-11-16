/**
 * Thrown when a guest account already exists for an email (HW-06). The message
 * never contains the email itself, so it is safe to log.
 */
export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('A guest account already exists for this email');
    this.name = 'EmailAlreadyRegisteredError';
  }
}
