import { describe, it, expect } from 'vitest';
import {
  BREVO_TEMPLATES,
  generateJournalPostEmailHtml,
  generateBookingConfirmedEmailHtml,
} from '@/lib/brevo';
import {
  generateIcsString,
  generateGoogleCalendarUrl,
  generateCalendarDownloadUrl,
} from '@/lib/ics';

describe('Brevo Transactional Emails & Templates', () => {
  it('Verifies all 19 core email templates are defined', () => {
    expect(BREVO_TEMPLATES.WELCOME_CONFIRMATION).toBeDefined();
    expect(BREVO_TEMPLATES.APPLICATION_RECEIVED).toBeDefined();
    expect(BREVO_TEMPLATES.APPLICATION_ACCEPTED).toBeDefined();
    expect(BREVO_TEMPLATES.APPLICATION_DECLINED).toBeDefined();
    expect(BREVO_TEMPLATES.PAYMENT_RECEIPT).toBeDefined();
    expect(BREVO_TEMPLATES.PAYMENT_FAILED).toBeDefined();
    expect(BREVO_TEMPLATES.PASSWORD_RESET).toBeDefined();
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

  it('Generates responsive booking confirmation email with working calendar links and without broken data URIs', () => {
    const html = generateBookingConfirmedEmailHtml({
      firstName: 'Rachel',
      eventTitle: 'Open list',
      eventDateFormatted: 'Tue, Oct 20, 2026',
      eventTimeFormatted: '18:00',
      venueName: 'Open list',
      meetingPoint: 'Open list',
      creditsCharged: 2,
      startsAt: '2026-10-20T18:00:00Z',
      eventId: 'ev_12345',
      appUrl: 'https://themothers.cc',
      isEs: false,
    });

    expect(html).toContain('Rachel');
    expect(html).toContain('Open list');
    expect(html).toContain('Tue, Oct 20, 2026');
    // Ensure no broken data URIs are in href
    expect(html).not.toContain('href="data:text/calendar');
    // Ensure working HTTPS calendar endpoints and Google Calendar render links
    expect(html).toContain('https://themothers.cc/api/events/ev_12345/ics');
    expect(html).toContain('https://calendar.google.com/calendar/render');
    expect(html).toContain('stack-col');
    expect(html).toContain('btn-full');
  });

  it('Generates RFC-compliant ICS strings and valid Google Calendar URLs', () => {
    const ics = generateIcsString({
      title: 'Stroller Walk in Ciutadella',
      description: 'Morning walk through Parc de la Ciutadella.',
      location: 'Ciutadella Park, Barcelona',
      startsAt: '2026-10-20T10:00:00Z',
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:Stroller Walk in Ciutadella');
    expect(ics).toContain('LOCATION:Ciutadella Park\\, Barcelona');
    expect(ics).toContain('END:VCALENDAR');

    const gcalUrl = generateGoogleCalendarUrl({
      title: 'Stroller Walk in Ciutadella',
      description: 'Morning walk through Parc de la Ciutadella.',
      location: 'Ciutadella Park, Barcelona',
      startsAt: '2026-10-20T10:00:00Z',
    });

    expect(gcalUrl).toContain('https://calendar.google.com/calendar/render');
    expect(gcalUrl).toContain('action=TEMPLATE');
    expect(gcalUrl).toContain('Stroller+Walk');

    const downloadUrl = generateCalendarDownloadUrl({
      eventId: 'ev_99',
      title: 'Stroller Walk',
      startsAt: '2026-10-20T10:00:00Z',
      baseUrl: 'https://themothers.cc',
    });

    expect(downloadUrl).toBe('https://themothers.cc/api/events/ev_99/ics');
  });
});

