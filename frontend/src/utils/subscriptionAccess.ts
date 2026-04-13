import type { SubscriptionType } from '../types/SubscriptionTypes';

export type OrganizerAccessState = {
  hasAccess: boolean;
  isGracePeriod: boolean;
  gracePeriodEnd: string | null;
};

const toTimestamp = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return time;
};

export const getOrganizerAccessState = (
  subscriptions: SubscriptionType[],
): OrganizerAccessState => {
  const now = Date.now();
  const hasActive = subscriptions.some((subscription) => subscription.status === 'active');

  if (hasActive) {
    return {
      hasAccess: true,
      isGracePeriod: false,
      gracePeriodEnd: null,
    };
  }

  const gracePeriodEndTimes = subscriptions
    .filter((subscription) => subscription.status === 'canceled')
    .map((subscription) => toTimestamp(subscription.currentPeriodEnd))
    .filter((time): time is number => typeof time === 'number' && time > now);

  if (gracePeriodEndTimes.length > 0) {
    const lastGracePeriodEnd = Math.max(...gracePeriodEndTimes);
    return {
      hasAccess: true,
      isGracePeriod: true,
      gracePeriodEnd: new Date(lastGracePeriodEnd).toISOString(),
    };
  }

  return {
    hasAccess: false,
    isGracePeriod: false,
    gracePeriodEnd: null,
  };
};

export const formatCountdown = (targetIso: string, now = Date.now()): string => {
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) return '00j 00h 00m 00s';

  const diffMs = Math.max(0, target - now);
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(days)}j ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
};