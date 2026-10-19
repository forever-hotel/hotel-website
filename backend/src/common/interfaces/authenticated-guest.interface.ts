export interface AuthenticatedGuest {
  iss: string;
  sub: string;
  iat: number;
  exp: number;
  role: 'GUEST';
}
