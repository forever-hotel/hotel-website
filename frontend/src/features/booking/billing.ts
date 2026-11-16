export type CheckoutGuest = {
  fullName: string;
  email: string;
  phone?: string | null;
};

/** The account stores a full name; guests can correct the split at checkout. */
export function billingDefaults(guest: CheckoutGuest) {
  const parts = guest.fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.slice(0, -1).join(' ') || parts[0] || '',
    lastName: parts.length > 1 ? parts[parts.length - 1] : '',
    phone: guest.phone || '',
    address: '',
    city: '',
    country: '',
  };
}
