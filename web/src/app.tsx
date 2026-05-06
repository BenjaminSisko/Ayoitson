import { useEffect, useMemo } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { AppShell } from '@/components/layout/AppShell';
import { SetupView } from '@/features/settings/SetupView';
import { useAuthStore } from '@/lib/auth-store';
import { createQueryClient } from '@/lib/query';

export function App() {
  const apiKey = useAuthStore((state) => state.apiKey);
  const queryClient = useMemo(() => createQueryClient(), []);

  useEffect(() => {
    if (!apiKey && window.location.pathname !== '/v2/setup') {
      window.history.replaceState(null, '', '/v2/setup');
    } else if (apiKey && window.location.pathname === '/v2/setup') {
      window.history.replaceState(null, '', '/v2/settings');
    }
  }, [apiKey]);

  return (
    <QueryClientProvider client={queryClient}>
      {apiKey ? <AppShell /> : <SetupView />}
    </QueryClientProvider>
  );
}
