import { ConflictException, ServiceUnavailableException } from '@nestjs/common';

export interface ManagementPolicy {
  version: string;
  checkInTime: string;
  modificationSettlement: 'SAME_TOTAL_ONLY' | 'MANUAL_REVIEW';
  cancellationRefund: 'FULL_MANUAL_REVIEW';
}

/** Provisional local/demo setting; production requires explicit hotel configuration. */
export const PROJECT_MANAGEMENT_POLICY: ManagementPolicy = {
  version: 'project-default-v1',
  checkInTime: '14:00',
  modificationSettlement: 'MANUAL_REVIEW',
  cancellationRefund: 'FULL_MANUAL_REVIEW',
};

/** Management must explicitly supply policy; there is no inferred check-in hour. */
export function managementPolicy(value: string | undefined): ManagementPolicy {
  try {
    const policy = JSON.parse(value || '') as ManagementPolicy;
    if (
      !policy ||
      typeof policy.version !== 'string' ||
      !policy.version.trim() ||
      typeof policy.checkInTime !== 'string' ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(policy.checkInTime) ||
      !['SAME_TOTAL_ONLY', 'MANUAL_REVIEW'].includes(
        policy.modificationSettlement,
      ) ||
      policy.cancellationRefund !== 'FULL_MANUAL_REVIEW'
    )
      throw new Error('Invalid policy');
    return policy;
  } catch {
    throw new ServiceUnavailableException({
      error: 'MANAGEMENT_POLICY_UNAVAILABLE',
      message:
        'Booking changes are unavailable until the hotel configures its policy. Contact the hotel.',
    });
  }
}

export function managementCutoff(date: string, policy: ManagementPolicy): Date {
  // Sri Lanka has a fixed UTC+05:30 offset. DATE columns are hotel dates.
  return new Date(
    Date.parse(`${date}T${policy.checkInTime}:00+05:30`) - 24 * 60 * 60 * 1000,
  );
}

export function requireBeforeCutoff(
  date: string,
  now: Date,
  policy: ManagementPolicy,
) {
  const cutoff = managementCutoff(date, policy);
  if (!Number.isFinite(cutoff.getTime()) || now >= cutoff)
    throw new ConflictException({
      error: 'CHANGE_CUTOFF_PASSED',
      message: 'Changes must be made more than 24 hours before hotel check-in.',
    });
}
