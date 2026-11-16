import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

export type PaymentOption = 'FULL' | 'DEPOSIT';

export function depositPercentage(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const percent = Number(value);
  return percent >= 1 && percent < 100 ? percent : null;
}

export function amountDue(
  total: number,
  option: PaymentOption,
  percent: number | null,
): number {
  if (!Number.isSafeInteger(total) || total <= 0)
    throw new ServiceUnavailableException('Invalid booking total.');
  if (option === 'FULL') return total;
  if (!percent)
    throw new BadRequestException({
      error: 'DEPOSIT_UNAVAILABLE',
      message: 'Advance deposits are not configured. Choose full payment.',
    });
  const amount = Math.max(
    1,
    Number((BigInt(total) * BigInt(percent) + 50n) / 100n),
  );
  if (amount >= total)
    throw new BadRequestException(
      'This booking does not support a partial deposit.',
    );
  return amount;
}
