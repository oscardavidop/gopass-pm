import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Link } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useForgotPassword } from '@/hooks/useAuth';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { mutate, isPending } = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <Card className="border-border/70 bg-card/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <p className="text-sm text-muted-foreground">Enter your email and we will send a secure reset link.</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => mutate(data.email))} className="space-y-4">
          <Input
            label="Work email"
            type="email"
            placeholder="you@company.com"
            icon={<Mail />}
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" className="w-full" isLoading={isPending}>
            Send reset link
          </Button>
        </form>

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
