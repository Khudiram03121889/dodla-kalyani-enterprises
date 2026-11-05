-- ==============================================================================
-- DODLA MOBILE APP (KALYANI ENTERPRISES) - SUPABASE SCHEMA MIGRATION
-- ==============================================================================

-- 1. Sequences for Collision-Free Sequential Invoicing
CREATE SEQUENCE IF NOT EXISTS dodla_order_no_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS dodla_invoice_no_seq START WITH 1001;

-- 2. Profiles Table (Phone number as username + role)
CREATE TABLE IF NOT EXISTS dodla_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(15) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('owner', 'executive')) NOT NULL DEFAULT 'executive',
  company TEXT NOT NULL DEFAULT 'Dodla',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Routes Table
CREATE TABLE IF NOT EXISTS dodla_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT 'Dodla',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT dodla_routes_name_company_key UNIQUE (name, company)
);

-- 4. Shops Table (In-route party master)
CREATE TABLE IF NOT EXISTS dodla_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES dodla_routes(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone VARCHAR(15) NOT NULL,
  address TEXT NOT NULL,
  incharge TEXT,
  gstin VARCHAR(25),
  fssai VARCHAR(30),
  company TEXT NOT NULL DEFAULT 'Dodla',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Categories Table (Owner-managed item categories)
CREATE TABLE IF NOT EXISTS dodla_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hsn_code VARCHAR(20) DEFAULT '21069099',
  display_order INT DEFAULT 0,
  company TEXT NOT NULL DEFAULT 'Dodla',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT dodla_categories_name_company_key UNIQUE (name, company)
);

-- 6. Products Table (Godown Inventory items with rate and 5% GST)
CREATE TABLE IF NOT EXISTS dodla_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES dodla_categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  hsn_code VARCHAR(20) DEFAULT '21069099',
  rate NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (rate >= 0),
  stock_qty INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (gst_rate >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  company TEXT NOT NULL DEFAULT 'Dodla',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Orders Table (Sales punches)
CREATE TABLE IF NOT EXISTS dodla_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE NOT NULL,
  invoice_no TEXT UNIQUE NOT NULL,
  company TEXT NOT NULL DEFAULT 'Dodla',
  route_id UUID REFERENCES dodla_routes(id) ON DELETE SET NULL,
  route_name TEXT NOT NULL,
  shop_id UUID REFERENCES dodla_shops(id) ON DELETE SET NULL,
  shop_name TEXT NOT NULL,
  shop_phone TEXT NOT NULL,
  shop_address TEXT NOT NULL,
  shop_gstin TEXT,
  shop_fssai TEXT,
  shop_incharge TEXT,
  executive_id UUID REFERENCES dodla_profiles(id) ON DELETE SET NULL,
  executive_name TEXT NOT NULL,
  executive_phone TEXT NOT NULL,
  total_qty INT NOT NULL DEFAULT 0 CHECK (total_qty >= 0),
  taxable_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (taxable_amount >= 0),
  cgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  sgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_gst NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  round_off NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  grand_total NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (grand_total >= 0),
  status TEXT CHECK (status IN ('pending', 'printed')) NOT NULL DEFAULT 'pending',
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Order Items Table (Itemized breakdown in order)
CREATE TABLE IF NOT EXISTS dodla_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES dodla_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES dodla_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  category_name TEXT NOT NULL,
  hsn_code VARCHAR(20),
  qty INT NOT NULL DEFAULT 1 CHECK (qty > 0),
  rate NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (rate >= 0),
  taxable_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (taxable_amount >= 0),
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (gst_rate >= 0),
  gst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
  company TEXT NOT NULL DEFAULT 'Dodla'
);

