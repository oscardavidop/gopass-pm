import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useResetPassword } from '@/hooks/useAuth';

const schema = z.object({
  newPassword: z.string().min(8, 'Minimum 8 characters').max(100),
  confirmPassword: z.string().min(8, 'Minimum 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

type FormData = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { mutate, isPending } = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <Card className="border-border/70 bg-card/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Create new password</CardTitle>
        <p className="text-sm text-muted-foreground">Use a strong password you have not used before.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => mutate({ token, newPassword: data.newPassword }))} className="space-y-4">
          <Input
            label="New password"
            type="password"
            placeholder="••••••••"
            icon={<Lock />}
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <Input
            label="Confirm password"
            type="password"
            placeholder="••••••••"
            icon={<Lock />}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button type="submit" className="w-full" isLoading={isPending} disabled={!token}>
            Reset password
          </Button>
        </form>

        {!token && (
          <p className="mt-4 text-sm text-destructive">Reset token missing. Request a new password reset link.</p>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Back to{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
