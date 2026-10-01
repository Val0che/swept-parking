import { router } from 'expo-router';
import { Linking } from 'react-native';
import { useLang } from '../../i18n/useLang';
import { usePermissions } from '../../permissions/usePermissions';
import { useSwept } from '../../state/store';
import type { BannerModel } from './Banner';

/** The single most important thing to fix, if any: side to confirm > permissions > automation invite. */
export function useBanner(): BannerModel | null {
  const { s } = useLang();
  const { state: perms } = usePermissions();
  const unconfirmed = useSwept((st) => !!st.spot?.unconfirmed);
  const carMode = useSwept((st) => st.carMode);
  const lastAutoAt = useSwept((st) => st.lastAutoAt);
  const dismissed = useSwept((st) => st.automationBannerDismissed);
  const dismiss = useSwept((st) => st.dismissAutomationBanner);

  if (unconfirmed) {
    return { key: 'side', icon: 'questionmark.circle.fill', tone: 'warning', text: s.banner.unconfirmed, cta: s.banner.choose, onPress: () => router.push('/pick') };
  }
  if (perms?.notifications && perms.notifications !== 'granted') {
    return { key: 'notif', icon: 'bell.slash.fill', tone: 'warning', text: s.banner.notifications, cta: s.banner.fix, onPress: () => void Linking.openSettings() };
  }
  if (carMode === 'bluetooth' && perms && perms.location !== 'always') {
    return { key: 'loc', icon: 'exclamationmark.circle.fill', tone: 'warning', text: s.banner.location, cta: s.banner.fix, onPress: () => void Linking.openSettings() };
  }
  if (carMode !== 'manual' && !lastAutoAt && !dismissed) {
    return {
      key: 'auto',
      icon: 'dot.radiowaves.left.and.right',
      tone: 'accent',
      text: s.banner.automation,
      cta: s.banner.setUp,
      onPress: () => router.push('/car'),
      onDismiss: dismiss,
    };
  }
  return null;
}
