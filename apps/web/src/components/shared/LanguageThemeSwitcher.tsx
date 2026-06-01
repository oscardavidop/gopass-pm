import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, Languages, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/hooks/useTheme';
import { usePreferencesStore } from '@/store/preferences.store';
import { cn } from '@/utils/cn';
import { getLocaleLabel, getSupportedLocales } from '@/i18n/locale';

interface Props {
  variant?: 'surface' | 'glass';
  showTheme?: boolean;
  showLanguage?: boolean;
  className?: string;
}

export function LanguageThemeSwitcher({
  variant = 'surface',
  showTheme = true,
  showLanguage = true,
  className = '',
}: Props) {
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const language = usePreferencesStore((s) => s.language);
  const setLanguage = usePreferencesStore((s) => s.setLanguage);
  const supportedLocales = getSupportedLocales();

  const baseClass = variant === 'glass'
    ? 'border-border/70 bg-card/90 backdrop-blur-xl shadow-sm'
    : 'border-border/70 bg-card/90 shadow-sm';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLanguage && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className={cn('inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent', baseClass)}
              aria-label={t('common.language', { defaultValue: 'Language' })}
              title={t('common.language', { defaultValue: 'Language' })}
            >
              <Languages className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{getLocaleLabel(language)}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-44 rounded-xl border border-border bg-popover p-1.5 shadow-xl animate-scale-in"
            >
              {supportedLocales.map((locale) => (
                <DropdownMenu.Item
                  key={locale}
                  className="flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent"
                  onSelect={() => setLanguage(locale)}
                >
                  <span>{getLocaleLabel(locale)}</span>
                  {language === locale ? <Check className="h-3 w-3 text-primary" /> : null}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}

      {showTheme && (
        <button
          type="button"
          onClick={toggleTheme}
          className={cn('inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent', baseClass)}
          aria-label={isDark ? t('theme.switchToLight', { defaultValue: 'Switch to light mode' }) : t('theme.switchToDark', { defaultValue: 'Switch to dark mode' })}
          title={isDark ? t('theme.switchToLight', { defaultValue: 'Switch to light mode' }) : t('theme.switchToDark', { defaultValue: 'Switch to dark mode' })}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}