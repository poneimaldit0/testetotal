-- CRITICAL SECURITY FIX: Prevent role escalation vulnerability
-- Users should not be able to update their own tipo_usuario field

-- First, update the existing profiles table UPDATE policy to be more restrictive
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- Create separate policies for different update scenarios
-- 1. Users can update their basic info (but NOT tipo_usuario, status, limits)
CREATE POLICY "users_can_update_own_basic_info" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Prevent users from changing these critical fields
  tipo_usuario = (SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid()) AND
  status = (SELECT status FROM public.profiles WHERE id = auth.uid()) AND
  limite_acessos_diarios = (SELECT limite_acessos_diarios FROM public.profiles WHERE id = auth.uid()) AND
  limite_acessos_mensais = (SELECT limite_acessos_mensais FROM public.profiles WHERE id = auth.uid())
);

-- 2. Only admins can update critical fields
CREATE POLICY "admins_can_update_all_profile_fields" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- CRITICAL: Fix function search path vulnerabilities
-- Update core functions to use secure search_path

CREATE OR REPLACE FUNCTION public.is_gestor_conta()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND tipo_usuario = 'gestor_conta'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND tipo_usuario = 'master'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND tipo_usuario IN ('admin', 'master')
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_orcamentos()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND tipo_usuario IN ('admin', 'master', 'gestor_conta')
  );
$function$;