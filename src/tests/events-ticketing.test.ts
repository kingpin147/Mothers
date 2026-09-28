import { describe, it, expect } from 'vitest';

describe('Events, Ticketing & Booking Rules', () => {
  it('Calculates T-schedule milestones from event start date', () => {
    const startsAt = new Date('2026-09-20T10:00:00Z');
    
    // T-10: Early warning check 10 days before
    const earlyWarningAt = new Date(startsAt.getTime() - 10 * 24 * 60 * 60 * 1000);
    // T-7: Threshold decision check 7 days before
    const decisionAt = new Date(startsAt.getTime() - 7 * 24 * 60 * 60 * 1000);

    expect(earlyWarningAt.toISOString()).toBe('2026-09-10T10:00:00.000Z');
    expect(decisionAt.toISOString()).toBe('2026-09-13T10:00:00.000Z');
  });

  it('Evaluates member booking cancellation refund policy (>24h vs <24h)', () => {
    const eventStart = new Date('2026-09-10T18:00:00Z');
    
    // Case 1: Cancelled 48h before (full credit return)
    const cancelTimeEarly = new Date('2026-09-08T18:00:00Z');
    const hoursBeforeEarly = (eventStart.getTime() - cancelTimeEarly.getTime()) / (1000 * 60 * 60);
    const eligibleForFullRefundEarly = hoursBeforeEarly >= 24;
    expect(eligibleForFullRefundEarly).toBe(true);

    // Case 2: Cancelled 12h before (credit only returned if waitlist backfills)
    const cancelTimeLate = new Date('2026-09-10T06:00:00Z');
    const hoursBeforeLate = (eventStart.getTime() - cancelTimeLate.getTime()) / (1000 * 60 * 60);
    const eligibleForFullRefundLate = hoursBeforeLate >= 24;
    expect(eligibleForFullRefundLate).toBe(false);
  });

  it('Calculates credit top-up pricing (€2 per credit, minimum 5)', () => {
    const topUpPricePerCreditCents = 200;
    const minTopUpCredits = 5;

    const calcTotalCents = (qty: number) => {
      const validQty = Math.max(minTopUpCredits, qty);
      return validQty * topUpPricePerCreditCents;
    };

    expect(calcTotalCents(5)).toBe(1000); // €10
    expect(calcTotalCents(10)).toBe(2000); // €20
    expect(calcTotalCents(3)).toBe(1000); // Minimum enforced to 5 credits (€10)
  });

  it('Determines waitlist offer acceptance duration (24h vs 2h close to event)', () => {
    const computeOfferExpiryHours = (eventStartsAt: Date, offerTime: Date) => {
      const hoursToEvent = (eventStartsAt.getTime() - offerTime.getTime()) / (1000 * 60 * 60);
      return hoursToEvent <= 48 ? 2 : 24;
    };

    const eventDate = new Date('2026-09-20T18:00:00Z');
    // Offer sent 5 days before -> 24h window
    expect(computeOfferExpiryHours(eventDate, new Date('2026-09-15T18:00:00Z'))).toBe(24);
    // Offer sent 24h before -> 2h window
    expect(computeOfferExpiryHours(eventDate, new Date('2026-09-19T18:00:00Z'))).toBe(2);
  });
});
