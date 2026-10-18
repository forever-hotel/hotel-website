import { Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { BCRYPT_COST } from '../config/constants';

/**
 * Hashes passwords with bcrypt (HW-06, SDS 6.1.2, OWASP A02). Kept behind its own
 * class so services can be unit-tested with a fake instead of slow real hashing.
 */
@Injectable()
export class PasswordHasher {
  hash(password: string): Promise<string> {
    return hash(password, BCRYPT_COST);
  }
}
