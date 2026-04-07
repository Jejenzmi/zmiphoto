ALTER TABLE public.transactions RENAME COLUMN flip_bill_link_id TO qris_invoice_id;
ALTER TABLE public.transactions RENAME COLUMN flip_reference_id TO qris_reference_id;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS flip_link_url;