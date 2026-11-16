/** Values needed to create a guest account. The password must already be bcrypt-hashed. */
export interface CreateGuestData {
  fullName: string;
  email: string;
  passwordHash: string;
  phone?: string | null;
}
