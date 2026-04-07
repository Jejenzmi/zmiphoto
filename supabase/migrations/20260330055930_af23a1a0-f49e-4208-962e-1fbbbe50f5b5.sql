ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS xendit_payment_request_id text,
  ADD COLUMN IF NOT EXISTS xendit_qr_string text,
  ADD COLUMN IF NOT EXISTS xendit_reference_id text;

CREATE POLICY "Anyone can update transactions by xendit ref"
ON public.transactions FOR UPDATE
TO public
USING (true)
WITH CHECK (true);