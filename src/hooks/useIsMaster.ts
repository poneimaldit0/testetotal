import { useAuth } from './useAuth';

export const useIsMaster = () => {
  const { profile } = useAuth();
  return profile?.tipo_usuario === 'master';
};

export const useCanManageOrcamentos = () => {
  const { profile } = useAuth();
  return profile?.tipo_usuario === 'master' || 
         profile?.tipo_usuario === 'admin' || 
         profile?.tipo_usuario === 'gestor_conta' ||
         profile?.tipo_usuario === 'sdr';
  // gestor_marcenaria não pode gerenciar orçamentos
};