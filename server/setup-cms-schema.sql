-- ========================================================
-- Inspire App: Content Management System Schema
-- ========================================================

-- 1. App Categories Table
CREATE TABLE IF NOT EXISTS public.app_categories (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    emoji TEXT,
    gradient_start TEXT,
    gradient_end TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. App Quotes Table
CREATE TABLE IF NOT EXISTS public.app_quotes (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    text TEXT NOT NULL,
    author TEXT DEFAULT 'Sohel Khan' NOT NULL,
    category_ids JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.app_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_quotes ENABLE ROW LEVEL SECURITY;

-- Allow public read access to categories and quotes
CREATE POLICY "Allow public read-only access to app_categories" ON public.app_categories
    FOR SELECT USING (true);

CREATE POLICY "Allow public read-only access to app_quotes" ON public.app_quotes
    FOR SELECT USING (true);

-- Allow anonymous insert/update/delete for app_categories
CREATE POLICY "Allow anonymous insert/update/delete for app_categories" ON public.app_categories
    FOR ALL USING (true);

CREATE POLICY "Allow anonymous insert/update/delete for app_quotes" ON public.app_quotes
    FOR ALL USING (true);
