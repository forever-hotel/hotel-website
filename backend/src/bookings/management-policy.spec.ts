import {
  managementCutoff,
  managementPolicy,
  PROJECT_MANAGEMENT_POLICY,
  requireBeforeCutoff,
} from './management-policy';

describe('Booking management cutoff', () => {
  const policy = PROJECT_MANAGEMENT_POLICY;
  it('uses 2 PM Sri Lanka time with a strict 24-hour cutoff', () => {
    expect(managementCutoff('2099-12-10', policy).toISOString()).toBe(
      '2099-12-09T08:30:00.000Z',
    );
    expect(() =>
      requireBeforeCutoff(
        '2099-12-10',
        new Date('2099-12-09T08:29:59.999Z'),
        policy,
      ),
    ).not.toThrow();
    for (const time of ['2099-12-09T08:30:00Z', '2099-12-09T08:30:00.001Z'])
      expect(() =>
        requireBeforeCutoff('2099-12-10', new Date(time), policy),
      ).toThrow();
  });
  it('supports explicitly configured check-in hours', () => {
    expect(
      managementCutoff('2099-12-10', {
        ...policy,
        checkInTime: '15:30',
      }).toISOString(),
    ).toBe('2099-12-09T10:00:00.000Z');
    expect(managementPolicy(JSON.stringify(policy))).toEqual(policy);
  });
  it.each([
    undefined,
    '',
    '{}',
    'null',
    '{',
    JSON.stringify({ ...policy, checkInTime: '24:00' }),
    JSON.stringify({ ...policy, cancellationRefund: 'AUTO' }),
    JSON.stringify({ ...policy, modificationSettlement: 'AUTO' }),
    JSON.stringify({ ...policy, version: '' }),
  ])('rejects unconfigured or invalid policy %s', (input) => {
    expect(() => managementPolicy(input)).toThrow();
  });
});
