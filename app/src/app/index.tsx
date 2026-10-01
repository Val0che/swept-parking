import { Redirect } from 'expo-router';
import { HomeEmpty } from '../features/home/HomeEmpty';
import { HomeParked } from '../features/home/HomeParked';
import { useSwept } from '../state/store';

/** Home: onboarding first, then parked (screen 7) or not parked (screen 4). */
export default function Home() {
  const onboarded = useSwept((st) => st.onboarded);
  const spot = useSwept((st) => st.spot);

  if (!onboarded) return <Redirect href="/welcome" />;
  return spot ? <HomeParked spot={spot} /> : <HomeEmpty />;
}
