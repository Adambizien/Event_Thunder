import { describe, expect, it, vi } from 'vitest';
import type { SubscriptionType } from '../types/SubscriptionTypes';
import {
  formatCountdown,
  getOrganizerAccessState,
} from './subscriptionAccess';

const createSubscription = (
  overrides: Partial<SubscriptionType>,
): SubscriptionType =>
  ({
    id: 'sub-1',
    userId: 'user-1',
    planId: 'plan-1',
    stripeSubscriptionId: 'stripe-sub-1',
    status: 'active',
    currentPeriodEnd: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    payments: [],
    ...overrides,
  }) as SubscriptionType;

describe('subscriptionAccess', () => {
  it('donne acces directement avec un abonnement actif', () => {
    expect(
      getOrganizerAccessState([
        createSubscription({ status: 'active', currentPeriodEnd: null }),
      ]),
    ).toEqual({
      hasAccess: true,
      isGracePeriod: false,
      gracePeriodEnd: null,
    });
  });

  it('donne acces en grace period et conserve la date future la plus lointaine', () => {
    vi.setSystemTime(new Date('2026-05-01T10:00:00.000Z'));

    expect(
      getOrganizerAccessState([
        createSubscription({
          status: 'canceled',
          currentPeriodEnd: '2026-05-02T10:00:00.000Z',
        }),
        createSubscription({
          id: 'sub-2',
          status: 'canceled',
          currentPeriodEnd: '2026-05-05T10:00:00.000Z',
        }),
      ]),
    ).toEqual({
      hasAccess: true,
      isGracePeriod: true,
      gracePeriodEnd: '2026-05-05T10:00:00.000Z',
    });

    vi.useRealTimers();
  });

  it('refuse l acces sans abonnement actif ni grace period future', () => {
    vi.setSystemTime(new Date('2026-05-01T10:00:00.000Z'));

    expect(
      getOrganizerAccessState([
        createSubscription({
          status: 'canceled',
          currentPeriodEnd: '2026-04-30T10:00:00.000Z',
        }),
      ]),
    ).toEqual({
      hasAccess: false,
      isGracePeriod: false,
      gracePeriodEnd: null,
    });

    vi.useRealTimers();
  });

  it('formate un compte a rebours stable', () => {
    expect(
      formatCountdown(
        '2026-05-03T12:30:15.000Z',
        new Date('2026-05-01T10:00:00.000Z').getTime(),
      ),
    ).toBe('02j 02h 30m 15s');
    expect(formatCountdown('date-invalide')).toBe('00j 00h 00m 00s');
  });
});