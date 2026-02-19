CREATE TABLE user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  note TEXT NOT NULL,
  category TEXT,  -- 'health', 'preference', 'goal', 'observation'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notes" ON user_notes
  FOR ALL USING (auth.uid() = user_id);
