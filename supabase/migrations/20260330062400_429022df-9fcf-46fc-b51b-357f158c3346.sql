
ALTER TABLE public.transactions 
  RENAME COLUMN xendit_payment_request_id TO flip_bill_link_id;

ALTER TABLE public.transactions 
  RENAME COLUMN xendit_qr_string TO flip_link_url;

ALTER TABLE public.transactions 
  RENAME COLUMN xendit_reference_id TO flip_reference_id;
