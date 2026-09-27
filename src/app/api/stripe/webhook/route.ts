import { handleStripeWebhook } from "@/lib/stripe-webhook-handler";

export async function POST(req: Request) {
  return handleStripeWebhook(req);
}
