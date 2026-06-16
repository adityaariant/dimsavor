CREATE TYPE session_status   AS ENUM ('Active', 'Closed');
CREATE TYPE payment_status   AS ENUM ('UNPAID', 'PAID', 'CANCELLED');
CREATE TYPE delivery_status  AS ENUM ('PENDING', 'SENT', 'CANCELLED');
CREATE TYPE payment_method   AS ENUM (
  'QRIS', 'BCA', 'BNI', 'Cash Adit', 'Cash Kila', 'Shopeepay', 'Dana'
);
CREATE TYPE expense_payer    AS ENUM ('Adit', 'Kila');

CREATE TABLE po_sessions (
  id_po          SERIAL PRIMARY KEY,
  tanggal_buka   DATE          NOT NULL,
  tanggal_tutup  DATE          NOT NULL,
  kuota_maksimal INTEGER       NOT NULL,  -- unit: 6pcs dimsum boxes
  status         session_status NOT NULL DEFAULT 'Active',
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_one_active_session
  ON po_sessions (status)
  WHERE status = 'Active';

CREATE TABLE delivery_slots (
  id_slot        SERIAL PRIMARY KEY,
  id_po          INTEGER       NOT NULL REFERENCES po_sessions(id_po) ON DELETE CASCADE,
  jadwal_teks    VARCHAR(100)  NOT NULL,  -- e.g. "Rabu 17 Juni 10.00-13.00"
  is_free_ongkir BOOLEAN       NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_slots_po ON delivery_slots(id_po);

CREATE TABLE orders (
  id_order              SERIAL PRIMARY KEY,
  id_po                 INTEGER        NOT NULL REFERENCES po_sessions(id_po),
  nama_pelanggan        VARCHAR(100)   NOT NULL,
  alamat                TEXT           NOT NULL,
  area_tag              VARCHAR(50),   -- 'Gunung Anyar', 'Rungkut', 'ITS', 'Lainnya'
  jadwal_kirim_request  TEXT,          -- raw text from customer
  id_slot               INTEGER        REFERENCES delivery_slots(id_slot),  -- NULL if unmatched
  metode_bayar          payment_method,
  ongkir                INTEGER        NOT NULL DEFAULT 0,   -- 0 or 2000 (Rupiah)
  ongkir_rule           VARCHAR(10),   -- 'Area', 'Slot', or 'Flat' — for UI badge
  status_bayar          payment_status  NOT NULL DEFAULT 'UNPAID',
  status_kirim          delivery_status NOT NULL DEFAULT 'PENDING',
  created_at            TIMESTAMPTZ    DEFAULT NOW()
);

CREATE INDEX idx_orders_po       ON orders(id_po);
CREATE INDEX idx_orders_status   ON orders(status_bayar);

CREATE TABLE order_items (
  id_item       SERIAL PRIMARY KEY,
  id_order      INTEGER       NOT NULL REFERENCES orders(id_order) ON DELETE CASCADE,
  nama_produk   VARCHAR(100)  NOT NULL,  -- canonical name from alias_menu.nama_produk_baku
  qty           INTEGER       NOT NULL DEFAULT 1,
  is_bundle     BOOLEAN       NOT NULL DEFAULT FALSE,  -- TRUE for BSweet, BAdil
  topping       VARCHAR(20),  -- 'Regal', 'Oreo', or NULL
  subtotal      INTEGER       NOT NULL   -- in Rupiah (qty × unit_price + topping cost)
);

CREATE INDEX idx_items_order ON order_items(id_order);

CREATE TABLE expenses (
  id_expense    SERIAL PRIMARY KEY,
  id_po         INTEGER        NOT NULL REFERENCES po_sessions(id_po),
  nama_bahan    VARCHAR(100)   NOT NULL,
  nominal       INTEGER        NOT NULL,   -- in Rupiah
  dibayar_oleh  expense_payer  NOT NULL,
  created_at    TIMESTAMPTZ    DEFAULT NOW()
);

CREATE INDEX idx_expenses_po ON expenses(id_po);

CREATE TABLE alias_menu (
  id_alias        SERIAL PRIMARY KEY,
  kata_kunci      VARCHAR(100) NOT NULL UNIQUE,  -- the slang/abbreviation
  nama_produk_baku VARCHAR(100) NOT NULL,         -- canonical product name
  kitchen_code    VARCHAR(10)  NOT NULL
);

CREATE TABLE bundle_components (
  id_component         SERIAL PRIMARY KEY,
  nama_produk_bundle   VARCHAR(100) NOT NULL,  -- matches alias_menu.nama_produk_baku
  nama_produk_komponen VARCHAR(100) NOT NULL,
  qty_komponen         INTEGER      NOT NULL
);

CREATE TABLE area_keywords (
  id_keyword  SERIAL PRIMARY KEY,
  keyword     VARCHAR(50) NOT NULL UNIQUE,  -- lowercase, used for substring match
  area_tag    VARCHAR(50) NOT NULL          -- 'Gunung Anyar', 'Rungkut', 'ITS'
);
