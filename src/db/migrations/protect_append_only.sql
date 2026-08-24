-- Migration: protect_append_only.sql
-- Protects credit_entry and audit_log from UPDATE or DELETE operations (§3, §5)

CREATE OR REPLACE FUNCTION block_modification() RETURNS trigger AS $$
BEGIN 
  RAISE EXCEPTION 'Modifications to % are not allowed (append-only table)', TG_TABLE_NAME; 
END;
$$ LANGUAGE plpgsql;

-- Protect credit_entry
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'protect_credit_entry') THEN
    CREATE TRIGGER protect_credit_entry 
    BEFORE UPDATE OR DELETE ON credit_entry
    FOR EACH ROW EXECUTE FUNCTION block_modification();
  END IF;
END $$;

-- Protect audit_log
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'protect_audit_log') THEN
    CREATE TRIGGER protect_audit_log 
    BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION block_modification();
  END IF;
END $$;
