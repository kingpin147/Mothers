CREATE INDEX IF NOT EXISTS "idx_member_stripe_customer_sub" ON "member" USING btree ("stripe_customer_id", "stripe_subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_member_status" ON "member" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payment_person_occurred" ON "payment" USING btree ("person_id", "occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_log_entity" ON "audit_log" USING btree ("entity", "entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_log_at" ON "audit_log" USING btree ("at");
