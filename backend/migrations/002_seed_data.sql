-- Seed data for alias_menu
-- Note: Kitchen codes are approved by admin.
INSERT INTO alias_menu (kata_kunci, nama_produk_baku, kitchen_code) VALUES
  ('dimsum', 'Dimsum Original', 'O'),
  ('ori', 'Dimsum Original', 'O'),
  ('mentai6', 'Dimsum Mentai 6pcs', 'M6'),
  ('mentai', 'Dimsum Mentai 6pcs', 'M6'),
  ('mentai4', 'Dimsum Mentai 4pcs', 'M4'),
  ('bacar kecil', 'Bacar Kecil 120ml', 'bk'),
  ('bk', 'Bacar Kecil 120ml', 'bk'),
  ('bacar besar', 'Bacar Besar 150ml', 'bB'),
  ('bb', 'Bacar Besar 150ml', 'bB'),
  ('bsweet', 'BSweet', 'BS'),
  ('badil', 'BAdil', 'BD');

-- Seed data for bundle_components
INSERT INTO bundle_components (nama_produk_bundle, nama_produk_komponen, qty_komponen) VALUES
  ('BSweet', 'Bacar Besar 150ml',    3),
  ('BAdil',  'Bacar Besar 150ml',    1),
  ('BAdil',  'Dimsum Original (pcs)', 3),
  ('BAdil',  'Dimsum Mentai (pcs)',   3);

-- Seed data for area_keywords
-- Note: ITS keywords approved by admin.
INSERT INTO area_keywords (keyword, area_tag) VALUES
  ('gunung anyar', 'Gunung Anyar'),
  ('rungkut',      'Rungkut'),
  ('tekkim',       'ITS'),
  ('itz',          'ITS'),
  ('its',          'ITS');
