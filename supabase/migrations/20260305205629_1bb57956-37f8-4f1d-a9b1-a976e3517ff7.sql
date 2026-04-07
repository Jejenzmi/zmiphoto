
-- Allow admins to insert user roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update user roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete user roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow superadmin to view all roles
CREATE POLICY "Superadmin can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Allow superadmin to manage kiosks
CREATE POLICY "Superadmin can insert kiosks"
ON public.kiosks
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmin can update kiosks"
ON public.kiosks
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmin can delete kiosks"
ON public.kiosks
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role));
