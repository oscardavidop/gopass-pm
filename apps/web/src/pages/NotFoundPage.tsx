import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">{t('common.pageNotFound', { defaultValue: 'Page not found' })}</h2>
        <p className="text-muted-foreground mb-6">{t('common.pageNotFoundDesc', { defaultValue: "The page you're looking for doesn't exist." })}</p>
        <Button asChild>
          <Link to="/dashboard">{t('common.backToDashboard', { defaultValue: 'Back to dashboard' })}</Link>
        </Button>
      </div>
    </div>
  );
}
