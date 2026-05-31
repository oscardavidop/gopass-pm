import { useForm } from 'react-hook-form';
import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Mail, User, Shield, Key, Loader2, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/auth.store';
import { useUpdateProfile } from '@/hooks/useUsers';
import { useUploadFile } from '@/hooks/useUploads';

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
  const setUser = useAuthStore((s) => s.setUser);
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadFile('USER', user?.id);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarProgress, setAvatarProgress] = useState(0);

  const avatarUploading = uploadAvatar.isPending;
  const avatarRingStyle = useMemo(() => {
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(100, Math.max(0, avatarProgress));
    const dashOffset = circumference - (progress / 100) * circumference;
    return { radius, circumference, dashOffset };
  }, [avatarProgress]);

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

  const handleAvatarFile = async (file?: File) => {
    if (!file || !user?.id) return;
    setAvatarProgress(0);
    const uploaded = await uploadAvatar.mutateAsync({
      file,
      kind: 'avatar',
      onProgress: setAvatarProgress,
    });

    if (user) {
      setUser({
        ...user,
        avatar: uploaded.signedUrl || uploaded.url,
      });
    }
    setAvatarProgress(100);
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      await handleAvatarFile(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <Avatar
                      src={user?.avatar}
                      firstName={user?.firstName ?? ''}
                      lastName={user?.lastName ?? ''}
                      size="2xl"
                      online
                    />
                    {avatarUploading && (
                      <>
                        <svg className="pointer-events-none absolute -inset-1 h-[72px] w-[72px] -rotate-90" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r={avatarRingStyle.radius} stroke="currentColor" strokeWidth="4" className="text-primary/30" fill="none" />
                          <circle
                            cx="40"
                            cy="40"
                            r={avatarRingStyle.radius}
                            stroke="currentColor"
                            strokeWidth="4"
                            className="text-primary transition-all"
                            fill="none"
                            strokeDasharray={avatarRingStyle.circumference}
                            strokeDashoffset={avatarRingStyle.dashOffset}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </span>
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-border/70 bg-card px-2 py-0.5 text-[10px] font-medium">
                          {avatarProgress}%
                        </span>
                      </>
                    )}
                    <span className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera className="h-4.5 w-4.5 text-white" />
                      <span className="mt-1 text-[10px] font-medium text-white">
                        {user?.avatar ? t('uploads.changePhoto', { defaultValue: 'Change Photo' }) : t('uploads.uploadPhoto', { defaultValue: 'Upload Photo' })}
                      </span>
                    </span>
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
