-- Add access_token column to notion_connections if it doesn't exist
-- This column stores the encrypted Notion access token

DO $$ 
BEGIN
  -- Check if access_token column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notion_connections' 
    AND column_name = 'access_token'
  ) THEN
    -- Add the column
    ALTER TABLE public.notion_connections 
    ADD COLUMN access_token TEXT NOT NULL DEFAULT '';
    
    RAISE NOTICE '✅ Column access_token added to notion_connections';
  ELSE
    RAISE NOTICE 'ℹ️ Column access_token already exists in notion_connections';
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.notion_connections.access_token IS 'Encrypted with TOKEN_ENCRYPTION_KEY (AES-256-GCM, base64 encoded)';
