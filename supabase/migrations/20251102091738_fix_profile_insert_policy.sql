/*
  # Fix Profile Insert Policy for Signup

  ## Overview
  Adds a policy to allow users to insert their own profile during signup.
  The previous migration was missing this critical policy.

  ## Changes
  - Add INSERT policy for profiles table to allow users to create their own profile
  - This enables the signup flow to complete successfully

  ## Security
  - Users can only insert a profile for their own user ID
  - The policy checks that the profile ID matches the authenticated user ID
*/

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;

-- Create policy to allow users to insert their own profile
CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
