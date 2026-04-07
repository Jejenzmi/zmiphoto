-- Chat messages table for gallery chatbot
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  image_url text,
  message_type text NOT NULL DEFAULT 'text',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view chat messages by session code"
  ON public.chat_messages FOR SELECT USING (true);

CREATE POLICY "Anyone can insert chat messages"
  ON public.chat_messages FOR INSERT WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Gifts table
CREATE TABLE public.gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code text NOT NULL,
  sender_name text NOT NULL DEFAULT 'Anonim',
  message text,
  gift_type text NOT NULL DEFAULT 'heart',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gifts" ON public.gifts FOR SELECT USING (true);
CREATE POLICY "Anyone can send gifts" ON public.gifts FOR INSERT WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.gifts;