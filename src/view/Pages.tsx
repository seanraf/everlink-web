import { useEffect, useState } from 'react';
import LandingPage from './LandingPage';
import EverlinkPages from './EverlinkPages';
import { useAuth } from '@crossmint/client-sdk-react-ui';

import Loader from './Loader';

export default function Pages({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const { user } = useAuth();

  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);
  const isUserAuthenticated = isAuthenticated || user?.id;

  if (!showContent) {
    return <Loader />;
  }

  return isUserAuthenticated ? <EverlinkPages /> : <LandingPage />;
}
