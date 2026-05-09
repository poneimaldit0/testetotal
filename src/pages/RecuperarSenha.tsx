import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePasswordRecovery } from '@/hooks/usePasswordRecovery';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Shield } from 'lucide-react';

const RecuperarSenha = () => {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { sendRecoveryOTP, verifyOtpAndResetPassword, validatePassword, loading, error } = usePasswordRecovery();
  const { toast } = useToast();
  const navigate = useNavigate();

  const validation = validatePassword(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await sendRecoveryOTP(email);
    
    if (result.success) {
      toast({
        title: 'Código enviado!',
        description: 'Verifique seu email e digite o código de 6 dígitos que você recebeu.',
      });
      setStep('otp');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validation.valid) {
      toast({
        title: 'Senha inválida',
        description: validation.errors[0],
        variant: 'destructive',
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: 'Senhas não coincidem',
        description: 'As senhas digitadas não são iguais.',
        variant: 'destructive',
      });
      return;
    }

    const result = await verifyOtpAndResetPassword(email, otp, password);

    if (result.success) {
      toast({
        title: 'Senha redefinida!',
        description: 'Sua senha foi atualizada com sucesso. Você pode fazer login agora.',
      });
      
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-2xl border-border/50">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            {step === 'email' ? (
              <Mail className="w-8 h-8 text-primary" />
            ) : (
              <Shield className="w-8 h-8 text-primary" />
            )}
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">
              {step === 'email' ? 'Recuperar Senha' : 'Digite o Código'}
            </CardTitle>
            <CardDescription className="mt-2">
              {step === 'email' 
                ? 'Digite seu email e enviaremos um código de verificação' 
                : 'Digite o código de 6 dígitos enviado para seu email'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? 'Enviando...' : 'Enviar Código'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Código enviado para: <strong>{email}</strong></span>
                </div>

                <Input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  disabled={loading}
                  className="h-11 text-center text-lg tracking-widest font-mono"
                  maxLength={6}
                />
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nova senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {password && (
                  <div className="space-y-1 text-xs">
                    {validation.errors.map((err, idx) => (
                      <div key={idx} className="text-destructive">• {err}</div>
                    ))}
                    {validation.valid && (
                      <div className="text-green-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Senha válida
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirmar senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {confirmPassword && (
                  <div className="text-xs">
                    {passwordsMatch ? (
                      <div className="text-green-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        As senhas coincidem
                      </div>
                    ) : (
                      <div className="text-destructive">• As senhas não coincidem</div>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90"
                disabled={loading || !validation.valid || !passwordsMatch || otp.length !== 6}
              >
                {loading ? 'Redefinindo...' : 'Redefinir Senha'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep('email')}
                disabled={loading}
              >
                Voltar e reenviar código
              </Button>
            </form>
          )}

          <div className="text-center pt-2">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para o login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecuperarSenha;
