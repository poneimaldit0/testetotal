import { useAuth } from './useAuth';
import { canManageBudgets, type UserRole } from '@/utils/accessControl';

export const useCanManageOrcamentos = () => {
  const { profile } = useAuth();
  return profile?.tipo_usuario ? canManageBudgets(profile.tipo_usuario as UserRole) : false;
};