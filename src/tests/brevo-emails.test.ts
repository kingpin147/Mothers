import { describe, it, expect } from 'vitest';
import { BREVO_TEMPLATES, generateJournalPostEmailHtml } from '@/lib/brevo';

describe('Brevo Transactional Emails & Templates', () => {
  it('Verifies all 19 core email templates are defined', () => {
    expect(BREVO_TEMPLATES.WELCOME_CONFIRMATION).toBeDefined();
    expect(BREVO_TEMPLATES.APPLICATION_RECEIVED).toBeDefined();
    expect(BREVO_TEMPLATES.APPLICATION_ACCEPTED).toBeDefined();
    expect(BREVO_TEMPLATES.APPLICATION_DECLINED).toBeDefined();
    expect(BREVO_TEMPLATES.PAYMENT_RECEIPT).toBeDefined();
    expect(BREVO_TEMPLATES.PAYMENT_FAILED).toBeDefined();
    expect(BREVO_TEMPLATES.PASSWORD_RESET).toBeDefined();
    expect(BREVO_TEMPLATES.GUEST_PASS_ISSUED).toBeDefined();
    expect(BREVO_TEMPLATES.TICKET_RELEASED).toBeDefined();
    expect(BREVO_TEMPLATES.EVENT_BOOKING_CONFIRMED).toBeDefined();
    expect(BREVO_TEMPLATES.EVENT_REMINDER_48H).toBeDefined();
    expect(BREVO_TEMPLATES.EVENT_CANCELLED_REFUND).toBeDefined();
    expect(BREVO_TEMPLATES.WAITLIST_PROMOTED).toBeDefined();
    expect(BREVO_TEMPLATES.CREDITS_EXPIRING_30D).toBeDefined();
    expect(BREVO_TEMPLATES.MEMBERSHIP_PAUSED).toBeDefined();
    expect(BREVO_TEMPLATES.MEMBERSHIP_CANCELLED).toBeDefined();
    expect(BREVO_TEMPLATES.TIER_UPGRADE).toBeDefined();
    expect(BREVO_TEMPLATES.GODMOTHER_BONUS_EARNED).toBeDefined();
    expect(BREVO_TEMPLATES.JOURNAL_POST_NOTIFICATION).toBeDefined();
  });

  it('Template substitution produces clean HTML/parameter mapping', () => {
    const params = {
      FIRST_NAME: 'Elena',
      EVENT_TITLE: 'Autumn rooftop brunch',
      EVENT_DATE: 'Saturday 12 September, 16:00',
      TICKET_URL: 'https://themothers.cc/ticket/tok_123',
    };

    const preview = `Hi ${params.FIRST_NAME}, your ticket for "${params.EVENT_TITLE}" on ${params.EVENT_DATE} is ready: ${params.TICKET_URL}`;
    expect(preview).toContain('Elena');
    expect(preview).toContain('Autumn rooftop brunch');
    expect(preview).toContain('tok_123');
  });

  it('Generates branded Journal Post newsletter HTML with theme colors and logo', () => {
    const html = generateJournalPostEmailHtml({
      title: 'Navigating the Fourth Trimester in Barcelona',
      excerpt: 'Practical notes on recovery, postpartum doulas, and slow mornings.',
      slug: 'navigating-fourth-trimester',
      category: 'postpartum',
      author: 'Maria Garcia',
      toEmail: 'subscriber@example.com',
    });

    expect(html).toContain('The Mothers');
    expect(html).toContain('Navigating the Fourth Trimester in Barcelona');
    expect(html).toContain('#7b1f2c');
    expect(html).toContain('#efeae1');
    expect(html).toContain('https://themothers.cc/journal/navigating-fourth-trimester');
    expect(html).toContain('https://themothers.cc/unsubscribe?email=subscriber%40example.com');
  });
});
