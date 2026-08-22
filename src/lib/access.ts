/**
 * Pure Access Rules Engine for The Mothers (§10)
 * All authorization decisions are pure, testable functions returning { allowed: boolean, reasonCode?: string }
 */

export interface AccessResult {
  allowed: boolean;
  reasonCode?: string;
  message?: string;
}

export function hasMemberAccess(
  member: {
    status: string;
    currentPeriodEnd?: Date | null;
  } | null | undefined,
  at: Date = new Date()
): AccessResult {
  if (!member) {
    return { allowed: false, reasonCode: "NOT_A_MEMBER", message: "Membership required." };
  }

  if (member.status === "active") {
    return { allowed: true };
  }

  if (member.status === "cancelled_at_period_end" || member.status === "paused" || member.status === "past_due") {
    if (member.currentPeriodEnd && at <= new Date(member.currentPeriodEnd)) {
      return { allowed: true };
    }
    return { allowed: false, reasonCode: "PERIOD_ENDED", message: "Membership period has expired." };
  }

  if (member.status === "banned") {
    return { allowed: false, reasonCode: "MEMBER_BANNED", message: "Account is suspended." };
  }

  return { allowed: false, reasonCode: "INACTIVE_STATUS", message: `Status is ${member.status}.` };
}

export function canSeeEvent(
  viewer: { isMember: boolean; personId?: string } | null,
  event: {
    status: string;
    isSignature: boolean;
    creditCost: number;
    guestOpenAt?: Date | null;
    guestCloseAt?: Date | null;
  },
  at: Date = new Date()
): AccessResult {
  // Members can see all draft/published/confirmed events if active
  if (viewer?.isMember) {
    if (event.status === "draft") {
      return { allowed: false, reasonCode: "EVENT_DRAFT" };
    }
    return { allowed: true };
  }

  // Guests:
  if (event.status !== "confirmed") {
    return { allowed: false, reasonCode: "GUEST_SEES_CONFIRMED_ONLY" };
  }

  if (event.isSignature) {
    return { allowed: false, reasonCode: "SIGNATURE_MEMBERS_ONLY" };
  }

  if (event.creditCost > 18) {
    return { allowed: false, reasonCode: "MAX_GUEST_CREDIT_EXCEEDED" }; // Events >18 credits are members only
  }

  if (event.guestOpenAt && at < new Date(event.guestOpenAt)) {
    return { allowed: false, reasonCode: "GUEST_WINDOW_NOT_OPEN" };
  }

  if (event.guestCloseAt && at > new Date(event.guestCloseAt)) {
    return { allowed: false, reasonCode: "GUEST_WINDOW_CLOSED" };
  }

  return { allowed: true };
}

export function canBook(
  viewer: {
    isMember: boolean;
    member?: { status: string; currentPeriodEnd?: Date | null };
    creditBalance: number;
    hasExistingActiveBooking: boolean;
  },
  event: {
    status: string;
    creditCost: number;
    capacityMember: number;
    activeMemberBookingsCount: number;
    startsAt: Date;
  },
  at: Date = new Date()
): AccessResult {
  const memberAccess = hasMemberAccess(viewer.member, at);
  if (!memberAccess.allowed) return memberAccess;

  if (event.status !== "confirmed" && event.status !== "published_pending") {
    return { allowed: false, reasonCode: "EVENT_NOT_BOOKABLE" };
  }

  if (at >= new Date(event.startsAt)) {
    return { allowed: false, reasonCode: "EVENT_ALREADY_STARTED" };
  }

  if (viewer.hasExistingActiveBooking) {
    return { allowed: false, reasonCode: "ALREADY_BOOKED" };
  }

  if (event.activeMemberBookingsCount >= event.capacityMember) {
    return { allowed: false, reasonCode: "MEMBER_CAPACITY_FULL" };
  }

  if (viewer.creditBalance < event.creditCost) {
    return { allowed: false, reasonCode: "INSUFFICIENT_CREDITS" };
  }

  return { allowed: true };
}

