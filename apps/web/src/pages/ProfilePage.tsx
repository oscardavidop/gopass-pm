import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Mail, User, Shield, Key, Loader2, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/auth.store';
import { useUpdateProfile } from '@/hooks/useUsers';

const ROLE_VARIANT: Record<string, any> = {
  ADMIN: 'destructive', MANAGER: 'warning', USER: 'secondary',
};

interface FormValues {
  firstName: string;
  lastName: string;
  bio: string;
}

export function ProfilePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfile();

  const { register, handleSubmit, formState: { isDirty } } = useForm<FormValues>({
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName:  user?.lastName  ?? '',
      bio:       user?.bio       ?? '',
    },
  });

  const onSubmit = (data: FormValues) => {
    updateProfile.mutate(data);
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold">{t('profile.title', { defaultValue: 'Profile' })}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('profile.subtitle', { defaultValue: 'Manage your personal information and account.' })}</p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
        {/* Avatar card */}
        <motion.div variants={item}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-5">
                <div className="relative group">
                  <Avatar
                    firstName={user?.firstName ?? ''}
                    lastName={user?.lastName ?? ''}
                    size="2xl"
                    online
                  />
                  <button
                    type="button"
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title={t('profile.changeAvatarSoon', { defaultValue: 'Change avatar (coming soon)' })}
                  >
                    <Camera className="h-5 w-5 text-white" />
                  </button>
                </div>

                <div className="flex-1">
                  <h2 className="text-xl font-semibold">{user?.firstName} {user?.lastName}</h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Mail className="h-3.5 w-3.5" />
                    {user?.email}
                  </p>
                  <div className="flex items-center gap-2 mt-2.5">
                    <Badge variant={ROLE_VARIANT[user?.role ?? 'USER']}>
                      <Shield className="h-3 w-3 mr-1" />
                      {t(`role.${(user?.role ?? 'USER').toLowerCase()}`, { defaultValue: user?.role ?? 'USER' })}
                    </Badge>
                    <span className="text-xs text-muted-foreground">@{user?.username}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Personal info form */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('profile.personalInformation', { defaultValue: 'Personal information' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t('profile.firstName')}</label>
                    <input
                      {...register('firstName', { required: true })}
                      className="w-full px-3 py-2 text-sm bg-background/60 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t('profile.lastName')}</label>
                    <input
                      {...register('lastName', { required: true })}
                      className="w-full px-3 py-2 text-sm bg-background/60 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t('auth.email')}</label>
                  <input
                    disabled
                    value={user?.email}
                    className="w-full px-3 py-2 text-sm bg-secondary/40 border border-input rounded-lg text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t('profile.bio', { defaultValue: 'Bio' })}</label>
                  <textarea
                    {...register('bio')}
                    rows={3}
                    placeholder={t('profile.bioPlaceholder', { defaultValue: 'Tell your team a bit about yourself...' })}
                    className="w-full px-3 py-2 text-sm bg-background/60 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={updateProfile.isPending || !isDirty}
                  >
                    {updateProfile.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        {t('common.saving', { defaultValue: 'Saving...' })}
                      </>
                    ) : updateProfile.isSuccess ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        {t('common.saved', { defaultValue: 'Saved' })}
                      </>
                    ) : (
                      t('common.saveChanges', { defaultValue: 'Save changes' })
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security section */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Key className="h-4 w-4" />
                {t('profile.security', { defaultValue: 'Security' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t('auth.password')}</p>
                  <p className="text-xs text-muted-foreground">{t('profile.changePassword', { defaultValue: 'Change your account password' })}</p>
                </div>
                <Button variant="outline" size="sm" disabled title={t('common.comingSoon', { defaultValue: 'Coming soon' })}>
                  {t('profile.changePasswordAction', { defaultValue: 'Change password' })}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t('profile.activeSessions', { defaultValue: 'Active sessions' })}</p>
                  <p className="text-xs text-muted-foreground">{t('profile.manageDevices', { defaultValue: 'Manage devices logged in to your account' })}</p>
                </div>
                <Badge variant="secondary">{t('profile.activeCount', { defaultValue: '1 active' })}</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
