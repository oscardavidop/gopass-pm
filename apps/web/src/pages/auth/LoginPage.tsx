import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useLogin } from '@/hooks/useAuth';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { mutate: login, isPending } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <p className="text-sm text-muted-foreground">Welcome back to GoPass PM</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => login(data))} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            icon={<Mail />}
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock />}
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" className="w-full" loading={isPending}>
            Sign in
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Create one
          </Link>
        </div>

        <div className="mt-4 p-3 rounded-md bg-muted/50 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Demo accounts</p>
          <p>admin@gopass.dev / Admin123!</p>
          <p>manager@gopass.dev / Manager123!</p>
          <p>user@gopass.dev / User123!</p>
        </div>
      </CardContent>
    </Card>
  );
}
