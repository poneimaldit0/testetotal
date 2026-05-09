import { useAuth } from './useAuth';
import { canManageSuppliers, type UserRole } from '@/utils/accessControl';

export const useCanManageSuppliers = () => {
  const { profile } = useAuth();
  return profile?.tipo_usuario ? canManageSuppliers(profile.tipo_usuario as UserRole) : false;
};