-- Indexes for Foreign Keys & Timestamps
CREATE INDEX IF NOT EXISTS idx_dodla_order_items_order_id ON dodla_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_dodla_order_items_product_id ON dodla_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_dodla_orders_created_at ON dodla_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dodla_orders_route_id ON dodla_orders(route_id);
CREATE INDEX IF NOT EXISTS idx_dodla_orders_shop_id ON dodla_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_dodla_orders_executive_id ON dodla_orders(executive_id);
CREATE INDEX IF NOT EXISTS idx_dodla_shops_route_id ON dodla_shops(route_id);
CREATE INDEX IF NOT EXISTS idx_dodla_products_category_id ON dodla_products(category_id);

-- Enable RLS & open policies for mobile app operations
ALTER TABLE dodla_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dodla_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dodla_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE dodla_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE dodla_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE dodla_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE dodla_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read dodla_profiles" ON dodla_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert dodla_profiles" ON dodla_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update dodla_profiles" ON dodla_profiles FOR UPDATE USING (true);

CREATE POLICY "Allow public all dodla_routes" ON dodla_routes FOR ALL USING (true);
CREATE POLICY "Allow public all dodla_shops" ON dodla_shops FOR ALL USING (true);
CREATE POLICY "Allow public all dodla_categories" ON dodla_categories FOR ALL USING (true);
CREATE POLICY "Allow public all dodla_products" ON dodla_products FOR ALL USING (true);
CREATE POLICY "Allow public all dodla_orders" ON dodla_orders FOR ALL USING (true);
CREATE POLICY "Allow public all dodla_order_items" ON dodla_order_items FOR ALL USING (true);

