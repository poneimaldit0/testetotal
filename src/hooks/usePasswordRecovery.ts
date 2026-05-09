import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePasswordRecovery = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const sendRecoveryOTP = async (email: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('Enviando OTP de recuperação para:', email);
      
      // IMPORTANTE: Por padrão, signInWithOtp com email envia magic link
      // Para enviar código numérico de 6 dígitos:
      // 1. Ir no Supabase Dashboard → Authentication → Email Templates
      // 2. Editar o template "Magic Link" 
      // 3. Substituir {{ .ConfirmationURL }} por {{ .Token }}
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        }
      });

      if (otpError) {
        console.error('Erro ao enviar OTP:', otpError);
        throw otpError;
      }

      console.log('OTP enviado com sucesso');
      setSuccess(true);
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao enviar código de recuperação';
      console.error('Exceção ao enviar OTP:', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpAndResetPassword = async (email: string, token: string, newPassword: string) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('Verificando OTP e estabelecendo sessão');
      
      // Verificar o OTP e estabelecer sessão
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (verifyError) {
        console.error('Erro ao verificar OTP:', verifyError);
        throw verifyError;
      }

      console.log('OTP válido, atualizando senha');
      
      // Atualizar a senha do usuário
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error('Erro ao atualizar senha:', updateError);
        throw updateError;
      }

      console.log('Senha atualizada com sucesso');
      setSuccess(true);
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao redefinir senha';
      console.error('Exceção ao verificar OTP e redefinir senha:', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('A senha deve ter pelo menos 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('A senha deve conter pelo menos uma letra maiúscula');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('A senha deve conter pelo menos uma letra minúscula');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('A senha deve conter pelo menos um número');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  return {
    sendRecoveryOTP,
    verifyOtpAndResetPassword,
    validatePassword,
    loading,
    error,
    success,
  };
};
