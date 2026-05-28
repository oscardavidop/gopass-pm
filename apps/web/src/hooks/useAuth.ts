import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';

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
