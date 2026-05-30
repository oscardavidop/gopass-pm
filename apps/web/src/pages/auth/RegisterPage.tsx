import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, AtSign } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useRegister } from '@/hooks/useAuth';
import { SocialAuthButtons } from '@/components/shared/SocialAuthButtons';

const schema = z.object({
  firstName: z.string().min(2, 'Min 2 chars').max(50),
  lastName: z.string().min(2, 'Min 2 chars').max(50),
  username: z.string().min(3, 'Min 3 chars').max(30).regex(/^[a-z0-9_]+$/, 'Lowercase, numbers and _ only'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters').max(100),
});

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const { mutate: register, isPending } = useRegister();
  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <Card className="border-border/60 bg-card/90 backdrop-blur-md shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <p className="text-sm text-muted-foreground">Build your workspace in seconds, scale it for years.</p>
      </CardHeader>
      <CardContent>
        <SocialAuthButtons className="mb-4" />
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/70" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground tracking-wide">Or create with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit((data) => register(data))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First name"
              placeholder="John"
              icon={<User />}
              error={errors.firstName?.message}
              {...field('firstName')}
            />
            <Input
              label="Last name"
              placeholder="Doe"
              error={errors.lastName?.message}
              {...field('lastName')}
            />
          </div>
          <Input
            label="Username"
            placeholder="john_doe"
            icon={<AtSign />}
            error={errors.username?.message}
            {...field('username')}
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            icon={<Mail />}
            error={errors.email?.message}
            {...field('email')}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock />}
            error={errors.password?.message}
            {...field('password')}
          />
          <Button type="submit" className="w-full" loading={isPending}>
            Create account
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
