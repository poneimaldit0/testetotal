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
  OLD.tipo_usuario = NEW.tipo_usuario AND
  OLD.status = NEW.status AND
  OLD.limite_acessos_diarios = NEW.limite_acessos_diarios AND
  OLD.limite_acessos_mensais = NEW.limite_acessos_mensais AND
  OLD.data_termino_contrato = NEW.data_termino_contrato
);

-- 2. Only admins can update critical fields
CREATE POLICY "admins_can_update_all_profile_fields" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3. Create audit logging function for role changes
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log critical field changes
  IF OLD.tipo_usuario != NEW.tipo_usuario OR 
     OLD.status != NEW.status OR 
     OLD.limite_acessos_diarios != NEW.limite_acessos_diarios OR
     OLD.limite_acessos_mensais != NEW.limite_acessos_mensais THEN
    
    INSERT INTO public.logs_acesso (user_id, acao)
    VALUES (
      auth.uid(),
      format('profile_update: user_id=%s, old_tipo=%s, new_tipo=%s, old_status=%s, new_status=%s', 
        NEW.id, OLD.tipo_usuario, NEW.tipo_usuario, OLD.status, NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger for audit logging
DROP TRIGGER IF EXISTS audit_profile_changes_trigger ON public.profiles;
CREATE TRIGGER audit_profile_changes_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_profile_changes();

-- CRITICAL: Fix function search path vulnerabilities
-- Update all functions to use secure search_path

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

CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND tipo_usuario = 'admin'
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

CREATE OR REPLACE FUNCTION public.is_master_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND tipo_usuario IN ('master', 'admin')
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

CREATE OR REPLACE FUNCTION public.can_access_financial()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT public.is_master();
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

-- Update handle_new_user function with secure search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    nome,
    telefone,
    empresa,
    tipo_usuario,
    status,
    data_criacao,
    limite_acessos_diarios,
    limite_acessos_mensais
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.raw_user_meta_data ->> 'telefone',
    NEW.raw_user_meta_data ->> 'empresa',
    COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'fornecedor'),
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'fornecedor') = 'fornecedor' THEN 'pendente_aprovacao'
      ELSE 'ativo'
    END,
    NOW(),
    10,
    100
  );
  RETURN NEW;
END;
$function$;