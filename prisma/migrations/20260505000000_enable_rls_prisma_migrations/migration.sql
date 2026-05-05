-- Enable RLS on _prisma_migrations to satisfy Supabase's security advisor.
-- This table is only used by Prisma CLI and should never be accessible via PostgREST.
-- No policies are defined intentionally — blocking all API-layer access is correct.
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