export function canBuyPass(
  person: {
    isMother: boolean;
    lifetimePassCount: number;
  },
  event: {
    status: string;
    isSignature: boolean;
    creditCost: number;
    capacityGuest: number;
    activeGuestBookingsCount: number;
    guestOpenAt?: Date | null;
    guestCloseAt?: Date | null;
  },
  at: Date = new Date()
): AccessResult {
  if (!person.isMother) {
    return { allowed: false, reasonCode: "MOTHER_STATUS_REQUIRED" };
  }

  if (person.lifetimePassCount >= 2) {
    return { allowed: false, reasonCode: "LIFETIME_PASS_LIMIT_REACHED" };
  }

  const seeCheck = canSeeEvent({ isMember: false }, event, at);
  if (!seeCheck.allowed) return seeCheck;

  if (event.activeGuestBookingsCount >= event.capacityGuest) {
    return { allowed: false, reasonCode: "GUEST_CAPACITY_FULL" };
  }

  return { allowed: true };
}

export function canRelease(
  viewer: { isMember: boolean; personId: string },
  booking: {
    personId: string;
    kind: string;
    status: string;
    eventStartsAt: Date;
  },
  at: Date = new Date()
): AccessResult {
  if (viewer.personId !== booking.personId) {
    return { allowed: false, reasonCode: "UNAUTHORIZED_BOOKING_OWNER" };
  }

  if (booking.status !== "held" && booking.status !== "confirmed") {
    return { allowed: false, reasonCode: "BOOKING_NOT_ACTIVE" };
  }

  if (at >= new Date(booking.eventStartsAt)) {
    return { allowed: false, reasonCode: "EVENT_ALREADY_PAST" };
  }

  return { allowed: true };
}

export function canRsvp(
  person: { isMother: boolean },
  event: { isFreeWalk: boolean; status: string }
): AccessResult {
  if (!person.isMother) {
    return { allowed: false, reasonCode: "MOTHER_STATUS_REQUIRED" };
  }
  if (!event.isFreeWalk) {
    return { allowed: false, reasonCode: "NOT_A_FREE_EVENT" };
  }
  if (event.status !== "confirmed" && event.status !== "published_pending") {
    return { allowed: false, reasonCode: "EVENT_NOT_OPEN" };
  }
  return { allowed: true };
}

export function canApply(
  person: { isMother: boolean },
  window: { status: string; opensAt: Date; closesAt: Date },
  at: Date = new Date()
): AccessResult {
  if (!person.isMother) {
    return { allowed: false, reasonCode: "MOTHER_STATUS_REQUIRED" };
  }
  if (window.status !== "open") {
    return { allowed: false, reasonCode: "WINDOW_CLOSED" };
  }
  if (at < new Date(window.opensAt) || at > new Date(window.closesAt)) {
    return { allowed: false, reasonCode: "WINDOW_TIME_OUT_OF_RANGE" };
  }
  return { allowed: true };
}

export function canJoinWaitlist(
  person: { isMother: boolean; hasActiveWaitlistEntry: boolean }
): AccessResult {
  if (!person.isMother) {
    return { allowed: false, reasonCode: "MOTHER_STATUS_REQUIRED" };
  }
  if (person.hasActiveWaitlistEntry) {
    return { allowed: false, reasonCode: "ALREADY_ON_WAITLIST" };
  }
  return { allowed: true };
}

export function canUseTicketToken(
  tokenRecord: { expiresAt: Date; releasedAt?: Date | null },
  at: Date = new Date()
): AccessResult {
  if (tokenRecord.releasedAt) {
    return { allowed: false, reasonCode: "TICKET_ALREADY_RELEASED" };
  }
  if (at > new Date(tokenRecord.expiresAt)) {
    return { allowed: false, reasonCode: "TOKEN_EXPIRED" };
  }
  return { allowed: true };
}

export function adminCan(
  admin: { role: "owner" | "manager" | "host"; disabledAt?: Date | null },
  action: string,
  _entity: string
): AccessResult {
  if (admin.disabledAt) {
    return { allowed: false, reasonCode: "ADMIN_ACCOUNT_DISABLED" };
  }

  if (admin.role === "owner") {
    return { allowed: true };
  }

  if (admin.role === "manager") {
    // Managers can do everything except dangerous admin user deletions / owner overrides
    if (action === "delete_admin_user" || action === "modify_owner") {
      return { allowed: false, reasonCode: "OWNER_PERMISSION_REQUIRED" };
    }
    return { allowed: true };
  }

  if (admin.role === "host") {
    // Hosts can mark attendance, view event details
    const hostAllowedActions = ["mark_attendance", "view_event", "view_attendee_list"];
    if (hostAllowedActions.includes(action)) {
      return { allowed: true };
    }
    return { allowed: false, reasonCode: "HOST_PERMISSION_RESTRICTED" };
  }

  return { allowed: false, reasonCode: "UNKNOWN_ROLE" };
}
