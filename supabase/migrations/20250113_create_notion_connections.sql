-- Create notion_connections table to store encrypted Notion tokens
-- This table stores the encrypted access tokens for Notion workspaces

CREATE TABLE IF NOT EXISTS public.notion_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  workspace_name TEXT NOT NULL,
  workspace_icon TEXT,
  access_token TEXT NOT NULL, -- Encrypted token (base64)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one connection per user per workspace
  UNIQUE(user_id, workspace_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notion_connections_user_id ON public.notion_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_notion_connections_workspace_id ON public.notion_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notion_connections_is_active ON public.notion_connections(is_active);

-- Enable Row Level Security
ALTER TABLE public.notion_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own connections
CREATE POLICY "Users can view their own Notion connections"
  ON public.notion_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Notion connections"
  ON public.notion_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Notion connections"
  ON public.notion_connections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Notion connections"
  ON public.notion_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role has full access to Notion connections"
  ON public.notion_connections
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notion_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_notion_connections_updated_at
  BEFORE UPDATE ON public.notion_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_notion_connections_updated_at();

-- Grant permissions
GRANT ALL ON public.notion_connections TO authenticated;
GRANT ALL ON public.notion_connections TO service_role;

-- Add comment
COMMENT ON TABLE public.notion_connections IS 'Stores encrypted Notion workspace access tokens';
COMMENT ON COLUMN public.notion_connections.access_token IS 'Encrypted with TOKEN_ENCRYPTION_KEY (AES-256-GCM, base64 encoded)';
