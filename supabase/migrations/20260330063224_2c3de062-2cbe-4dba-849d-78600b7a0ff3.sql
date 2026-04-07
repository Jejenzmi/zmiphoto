
ALTER TABLE public.kiosks 
  ADD COLUMN allowed_payment_methods jsonb NOT NULL DEFAULT '["all","qris","va_bca","va_bni","va_bri","va_mandiri","ovo","dana","shopeepay"]'::jsonb;
