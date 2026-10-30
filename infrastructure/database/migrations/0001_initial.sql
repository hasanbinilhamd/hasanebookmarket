-- Provider-independent domain foundation. Auth-library-owned tables are deferred.
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 320),
  display_name text,
  email_verified_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE user_auth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google','email')),
  provider_subject text NOT NULL CHECK (length(provider_subject) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subject)
);
CREATE INDEX user_auth_accounts_user_idx ON user_auth_accounts(user_id);
CREATE TABLE books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  author text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_minor bigint NOT NULL CHECK (price_minor >= 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  publication_status text NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft','published','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE book_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('original','page')),
  object_key text NOT NULL UNIQUE,
  page_number integer CHECK (page_number > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'page' AND page_number IS NOT NULL) OR (kind = 'original' AND page_number IS NULL))
);
CREATE UNIQUE INDEX book_assets_original_unique ON book_assets(book_id) WHERE kind='original';
CREATE UNIQUE INDEX book_assets_page_unique ON book_assets(book_id,page_number) WHERE kind='page';
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','cancelled','refunded')),
  total_minor bigint NOT NULL CHECK (total_minor >= 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_created_idx ON orders(user_id,created_at DESC);
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  unit_price_minor bigint NOT NULL CHECK (unit_price_minor >= 0),
  UNIQUE (order_id, book_id)
);
CREATE INDEX order_items_book_idx ON order_items(book_id);
CREATE TABLE entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  order_item_id uuid REFERENCES order_items(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CHECK ((status='active' AND revoked_at IS NULL) OR (status='revoked' AND revoked_at IS NOT NULL)),
  UNIQUE(user_id,book_id)
);
CREATE INDEX entitlements_order_item_idx ON entitlements(order_item_id);
