import { ServiceUnavailableException } from '@nestjs/common';

export interface ChargeRule {
  code: string;
  label: string;
  rateBasisPoints: number;
  basis: 'ROOM_SUBTOTAL' | 'RUNNING_TOTAL';
}

export interface QuotePricingPolicy {
  version: string;
  rateBasis: 'INCLUSIVE' | 'EXCLUSIVE';
  charges: ChargeRule[];
}

/**
 * No implicit tax rates. The hotel supplies its applicable charges and bases.
 * Inclusive catalogue prices remain unchanged until an inclusive breakdown
 * contract is supplied; adding charges to them would double-charge guests.
 */
export function calculateQuotePricing(
  subtotal: number,
  policy: QuotePricingPolicy,
) {
  const unavailable = () =>
    new ServiceUnavailableException({
      error: 'PRICING_POLICY_UNAVAILABLE',
      message: 'Booking pricing is not configured correctly.',
    });
  if (
    !Number.isSafeInteger(subtotal) ||
    subtotal <= 0 ||
    subtotal > 2147483647 ||
    !policy.version.trim() ||
    !['INCLUSIVE', 'EXCLUSIVE'].includes(policy.rateBasis)
  )
    throw unavailable();
  if (policy.rateBasis === 'INCLUSIVE' && policy.charges.length)
    throw unavailable();
  const codes = new Set<string>();
  let total = BigInt(subtotal);
  const lineItems = policy.charges.map((rule) => {
    if (
      !/^[A-Z][A-Z0-9_]*$/.test(rule.code) ||
      !rule.label.trim() ||
      codes.has(rule.code) ||
      !Number.isSafeInteger(rule.rateBasisPoints) ||
      rule.rateBasisPoints < 0 ||
      rule.rateBasisPoints > 10000 ||
      !['ROOM_SUBTOTAL', 'RUNNING_TOTAL'].includes(rule.basis)
    )
      throw unavailable();
    codes.add(rule.code);
    const base = rule.basis === 'ROOM_SUBTOTAL' ? BigInt(subtotal) : total;
    // Round each positive line to the nearest cent, with half-cents rounded up.
    const amount = (base * BigInt(rule.rateBasisPoints) + 5000n) / 10000n;
    total += amount;
    return { ...rule, baseAmount: Number(base), amount: Number(amount) };
  });
  if (total > 2147483647n) throw unavailable();
  return {
    currency: 'LKR' as const,
    pricingPolicyVersion: policy.version,
    subtotal,
    lineItems,
    additionalCharges: Number(total) - subtotal,
    totalAmount: Number(total),
    rateBasis: policy.rateBasis,
  };
}
