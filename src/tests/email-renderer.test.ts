import { describe, it, expect } from "vitest";
import {
  renderEmailTemplate,
  evaluateConditionals,
  interpolateVariables,
  extractSubjectFromHtml,
  normalizeLocale,
} from "@/lib/email-renderer";

describe("Email Renderer Engine (84 Templates & Multilingual)", () => {
  it("normalizes locale accurately", () => {
    expect(normalizeLocale("es")).toBe("es");
    expect(normalizeLocale("ES")).toBe("es");
    expect(normalizeLocale("es-ES")).toBe("es");
    expect(normalizeLocale("fr")).toBe("fr");
    expect(normalizeLocale("fr-FR")).toBe("fr");
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale(null)).toBe("en");
    expect(normalizeLocale(undefined)).toBe("en");
    expect(normalizeLocale("de")).toBe("en");
  });

  it("evaluates {{#if key}}...{{else}}...{{/if}} conditionals", () => {
    const template = "Hello {{#if is_author}}Author{{else}}Follower{{/if}}!";
    expect(evaluateConditionals(template, { is_author: true })).toBe("Hello Author!");
    expect(evaluateConditionals(template, { is_author: false })).toBe("Hello Follower!");
    expect(evaluateConditionals(template, {})).toBe("Hello Follower!");
  });

  it("evaluates single-branch {{#if key}}...{{/if}} conditionals", () => {
    const template = "{{#if credits}}Credits: {{credits}}{{/if}}";
    expect(evaluateConditionals(template, { credits: 10 })).toBe("Credits: {{credits}}");
    expect(evaluateConditionals(template, { credits: 0 })).toBe("");
    expect(evaluateConditionals(template, { credits: null })).toBe("");
  });

  it("interpolates {{variable}} correctly", () => {
    const content = "Hi {{first_name}}, you have {{credits}} credits.";
    const result = interpolateVariables(content, { first_name: "Elena", credits: 5 });
    expect(result).toBe("Hi Elena, you have 5 credits.");
  });

  it("extracts subject from <title> tag", () => {
    const html = '<!DOCTYPE html><html><head><title>You&#39;re booked &amp; ready</title></head><body></body></html>';
    expect(extractSubjectFromHtml(html)).toBe("You're booked & ready");
  });

  it("renders Booking Confirmation in English, Spanish, and French", () => {
    const vars = {
      first_name: "Camille",
      event_title: "Watercolor & Coffee",
      event_date: "19 Nov 2026",
      event_time: "17:00",
      meeting_point: "Ehia Barcelona",
      credits: 13,
      balance: 0,
      release_deadline: "16 Nov 17:00",
      event_url: "https://themothers.cc/events/123",
    };

    // English
    const enRes = renderEmailTemplate("Email - Booking Confirmation", vars, "en");
    expect(enRes.templateFile).toBe("Email - Booking Confirmation.html");
    expect(enRes.html).toContain("Camille, you’re booked for Watercolor & Coffee");
    expect(enRes.html).toContain("13 credits");

    // Spanish
    const esRes = renderEmailTemplate("Email - Booking Confirmation", vars, "es");
    expect(esRes.templateFile).toBe("Email - Booking Confirmation.es.html");
    expect(esRes.html).toContain("Camille, estás apuntada a Watercolor & Coffee");

    // French
    const frRes = renderEmailTemplate("Email - Booking Confirmation", vars, "fr");
    expect(frRes.templateFile).toBe("Email - Booking Confirmation.fr.html");
    expect(frRes.html).toContain("Camille, vous êtes inscrite à Watercolor & Coffee");
  });

  it("renders Account Deleted with conditional sections according to account state", () => {
    const deletedVars = {
      first_name: "Sophie",
      deleted_date: "14 Nov 2026",
      deleted_time: "10:30",
      released_places: "Breathwork session",
      credits_removed: "5",
      membership_cancelled: true,
    };

    const res = renderEmailTemplate("Email - Account Deleted", deletedVars, "en");
    expect(res.html).toContain("Your places on Breathwork session were released for other mothers.");
    expect(res.html).toContain("Your 5 remaining credits were removed.");
    expect(res.html).toContain("Your membership was cancelled. You won’t be charged again.");

    // When no places or credits were held:
    const emptyVars = {
      first_name: "Sophie",
      deleted_date: "14 Nov 2026",
      deleted_time: "10:30",
      released_places: "",
      credits_removed: "",
      membership_cancelled: false,
    };
    const emptyRes = renderEmailTemplate("Email - Account Deleted", emptyVars, "en");
    expect(emptyRes.html).not.toContain("Your places on");
    expect(emptyRes.html).not.toContain("credits were removed");
    expect(emptyRes.html).not.toContain("Your membership was cancelled");
  });

  it("renders New Reply with is_author conditional in Spanish and French", () => {
    const authorVars = {
      first_name: "Rachel",
      replier_name: "Maria",
      post_title: "Good pediatrician in Gràcia",
      reply_preview: "I highly recommend Dr. Puig!",
      thread_url: "https://themothers.cc/lagazette/good-pediatrician",
      is_author: true,
    };
    const esAuthor = renderEmailTemplate("Email - New Reply", authorVars, "es");
    expect(esAuthor.html).toContain("Nueva respuesta a tu publicación");

    const followerVars = { ...authorVars, is_author: false };
    const frFollower = renderEmailTemplate("Email - New Reply", followerVars, "fr");
    expect(frFollower.html).toContain("Nouvelle réponse sur une publication suivie");
  });
});
