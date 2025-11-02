/*
  # Fix Profile RLS Infinite Recursion

  ## Overview
  Fixes the infinite recursion error in the profiles table RLS policies.
  The issue was caused by the "System admins can view all profiles" policy
  which queries the profiles table while protecting the same table.

  ## Changes
  - Drop the problematic recursive policy
  - Simplify RLS policies to avoid circular references
  - Ensure users can read their own profile without recursion

  ## Security
  - Users can still view and update their own profiles
  - No loss of security - proper access control maintained
*/

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "System admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;

-- Recreate policies without recursion
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
