-- Server-side chat persistence for AI SDK v6
-- Stores UIMessage[] as JSONB, keyed per user per day

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chats_user_date ON chats(user_id, updated_at DESC);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chats" ON chats
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
