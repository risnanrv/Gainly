# Gainly Development & Deployment Setup

This guide will help you configure Gainly for production deployments, specifically wiring up the offline-first logic to sync securely with the Supabase PostgreSQL backend.

## 1. Environment Configuration (`.env.local`)

To prepare the application for real-time tracking, you need to create a `.env.local` file at the root of your project:

```env
# Required for Database & Auth Sync
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Optional: If you use a premium Barcode API (OpenFoodFacts is free natively)
# FOOD_API_KEY=your_optional_key_here
```

⚠️ **CRITICAL:** Do NOT expose your `SERVICE_ROLE` key securely. Only use the `ANON_KEY` prefixed with `NEXT_PUBLIC_` so Next.js makes it safely available to your frontend PWA.

---

## 2. Setting Up Supabase Database

1. Go to [Supabase](https://supabase.com/) and create a new project.
2. Navigate to **SQL Editor** on the dashboard.
3. Run the following Schema to generate the exact shape Gainly's Zustand store uses:

```sql
-- Create Foods Database
CREATE TABLE public.foods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL, -- 'count' or 'grams'
    calories_per_100g NUMERIC,
    protein_per_100g NUMERIC,
    calories_per_unit NUMERIC,
    protein_per_unit NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Initial Required Foods Core
INSERT INTO public.foods (name, unit, calories_per_100g, protein_per_100g) VALUES 
('Rice', 'grams', 130, 2.5),
('Soya Chunks', 'grams', 345, 52),
('Peanuts', 'grams', 567, 26),
('Sweet Potato', 'grams', 86, 1.6);

INSERT INTO public.foods (name, unit, calories_per_unit, protein_per_unit) VALUES 
('Egg', 'count', 70, 6),
('Banana', 'count', 90, 1);
```

4. You can write your server-actions in Phase 3 to sync `zustand persist` up to Supabase instantly.

---

## 3. Vercel Deployment

Gainly is fully PWA-compatible and expects Turbopack for local testing but standard Webpack for production edge compatibility with `next-pwa`.

1. Push your code to GitHub.
2. Go to [Vercel](https://vercel.com/) and Import the Repository.
3. Under **Environment Variables**, paste the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` you grabbed earlier.
4. Click **Deploy**. Vercel will automatically run `npm run build` which triggers the `next-pwa` module injecting `manifest.json` and the Service Workers.
5. Visit your Vercel URL on iOS Safari or Android Chrome and click **Add to Home Screen**. 

🚀 You're done!
