-- ================================================
-- SUPABASE INITIALIZATION SCRIPT
-- Creates required roles and extensions for Supabase
-- This must run BEFORE the application schema
-- ================================================

-- Create Supabase roles if they don't exist
DO $$
BEGIN
  -- supabase_admin: Full admin access
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin LOGIN PASSWORD 'postgres';
  END IF;

  -- supabase_auth_admin: Auth service
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin LOGIN PASSWORD 'postgres';
  END IF;

  -- authenticator: API requests
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN PASSWORD 'postgres';
  END IF;

  -- anon: Anonymous access
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;

  -- authenticated: Logged in users
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;

  -- service_role: Service/admin access
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END
$$;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO authenticator;

-- Allow authenticator to switch to anon and authenticated
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- Create auth schema for GoTrue
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;

-- Grant schema permissions
GRANT USAGE ON SCHEMA auth TO authenticator, anon, authenticated, service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;

-- Create extensions (pgcrypto provides gen_random_uuid in older postgres)
-- Note: PostgreSQL 13+ has gen_random_uuid() built-in
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;

-- Create uuid_generate_v4 as alias to gen_random_uuid for compatibility
CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
RETURNS uuid
LANGUAGE sql
VOLATILE
AS $$
  SELECT gen_random_uuid();
$$;

-- Grant execute on auth functions to roles
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT SELECT ON TABLES TO anon, authenticated;

-- Public schema permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticator;

-- Set search path
ALTER ROLE supabase_admin SET search_path TO public, auth;
ALTER ROLE supabase_auth_admin SET search_path TO auth, public;
ALTER ROLE authenticator SET search_path TO public, auth;
