import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ForgotPassword = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar automaticamente para a nova página de recuperação
    navigate('/recuperar-senha', { replace: true });
  }, [navigate]);

  return null; // Redirecionamento automático
};

export default ForgotPassword;
