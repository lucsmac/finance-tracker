-- ================================================
-- AUTOMATIC USER SYNC TRIGGER
-- Synchronizes auth.users to public.users automatically
-- ================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert new user into public.users table
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT USAGE ON SCHEMA auth TO postgres, authenticated, service_role;
GRANT ALL ON auth.users TO postgres, authenticated, service_role;

-- Sync existing auth users to public.users (if any)
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT
  id,
  email,
  created_at,
  updated_at
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  updated_at = EXCLUDED.updated_at;
