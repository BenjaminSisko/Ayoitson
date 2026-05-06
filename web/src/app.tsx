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
    if (!apiKey && window.location.pathname !== '/login') {
      window.history.replaceState(null, '', '/login');
    } else if (apiKey && window.location.pathname === '/login') {
      window.history.replaceState(null, '', '/settings');
    }
  }, [apiKey]);

  return (
    <QueryClientProvider client={queryClient}>
      {apiKey ? <AppShell /> : <SetupView />}
    </QueryClientProvider>
  );
}
