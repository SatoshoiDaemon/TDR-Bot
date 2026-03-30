-- Migration to enable RLS (Row Level Security) on all tables in the public schema
-- By default, enabling RLS without policies acts as a "deny-all" for anon and authenticated users
-- while the 'postgres' (superuser/admin) role used by Prisma continues to have full access.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations') LOOP
        EXECUTE 'ALTER TABLE public."' || r.tablename || '" ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;