-- Promover a admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE email IN ('rhuanmatavellii@gmail.com', 'jpmatavellip@gmail.com', 'eduardomendesalves@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Garantir que finance2 seja user e remover admin se tiver
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::app_role FROM auth.users
WHERE email = 'finance2@happyaging.com'
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id IN (SELECT id FROM auth.users WHERE email = 'finance2@happyaging.com');