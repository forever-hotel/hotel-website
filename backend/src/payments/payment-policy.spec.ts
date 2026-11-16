import { amountDue, depositPercentage } from './payment-policy';
describe('Payment amounts', () => {
  it('defaults to full payment, keeps amounts in cents and never invents a deposit policy', () => {
    expect(amountDue(2000000, 'FULL', null)).toBe(2000000);
    expect(() => amountDue(2000000, 'DEPOSIT', null)).toThrow();
    expect(depositPercentage(undefined)).toBeNull();
    for (const value of ['0', '100', '-5', '1.5', 'bad'])
      expect(depositPercentage(value)).toBeNull();
  });
  it('supports an explicitly configured future deposit with half-up rounding', () => {
    expect(depositPercentage('30')).toBe(30);
    expect(amountDue(2000000, 'DEPOSIT', 30)).toBe(600000);
    expect(amountDue(101, 'DEPOSIT', 50)).toBe(51);
    expect(() => amountDue(1, 'DEPOSIT', 50)).toThrow();
    expect(() => amountDue(-1, 'FULL', null)).toThrow();
  });
});
