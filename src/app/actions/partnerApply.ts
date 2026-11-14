"use server";

import { db } from "@/db";
import { community, person } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { auth } from "@/lib/auth";

export interface PartnerApplyInput {
  type: "community" | "workshop";
  name: string;
  city: string;
  description?: string;
  memberCount?: number;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  // Optional legal/tax fields (§14 / CM-02)
  legalName?: string;
  taxId?: string;
  hasInsurance?: boolean;
}

export interface PartnerApplyResult {
  success: boolean;
  error?: string;
  communityId?: string;
}

/**
 * Validates Spanish NIF / CIF / NIE (or European Tax ID format).
 * Returns true if empty (since fields are optional) or valid format.
 * Returns false if a value was entered but is malformed.
 */
export function validateSpanishTaxId(rawTaxId?: string): boolean {
  if (!rawTaxId || !rawTaxId.trim()) {
    return true; // Optional: empty is accepted (§14 / CM-02)
  }

  const taxId = rawTaxId.trim().toUpperCase().replace(/[-\s]/g, "");

  // Basic regex check: must be 8-10 alphanumeric characters
  const nifRegex = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/;
  const nieRegex = /^[XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/;
  const cifRegex = /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/;

  if (nifRegex.test(taxId)) {
    const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
    const num = parseInt(taxId.slice(0, 8), 10);
    return taxId[8] === letters[num % 23];
  }

  if (nieRegex.test(taxId)) {
    const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
    let prefix = taxId[0];
    let numStr = (prefix === "X" ? "0" : prefix === "Y" ? "1" : "2") + taxId.slice(1, 8);
    const num = parseInt(numStr, 10);
    return taxId[8] === letters[num % 23];
  }

  if (cifRegex.test(taxId)) {
    return true; // Standard CIF structure
  }

  // European VAT format fallback (2 letter country code + 6-12 chars)
  const euVatRegex = /^[A-Z]{2}[0-9A-Z]{6,12}$/;
  if (euVatRegex.test(taxId)) {
    return true;
  }

  return false;
}

export async function submitPartnerApplicationAction(
  input: PartnerApplyInput
): Promise<PartnerApplyResult> {
  try {
    const name = input.name?.trim();
    const contactEmail = input.contactEmail?.trim().toLowerCase();

    if (!name || name.length < 2) {
      return { success: false, error: "NAME_REQUIRED" };
    }

    if (!contactEmail || !contactEmail.includes("@")) {
      return { success: false, error: "EMAIL_REQUIRED" };
    }

    // Validate Tax ID if entered
    if (input.taxId && input.taxId.trim()) {
      const isValid = validateSpanishTaxId(input.taxId);
      if (!isValid) {
        return { success: false, error: "INVALID_TAX_ID" };
      }
    }

    // Generate slug and invite code
    const baseSlug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const inviteCodeCandidate = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8) || "MOTHERS";

    // Ensure uniqueness
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const slug = `${baseSlug || "community"}-${randomSuffix}`;
    const inviteCode = `${inviteCodeCandidate}-${randomSuffix.slice(0, 3)}`;

    // Optional user session binding
    const session = await auth();
    let contactPersonId: string | null = null;
    if (session?.user) {
      contactPersonId = (session.user as any).personId || session.user.id || null;
    } else {
      // Check if email already belongs to a registered person
      const [existingPerson] = await db
        .select({ id: person.id })
        .from(person)
        .where(eq(person.email, contactEmail))
        .limit(1);
      if (existingPerson) {
        contactPersonId = existingPerson.id;
      }
    }

    const defaultCommission = input.type === "workshop" ? 20 : 15;

    const [inserted] = await db
      .insert(community)
      .values({
        name,
        slug,
        type: input.type,
        description: input.description?.trim() || null,
        contactPersonId,
        contactEmail,
        contactPhone: input.contactPhone?.trim() || null,
        legalName: input.legalName?.trim() || null,
        taxId: input.taxId?.trim()?.toUpperCase() || null,
        hasInsurance: Boolean(input.hasInsurance),
        commissionRatePercent: defaultCommission,
        inviteCode,
        approved: false,
        publishesWithoutReview: false,
        freeEventsThisMonth: 0,
      })
      .returning({ id: community.id });

    return { success: true, communityId: inserted.id };
  } catch (err: any) {
    console.error("submitPartnerApplicationAction error:", err);
    return { success: false, error: err?.message || "INTERNAL_ERROR" };
  }
}
