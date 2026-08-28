-- ====================================================================
-- HYPERXGT ECOMMERCE: COMPLETE MULTI-TABLE RLS SECURITY SCHEMA
-- ====================================================================
-- Run this script in Supabase Dashboard -> SQL Editor -> Run
-- Enforces Row Level Security (RLS) across all tables following least-privilege principles.

-- 1. PROFILES TABLE (Customer Accounts)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  country TEXT DEFAULT 'India',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);


-- 2. PRODUCTS TABLE (Catalog & Inventory)
CREATE TABLE IF NOT EXISTS public.products (
  id BIGINT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC NOT NULL,
  regular_price NUMERIC,
  stock INT DEFAULT 25,
  image TEXT,
  images JSONB,
  specs JSONB,
  description TEXT,
  no_image BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Anyone (public + authenticated) can view products catalog
DROP POLICY IF EXISTS "Public can view products catalog" ON public.products;
CREATE POLICY "Public can view products catalog" ON public.products FOR SELECT USING (true);

-- Only backend service_role or admin can modify products
DROP POLICY IF EXISTS "Service role can modify products" ON public.products;
CREATE POLICY "Service role can modify products" ON public.products FOR ALL USING (auth.role() = 'service_role');


-- 3. ORDERS TABLE (Customer Purchase Records)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  shipping_address JSONB,
  items JSONB,
  subtotal NUMERIC,
  shipping_fee NUMERIC DEFAULT 0,
  total NUMERIC,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'Pending',
  fulfillment_status TEXT DEFAULT 'Pending Admin Acceptance',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add missing user_id & customer_email columns if orders table already existed
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Customers can view only their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT 
USING (auth.uid() = user_id OR auth.jwt()->>'email' = customer_email);

-- Customers can insert their own orders
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
CREATE POLICY "Users can insert own orders" ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only service_role can update payment/fulfillment status
DROP POLICY IF EXISTS "Service role can manage orders" ON public.orders;
CREATE POLICY "Service role can manage orders" ON public.orders FOR ALL USING (auth.role() = 'service_role');


-- 4. REVIEWS TABLE (Customer Unboxing & Reviews)
CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  order_id TEXT,
  product_name TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  status TEXT DEFAULT 'Pending Approval',
  coupon_code TEXT,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public can read only approved reviews
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Public can view approved reviews" ON public.reviews FOR SELECT USING (status = 'Approved');

-- Customers can submit reviews (pending status)
DROP POLICY IF EXISTS "Customers can submit reviews" ON public.reviews;
CREATE POLICY "Customers can submit reviews" ON public.reviews FOR INSERT WITH CHECK (true);

-- Only service_role can approve, edit, or delete reviews
DROP POLICY IF EXISTS "Service role can moderate reviews" ON public.reviews;
CREATE POLICY "Service role can moderate reviews" ON public.reviews FOR ALL USING (auth.role() = 'service_role');


-- 5. COLLABORATIONS TABLE (Brand Partners)
CREATE TABLE IF NOT EXISTS public.collaborations (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  link TEXT,
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active collaborations" ON public.collaborations;
CREATE POLICY "Public can view active collaborations" ON public.collaborations FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Service role can manage collaborations" ON public.collaborations;
CREATE POLICY "Service role can manage collaborations" ON public.collaborations FOR ALL USING (auth.role() = 'service_role');


-- 6. GRANT LEAST-PRIVILEGE ACCESS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.products, public.collaborations TO anon, authenticated;
GRANT SELECT, INSERT ON public.reviews, public.orders TO anon, authenticated;
GRANT ALL ON public.profiles TO authenticated;
