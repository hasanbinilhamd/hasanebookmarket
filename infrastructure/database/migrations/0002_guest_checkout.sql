-- Additive guest-checkout foundation. 0001 and all legacy rows are preserved.
-- This schema is not by itself a payment, OTP, download or authorization service.
CREATE TABLE checkout_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_hash bytea NOT NULL UNIQUE CHECK (octet_length(capability_hash)=32),
  customer_name text NOT NULL CHECK (length(btrim(customer_name)) BETWEEN 1 AND 160),
  customer_email text NOT NULL CHECK (customer_email=lower(btrim(customer_email)) AND length(customer_email) BETWEEN 3 AND 320),
  customer_whatsapp text NOT NULL CHECK (length(btrim(customer_whatsapp)) BETWEEN 7 AND 32),
  email_verified_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);
CREATE INDEX checkout_drafts_expiry_idx ON checkout_drafts(expires_at);

-- The OTP digest must be keyed with a server-only secret: a plain hash of a
-- six-digit code is brute-forceable after a database leak. One row per draft.
CREATE TABLE checkout_email_otps (
  checkout_id uuid PRIMARY KEY REFERENCES checkout_drafts(id) ON DELETE CASCADE,
  otp_mac bytea NOT NULL CHECK (octet_length(otp_mac)=32),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at timestamptz NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '10 minutes')
);

-- Existing account-linked orders remain valid; guest orders require verified
-- contact information and a draft link. Never remove or rewrite old records.
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE orders ADD COLUMN checkout_id uuid UNIQUE REFERENCES checkout_drafts(id) ON DELETE RESTRICT;
ALTER TABLE orders ADD COLUMN merchant_order_id text UNIQUE;
ALTER TABLE orders ADD COLUMN customer_name text;
ALTER TABLE orders ADD COLUMN customer_email text;
ALTER TABLE orders ADD COLUMN customer_whatsapp text;
ALTER TABLE orders ADD COLUMN customer_email_verified_at timestamptz;
ALTER TABLE orders ADD COLUMN paid_at timestamptz;
ALTER TABLE orders ADD COLUMN email_delivery_status text NOT NULL DEFAULT 'not_queued'
  CHECK (email_delivery_status IN ('not_queued','queued','sent','failed'));
ALTER TABLE orders ADD CONSTRAINT orders_guest_contact_check CHECK (
  user_id IS NOT NULL OR (
    checkout_id IS NOT NULL AND merchant_order_id IS NOT NULL AND
    customer_name IS NOT NULL AND length(btrim(customer_name)) BETWEEN 1 AND 160 AND
    customer_email IS NOT NULL AND customer_email=lower(btrim(customer_email)) AND length(customer_email) BETWEEN 3 AND 320 AND
    customer_whatsapp IS NOT NULL AND length(btrim(customer_whatsapp)) BETWEEN 7 AND 32 AND
    customer_email_verified_at IS NOT NULL
  )
);
ALTER TABLE order_items ADD COLUMN quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0);

-- Event fingerprints are unique; signature, amount, currency and payment status
-- must still be verified server-side before any order is marked paid.
CREATE TABLE payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  event_fingerprint bytea NOT NULL UNIQUE CHECK (octet_length(event_fingerprint)=32),
  provider_transaction_id text,
  provider_status text NOT NULL,
  status_code text NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_events_order_idx ON payment_events(order_id,received_at DESC);

CREATE TABLE download_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  token_hash bytea NOT NULL UNIQUE CHECK (octet_length(token_hash)=32),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '30 days')
);
CREATE INDEX download_tokens_item_idx ON download_tokens(order_item_id);

-- Contains no OTP, download bearer token, or mail contents. Delivery code must
-- make retries idempotent and record failures without changing paid orders.
CREATE TABLE delivery_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('paid_download_email')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','sent','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_expires_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX delivery_jobs_pending_idx ON delivery_jobs(status,available_at);

-- Hashed subject (IP/email/checkout) counters must be updated atomically.
CREATE TABLE checkout_rate_limits (
  subject_hash bytea NOT NULL CHECK (octet_length(subject_hash)=32),
  action text NOT NULL,
  window_started_at timestamptz NOT NULL,
  count integer NOT NULL CHECK (count > 0),
  PRIMARY KEY(subject_hash,action,window_started_at)
);

CREATE TABLE admin_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id text NOT NULL,
  action text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE RESTRICT,
  book_id uuid REFERENCES books(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
