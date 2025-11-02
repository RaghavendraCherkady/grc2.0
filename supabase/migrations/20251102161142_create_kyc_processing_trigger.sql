/*
  # Create Database Trigger for Auto KYC Processing

  ## Summary
  Sets up automatic KYC processing workflow using database triggers.
  When a new KYC application is inserted with status 'pending', 
  it automatically triggers the RAG-based verification edge function.

  ## Changes
  1. Create function to trigger edge function via HTTP
  2. Create trigger on kyc_applications INSERT
  3. Add http extension for making requests from database

  ## Security
  - Uses service role key for edge function calls
  - Only triggers for new applications with 'pending' status

  ## Notes
  This enables fully automated KYC processing pipeline:
  1. User submits KYC → Status: pending
  2. Trigger fires → Calls verify-kyc-rag function
  3. AI processes documents → Updates status automatically
  4. Manual review only if flagged
*/

-- Enable http extension for making requests
CREATE EXTENSION IF NOT EXISTS http;

-- Create function to call edge function
CREATE OR REPLACE FUNCTION trigger_kyc_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  request_id bigint;
BEGIN
  -- Only process if status is pending
  IF NEW.status = 'pending' THEN
    -- Get environment variables (these should be set in your Supabase project)
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_role_key := current_setting('app.settings.service_role_key', true);
    
    -- If settings not configured, skip trigger
    IF supabase_url IS NULL OR service_role_key IS NULL THEN
      RAISE NOTICE 'Supabase settings not configured, skipping auto verification';
      RETURN NEW;
    END IF;
    
    -- Make async HTTP request to edge function
    -- Using http_post from pg_net extension (non-blocking)
    BEGIN
      SELECT http_post(
        supabase_url || '/functions/v1/verify-kyc-rag',
        json_build_object('kycApplicationId', NEW.id)::text,
        'application/json',
        ARRAY[
          http_header('Authorization', 'Bearer ' || service_role_key),
          http_header('Content-Type', 'application/json')
        ]
      ) INTO request_id;
      
      RAISE NOTICE 'Triggered KYC verification for application %', NEW.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Failed to trigger verification: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_kyc_verification_on_insert ON kyc_applications;

CREATE TRIGGER trigger_kyc_verification_on_insert
  AFTER INSERT ON kyc_applications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_kyc_verification();

-- Add comment
COMMENT ON FUNCTION trigger_kyc_verification() IS 
  'Automatically triggers RAG-based KYC verification when new application is submitted';
