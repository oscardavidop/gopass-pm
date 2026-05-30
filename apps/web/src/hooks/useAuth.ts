import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import type { OAuthProvider } from '@/services/auth.service';

export function useLogin() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      navigate('/dashboard');
    },
    onError: () => toast.error('Invalid email or password'),
  });
}

export function useRegister() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      navigate('/dashboard');
      toast.success('Account created!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Registration failed');
    },
  });
}

export function useOAuthLogin() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ provider, code, redirectUri, state }: { provider: OAuthProvider; code: string; redirectUri: string; state?: string }) =>
      authService.oauthLogin(provider, { code, redirectUri, state }),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      navigate('/dashboard');
      toast.success('Signed in successfully');
    },
    onError: () => toast.error('Social login failed. Please try again.'),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
    onSuccess: () => toast.success('If the account exists, we sent reset instructions'),
    onError: () => toast.error('Unable to process request right now'),
  });
}

export function useResetPassword() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (payload: { token: string; newPassword: string }) => authService.resetPassword(payload),
    onSuccess: () => {
      toast.success('Password reset successful');
      navigate('/login');
    },
    onError: () => toast.error('Invalid or expired reset token'),
  });
}

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      navigate('/login');
    },
  });
}
