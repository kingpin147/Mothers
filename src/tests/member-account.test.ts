import { describe, it, expect } from 'vitest';

describe('Member Account & Credits Ledger', () => {
  it('Applies FIFO credit consumption correctly', () => {
    // Ledger entries with issuance dates and remaining amounts
    const creditBatches = [
      { id: 'batch_1', issuedAt: new Date('2026-03-01'), amount: 10, expiresAt: new Date('2026-09-01') },
      { id: 'batch_2', issuedAt: new Date('2026-04-01'), amount: 20, expiresAt: new Date('2026-10-01') },
    ];

    // Sort oldest first (FIFO)
    creditBatches.sort((a, b) => a.issuedAt.getTime() - b.issuedAt.getTime());

    let creditsNeeded = 15;
    const consumed: Array<{ id: string; deducted: number }> = [];

    for (const batch of creditBatches) {
      if (creditsNeeded <= 0) break;
      const take = Math.min(batch.amount, creditsNeeded);
      consumed.push({ id: batch.id, deducted: take });
      batch.amount -= take;
      creditsNeeded -= take;
    }

    expect(consumed).toEqual([
      { id: 'batch_1', deducted: 10 },
      { id: 'batch_2', deducted: 5 },
    ]);
    expect(creditBatches[0].amount).toBe(0);
    expect(creditBatches[1].amount).toBe(15);
  });

  it('Validates 2-month annual pause allowance', () => {
    const pauseAllowance = (monthsUsed: number, requestedMonths: number) => {
      const maxAnnual = 2;
      if (monthsUsed + requestedMonths > maxAnnual) {
        return { allowed: false, error: 'EXCEEDS_ANNUAL_PAUSE_LIMIT' };
      }
      return { allowed: true, remaining: maxAnnual - (monthsUsed + requestedMonths) };
    };

    expect(pauseAllowance(0, 1)).toEqual({ allowed: true, remaining: 1 });
    expect(pauseAllowance(1, 1)).toEqual({ allowed: true, remaining: 0 });
    expect(pauseAllowance(1, 2)).toEqual({ allowed: false, error: 'EXCEEDS_ANNUAL_PAUSE_LIMIT' });
  });

  it('Calculates Godmother referral bonuses', () => {
    const joinBonusCredits = 5;
    const threeMonthRetentionBonusCredits = 10;

    const calculateTotalReferralReward = (hasMatured3Months: boolean) => {
      return joinBonusCredits + (hasMatured3Months ? threeMonthRetentionBonusCredits : 0);
    };

    expect(calculateTotalReferralReward(false)).toBe(5);
    expect(calculateTotalReferralReward(true)).toBe(15);
  });
});
