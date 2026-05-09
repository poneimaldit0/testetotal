import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ForcePasswordChange } from './ForcePasswordChange';
import { useNavigate } from 'react-router-dom';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredUserType?: string[];
}

export const AuthGuard = ({ children, requiredUserType }: AuthGuardProps) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (!loading && profile && requiredUserType && !requiredUserType.includes(profile.tipo_usuario)) {
      // Redirecionar para o dashboard apropriado
      if (profile.tipo_usuario === 'cliente') {
        navigate('/cliente/dashboard');
      } else if (profile.tipo_usuario === 'fornecedor') {
        navigate('/dashboard');
      } else if (profile.tipo_usuario === 'sdr') {
        navigate('/dashboard');
      } else if (profile.tipo_usuario === 'customer_success') {
        navigate('/dashboard');
      } else if (profile.tipo_usuario === 'gestor_marcenaria') {
        navigate('/dashboard');
      } else if (profile.tipo_usuario === 'consultor_marcenaria') {
        navigate('/dashboard');
      } else {
        navigate('/dashboard');
      }
      return;
    }
  }, [user, profile, loading, navigate, requiredUserType]);

  // Mostrar loading enquanto carrega
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirecionar se não autenticado
  if (!user || !profile) {
    return null;
  }

  // Forçar troca de senha se necessário
  if (profile.must_change_password) {
    return <ForcePasswordChange />;
  }

  return <>{children}</>;
};