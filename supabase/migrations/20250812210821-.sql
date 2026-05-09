-- Fix critical security vulnerability: Profiles table publicly readable
-- Remove all existing policies that might be allowing public access
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_update_all_profile_fields" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_basic_info" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem inserir seu próprio perfil" ON public.profiles;

-- Create secure RLS policies that properly restrict access
-- 1. Users can only view their own profile OR admins can view all
CREATE POLICY "secure_profiles_select_policy" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
  auth.uid() = id OR 
  (auth.uid() IS NOT NULL AND public.is_admin())
);

-- 2. Only admins can insert new profiles
CREATE POLICY "secure_profiles_insert_policy" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin());

-- 3. Users can update their own basic info, admins can update everything
CREATE POLICY "secure_profiles_update_own_policy" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Prevent users from changing their own critical fields
  tipo_usuario = (SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid()) AND
  status = (SELECT status FROM public.profiles WHERE id = auth.uid()) AND
  limite_acessos_diarios = (SELECT limite_acessos_diarios FROM public.profiles WHERE id = auth.uid()) AND
  limite_acessos_mensais = (SELECT limite_acessos_mensais FROM public.profiles WHERE id = auth.uid())
);

-- 4. Admins can update any profile
CREATE POLICY "secure_profiles_admin_update_policy" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 5. Only admins can delete profiles
CREATE POLICY "secure_profiles_delete_policy" 
ON public.profiles 
FOR DELETE 
TO authenticated 
USING (public.is_admin());

-- 6. Special policy for profile creation during user signup (handle_new_user trigger)
CREATE POLICY "secure_profiles_signup_insert_policy" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Log this critical security fix
INSERT INTO public.logs_acesso (user_id, acao)
VALUES (
  auth.uid(),
  'SECURITY_FIX: Profiles table RLS policies updated to prevent public data exposure'
);