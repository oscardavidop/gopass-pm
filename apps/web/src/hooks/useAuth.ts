import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import type { OAuthProvider } from '@/services/auth.service';
import { translateByKey } from '@/i18n/translate';
import { classifyAuthError, getApiErrorMessage } from '@/services/api-error';

function resolveRedirectTarget(raw: string | null | undefined) {
  if (!raw) return '/dashboard';
  try {
    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith('/')) return '/dashboard';
    if (decoded.startsWith('//')) return '/dashboard';
    return decoded;
  } catch {
    return '/dashboard';
  }
}

export function useLogin() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.sessionId);
      const params = new URLSearchParams(location.search);
      const redirectTo = resolveRedirectTarget(params.get('redirectTo'));
      navigate(redirectTo, { replace: true });
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const i18nKey = err?.response?.data?.i18nKey;
      if (status === 403 && i18nKey === 'auth.emailNotVerified') {
        const email = err?.response?.data?.i18nParams?.email;
        navigate(`/verify-email${email ? `?email=${encodeURIComponent(email)}` : ''}`);
      }

      const authKind = classifyAuthError(err);
      if (authKind !== 'AUTH_INVALID_CREDENTIALS') {
        toast.error(getApiErrorMessage(err, 'auth.invalidCredentials', 'Invalid email or password'));
      }
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      navigate(`/verify-email?email=${encodeURIComponent(data.user.email)}`);
      toast.success(translateByKey('auth.verificationEmailSent', undefined, 'Verification email sent. Check your inbox.'));
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'auth.registerFailed', 'Registration failed'));
    },
  });
}

export function useOAuthLogin() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  return useMutation({
    mutationFn: ({ provider, code, redirectUri, state }: { provider: OAuthProvider; code: string; redirectUri: string; state?: string }) =>
      authService.oauthLogin(provider, { code, redirectUri, state }),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.sessionId);
      const params = new URLSearchParams(location.search);
      const redirectTo = resolveRedirectTarget(params.get('redirectTo'));
      navigate(redirectTo, { replace: true });
      toast.success(translateByKey('auth.loginSuccess', undefined, 'Signed in successfully'));
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'auth.oauth.failed', 'Social login failed. Please try again.')),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
    onSuccess: () => toast.success(translateByKey('auth.passwordResetRequested', undefined, 'If the account exists, we sent reset instructions')),
    onError: (err) => toast.error(getApiErrorMessage(err, 'common.retry', 'Unable to process request right now')),
  });
}

export function useResetPassword() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (payload: { token: string; newPassword: string }) => authService.resetPassword(payload),
    onSuccess: () => {
      toast.success(translateByKey('auth.passwordResetSuccess', undefined, 'Password reset successful'));
      navigate('/login');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'auth.invalidResetToken', 'Invalid or expired reset token')),
  });
}

export function useValidateResetPasswordToken(token: string) {
  return useQuery({
    queryKey: ['auth', 'reset-password', 'validate', token],
    queryFn: () => authService.validateResetPasswordToken(token),
    enabled: !!token,
    retry: false,
  });
}

export function useVerifyEmailToken(token: string) {
  return useMutation({
    mutationFn: () => authService.verifyEmail(token),
  });
}

export function useResendVerificationEmail() {
  return useMutation({
    mutationFn: (email: string) => authService.resendVerificationEmail(email),
    onSuccess: () => toast.success(translateByKey('auth.verificationEmailSent', undefined, 'Verification email sent')),
    onError: (err) => toast.error(getApiErrorMessage(err, 'common.retry', 'Unable to process request right now')),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) => authService.changePassword(payload),
    onSuccess: () => toast.success(translateByKey('auth.passwordChangeSuccess', undefined, 'Password updated successfully')),
    onError: (err) => toast.error(getApiErrorMessage(err, 'auth.invalidCredentials', 'Invalid credentials')),
  });
}

export function useSessions() {
  return useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: () => authService.listSessions(),
    staleTime: 30_000,
  });
}

export function useLogoutSession() {
  const { sessionId: currentSessionId, clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => authService.logoutSession(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      if (sessionId === currentSessionId) {
        clearAuth();
        queryClient.clear();
        window.location.href = '/login';
      }
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'common.internalError', 'Unexpected server error')),
  });
}

export function useLogoutAllSessions() {
  const { clearAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => authService.logoutAll(),
    onSuccess: () => {
      toast.success(translateByKey('auth.logoutAllSuccess', undefined, 'All sessions terminated'));
      clearAuth();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'common.internalError', 'Unexpected server error')),
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