-- 9. Production Hardened punch_dodla_order Stored Procedure
CREATE OR REPLACE FUNCTION punch_dodla_order(
  p_order jsonb,
  p_items jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_executive_id uuid;
  v_qty int;
  v_order_no text;
  v_invoice_no text;
  v_curr_stock int;
  v_company text;
BEGIN
  v_company := COALESCE(NULLIF(TRIM(p_order->>'company'), ''), 'Dodla');

  -- Generate canonical sequence numbers if not provided or to guarantee uniqueness
  v_order_no := COALESCE(
    NULLIF(TRIM(p_order->>'order_no'), ''),
    'SO-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('dodla_order_no_seq')::text, 5, '0')
  );
  
  v_invoice_no := COALESCE(
    NULLIF(TRIM(p_order->>'invoice_no'), ''),
    'K-2627-' || lpad(nextval('dodla_invoice_no_seq')::text, 6, '0')
  );

  -- Safely validate executive_id: must be valid UUID AND must exist in dodla_profiles
  IF (p_order->>'executive_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT id INTO v_executive_id FROM dodla_profiles WHERE id = (p_order->>'executive_id')::uuid;
  ELSE
    v_executive_id := NULL;
  END IF;

  INSERT INTO dodla_orders (
    order_no, invoice_no, company, route_id, route_name,
    shop_id, shop_name, shop_phone, shop_address,
    shop_gstin, shop_fssai, shop_incharge,
    executive_id, executive_name, executive_phone,
    total_qty, taxable_amount, cgst_amount, sgst_amount,
    total_gst, round_off, grand_total, status
  ) VALUES (
    v_order_no,
    v_invoice_no,
    v_company,
    (p_order->>'route_id')::uuid,
    (p_order->>'route_name'),
    (p_order->>'shop_id')::uuid,
    (p_order->>'shop_name'),
    (p_order->>'shop_phone'),
    (p_order->>'shop_address'),
    NULLIF(TRIM(p_order->>'shop_gstin'), ''),
    NULLIF(TRIM(p_order->>'shop_fssai'), ''),
    NULLIF(TRIM(p_order->>'shop_incharge'), ''),
    v_executive_id,
    (p_order->>'executive_name'),
    (p_order->>'executive_phone'),
    GREATEST(0, (p_order->>'total_qty')::int),
    (p_order->>'taxable_amount')::numeric,
    (p_order->>'cgst_amount')::numeric,
    (p_order->>'sgst_amount')::numeric,
    (p_order->>'total_gst')::numeric,
    (p_order->>'round_off')::numeric,
    (p_order->>'grand_total')::numeric,
    'pending'
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Safely parse UUID or NULL for custom products
    v_product_id := CASE 
      WHEN (v_item->>'product_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN (v_item->>'product_id')::uuid 
      ELSE NULL 
    END;
    v_qty := GREATEST(1, (v_item->>'qty')::int);

    -- Insert Order Item
    INSERT INTO dodla_order_items (
      order_id, product_id, product_name, category_name, hsn_code,
      qty, rate, taxable_amount, gst_rate, gst_amount, total_amount, company
    ) VALUES (
      v_order_id,
      v_product_id,
      (v_item->>'product_name'),
      (v_item->>'category_name'),
      NULLIF(TRIM(v_item->>'hsn_code'), ''),
      v_qty,
      (v_item->>'rate')::numeric,
      (v_item->>'taxable_amount')::numeric,
      (v_item->>'gst_rate')::numeric,
      (v_item->>'gst_amount')::numeric,
      (v_item->>'total_amount')::numeric,
      v_company
    );

    -- Stock decrement with concurrency row lock
    IF v_product_id IS NOT NULL THEN
      SELECT stock_qty INTO v_curr_stock 
      FROM dodla_products 
      WHERE id = v_product_id 
      FOR UPDATE;

      UPDATE dodla_products
      SET stock_qty = GREATEST(0, stock_qty - v_qty)
      WHERE id = v_product_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_order_id, 
    'order_no', v_order_no, 
    'invoice_no', v_invoice_no, 
    'company', v_company,
    'status', 'success'
  );
END;
$$;


-- ==============================================================================
-- GOPAL CHIPS DIVISION TABLES & FUNCTIONS
-- ==============================================================================

-- 9. Sequences for Gopal Chips Invoicing
CREATE SEQUENCE IF NOT EXISTS gopal_order_no_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS gopal_invoice_no_seq START WITH 1 INCREMENT BY 1;

-- 10. Gopal Routes Table
CREATE TABLE IF NOT EXISTS public.gopal_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Gopal Shops Table
CREATE TABLE IF NOT EXISTS public.gopal_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.gopal_routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone VARCHAR(15) NOT NULL,
  address TEXT NOT NULL,
  incharge TEXT,
  gstin VARCHAR(15),
  fssai VARCHAR(14),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Gopal Categories Table
CREATE TABLE IF NOT EXISTS public.gopal_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hsn_code VARCHAR(20) DEFAULT '20052000',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Gopal Products Table
CREATE TABLE IF NOT EXISTS public.gopal_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.gopal_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hsn_code VARCHAR(20) DEFAULT '20052000',
  rate NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (rate >= 0),
  stock_qty INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (gst_rate >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Gopal Orders Table
CREATE TABLE IF NOT EXISTS public.gopal_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT NOT NULL UNIQUE,
  invoice_no TEXT NOT NULL UNIQUE,
  route_id UUID REFERENCES public.gopal_routes(id) ON DELETE SET NULL,
  route_name TEXT NOT NULL,
  shop_id UUID REFERENCES public.gopal_shops(id) ON DELETE SET NULL,
  shop_name TEXT NOT NULL,
  shop_phone TEXT NOT NULL,
  shop_address TEXT NOT NULL,
  shop_gstin TEXT,
  shop_fssai TEXT,
  shop_incharge TEXT,
  executive_id UUID REFERENCES public.dodla_profiles(id) ON DELETE SET NULL,
  executive_name TEXT NOT NULL,
  executive_phone TEXT NOT NULL,
  total_qty INT NOT NULL DEFAULT 0 CHECK (total_qty >= 0),
  taxable_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (taxable_amount >= 0),
  cgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  sgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_gst NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  round_off NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  grand_total NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (grand_total >= 0),
  status TEXT NOT NULL DEFAULT 'pending',
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Gopal Order Items Table
CREATE TABLE IF NOT EXISTS public.gopal_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.gopal_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.gopal_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  category_name TEXT NOT NULL,
  hsn_code VARCHAR(20),
  qty INT NOT NULL DEFAULT 1 CHECK (qty >= 0),
  rate NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (rate >= 0),
  taxable_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (taxable_amount >= 0),
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (gst_rate >= 0),
  gst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (gst_amount >= 0),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0)
);

-- 16. Gopal Order Punch Stored Procedure
CREATE OR REPLACE FUNCTION public.punch_gopal_order(p_order jsonb, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_executive_id uuid;
  v_qty int;
  v_order_no text;
  v_invoice_no text;
  v_curr_stock int;
BEGIN
  v_order_no := COALESCE(
    NULLIF(TRIM(p_order->>'order_no'), ''),
    'SO-GOPAL-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('gopal_order_no_seq')::text, 5, '0')
  );
  
  v_invoice_no := COALESCE(
    NULLIF(TRIM(p_order->>'invoice_no'), ''),
    'K-2627-' || lpad(nextval('gopal_invoice_no_seq')::text, 6, '0')
  );

  IF (p_order->>'executive_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT id INTO v_executive_id FROM dodla_profiles WHERE id = (p_order->>'executive_id')::uuid;
  ELSE
    v_executive_id := NULL;
  END IF;

  INSERT INTO gopal_orders (
    order_no, invoice_no, route_id, route_name,
    shop_id, shop_name, shop_phone, shop_address,
    shop_gstin, shop_fssai, shop_incharge,
    executive_id, executive_name, executive_phone,
    total_qty, taxable_amount, cgst_amount, sgst_amount,
    total_gst, round_off, grand_total, status
  ) VALUES (
    v_order_no,
    v_invoice_no,
    (p_order->>'route_id')::uuid,
    (p_order->>'route_name'),
    (p_order->>'shop_id')::uuid,
    (p_order->>'shop_name'),
    (p_order->>'shop_phone'),
    (p_order->>'shop_address'),
    NULLIF(TRIM(p_order->>'shop_gstin'), ''),
    NULLIF(TRIM(p_order->>'shop_fssai'), ''),
    NULLIF(TRIM(p_order->>'shop_incharge'), ''),
    v_executive_id,
    (p_order->>'executive_name'),
    (p_order->>'executive_phone'),
    GREATEST(0, (p_order->>'total_qty')::int),
    (p_order->>'taxable_amount')::numeric,
    (p_order->>'cgst_amount')::numeric,
    (p_order->>'sgst_amount')::numeric,
    (p_order->>'total_gst')::numeric,
    (p_order->>'round_off')::numeric,
    (p_order->>'grand_total')::numeric,
    'pending'
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := CASE 
      WHEN (v_item->>'product_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
      THEN (v_item->>'product_id')::uuid 
      ELSE NULL 
    END;
    v_qty := GREATEST(1, (v_item->>'qty')::int);

    INSERT INTO gopal_order_items (
      order_id, product_id, product_name, category_name, hsn_code,
      qty, rate, taxable_amount, gst_rate, gst_amount, total_amount
    ) VALUES (
      v_order_id,
      v_product_id,
      (v_item->>'product_name'),
      (v_item->>'category_name'),
      NULLIF(TRIM(v_item->>'hsn_code'), ''),
      v_qty,
      (v_item->>'rate')::numeric,
      (v_item->>'taxable_amount')::numeric,
      (v_item->>'gst_rate')::numeric,
      (v_item->>'gst_amount')::numeric,
      (v_item->>'total_amount')::numeric
    );

    IF v_product_id IS NOT NULL THEN
      SELECT stock_qty INTO v_curr_stock 
      FROM gopal_products 
      WHERE id = v_product_id 
      FOR UPDATE;

      UPDATE gopal_products
      SET stock_qty = GREATEST(0, stock_qty - v_qty)
      WHERE id = v_product_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_order_id, 
    'order_no', v_order_no, 
    'invoice_no', v_invoice_no, 
    'status', 'success'
  );
END;
$$;
