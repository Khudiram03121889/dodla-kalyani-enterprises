-- ==============================================================================
-- DODLA MOBILE APP - INITIAL SEED DATA
-- ==============================================================================

-- 1. Default Users
INSERT INTO dodla_profiles (id, phone, password_hash, full_name, role, company)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', '9900426623', 'kalyani1975', 'Kalyani Enterprises Owner', 'owner', 'ALL'),
  ('a0000000-0000-0000-0000-000000000002', '9538344788', 'exec123', 'Shekshavali', 'executive', 'Dodla'),
  ('a0000000-0000-0000-0000-000000000003', '9535959564', 'exec123', 'Yerriswamy', 'executive', 'Gopal Chips')
ON CONFLICT (phone) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, full_name = EXCLUDED.full_name, company = EXCLUDED.company;

-- 2. Default Routes
INSERT INTO dodla_routes (id, name)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'COWL BAZAR'),
  ('b0000000-0000-0000-0000-000000000002', 'CANTONMENT'),
  ('b0000000-0000-0000-0000-000000000003', 'GANDHI NAGAR')
ON CONFLICT (name) DO NOTHING;

-- 3. Default Shops (from Cowl Bazar reference)
INSERT INTO dodla_shops (route_id, name, phone, address, incharge, gstin, fssai)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'SRI RAJESWARY HOT CHIPS', '9945947413', 'COWL BAZAR, FIRST GATE - 583101', 'GADHILINGA', NULL, NULL),
  ('b0000000-0000-0000-0000-000000000001', 'JALAN GENERAL STORES', '7899421356', 'FIRST GATE NEAR COWL BAZAR - 583101', 'JALAN', NULL, NULL),
  ('b0000000-0000-0000-0000-000000000001', 'CHANDRA PAN SHOP', '9164487440', 'FIRST GATE - 583101', 'CHANDRA', NULL, NULL),
  ('b0000000-0000-0000-0000-000000000001', 'SRINIVAS GENERAL STORE', '9563845210', 'FIRST GATE - 583101', 'SRINIVAS', NULL, NULL),
  ('b0000000-0000-0000-0000-000000000001', 'NAMAZ GENERAL STORE', '8861211248', 'COWL BAZAR - 583101', 'NAMAZ', NULL, NULL)
ON CONFLICT DO NOTHING;

-- 4. Dynamic Categories (Initial Default Set)
INSERT INTO dodla_categories (id, name, display_order)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Dodla Milk & Curd', 1),
  ('c0000000-0000-0000-0000-000000000002', 'Dodla Ghee & Butter', 2),
  ('c0000000-0000-0000-0000-000000000003', 'Dodla Paneer & Sweets', 3),
  ('c0000000-0000-0000-0000-000000000004', 'Dodla Flavoured Milk', 4),
  ('c0000000-0000-0000-0000-000000000005', 'Beverages & Dairy Snacks', 5)
ON CONFLICT (name) DO NOTHING;

-- 5. Products in Godown (Uniform 5% GST)
INSERT INTO dodla_products (category_id, name, hsn_code, rate, stock_qty, gst_rate)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Dodla Toned Milk 500ml', '04012000', 27.00, 150, 5.00),
  ('c0000000-0000-0000-0000-000000000001', 'Dodla Full Cream Milk 500ml', '04012000', 33.00, 120, 5.00),
  ('c0000000-0000-0000-0000-000000000001', 'Dodla Premium Curd 500g', '04031000', 35.00, 80, 5.00),
  ('c0000000-0000-0000-0000-000000000002', 'Dodla Pure Cow Ghee 500ml', '04059020', 340.00, 50, 5.00),
  ('c0000000-0000-0000-0000-000000000002', 'Dodla Table Butter 100g', '04051000', 58.00, 60, 5.00),
  ('c0000000-0000-0000-0000-000000000003', 'Dodla Fresh Paneer 200g', '04061000', 95.00, 45, 5.00),
  ('c0000000-0000-0000-0000-000000000003', 'Dodla Doodh Peda 250g', '21069099', 140.00, 30, 5.00),
  ('c0000000-0000-0000-0000-000000000004', 'Dodla Badam Milk 200ml Bottle', '22029990', 35.00, 100, 5.00),
  ('c0000000-0000-0000-0000-000000000004', 'Dodla Pista Flavoured Milk 200ml', '22029990', 35.00, 90, 5.00),
  ('c0000000-0000-0000-0000-000000000005', 'Dodla Spiced Buttermilk 200ml Pouch', '04039010', 12.00, 200, 5.00)
ON CONFLICT DO NOTHING;
