import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Library, ListVideo, Settings } from 'lucide-react';

import { AyoButton, AyoLogo } from '@/components/ayo';
import { PlexLibraryBrowser } from '@/features/plex-browser/PlexLibraryBrowser';
import { SettingsView } from '@/features/settings/SettingsView';
import { ChannelDetailPlaceholder, ChannelListView } from '@/routes/channels';
import { GuideView } from '@/routes/guide';
import { cn } from '@/lib/cn';

type Route =
  | { name: 'settings'; title: 'Settings'; path: '/v2/settings' }
  | { name: 'channels'; title: 'Channels'; path: '/v2/channels' }
  | { name: 'channel-detail'; title: 'Channel'; path: string; number: number }
  | { name: 'guide'; title: 'Guide'; path: '/v2/guide' }
  | { name: 'library'; title: 'Plex Browser'; path: '/v2/library' };

const NAV_ITEMS = [
  {
    route: 'channels',
    label: 'Channels',
    path: '/v2/channels',
    icon: ListVideo,
  },
  {
    route: 'guide',
    label: 'Guide',
    path: '/v2/guide',
    icon: CalendarDays,
  },
  {
    route: 'library',
    label: 'Plex',
    path: '/v2/library',
    icon: Library,
  },
  {
    route: 'settings',
    label: 'Settings',
    path: '/v2/settings',
    icon: Settings,
  },
] as const;

function parseRoute(pathname: string): Route {
  const channelMatch = pathname.match(/^\/v2\/channels\/(\d+)$/);
  if (channelMatch) {
    const number = Number(channelMatch[1]);
    return {
      name: 'channel-detail',
      title: 'Channel',
      path: `/v2/channels/${number}`,
      number,
    };
  }

  if (pathname === '/v2/channels') {
    return { name: 'channels', title: 'Channels', path: '/v2/channels' };
  }

  if (pathname === '/v2/guide') {
    return { name: 'guide', title: 'Guide', path: '/v2/guide' };
  }

  if (pathname === '/v2/library') {
    return { name: 'library', title: 'Plex Browser', path: '/v2/library' };
  }

  return { name: 'settings', title: 'Settings', path: '/v2/settings' };
}

export function AppShell() {
  const [route, setRoute] = useState(() =>
    parseRoute(window.location.pathname)
  );
  const activeRoute = route.name === 'channel-detail' ? 'channels' : route.name;

  useEffect(() => {
    function syncRoute() {
      setRoute(parseRoute(window.location.pathname));
    }

    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  const navigate = useMemo(
    () => (path: string) => {
      window.history.pushState(null, '', path);
      setRoute(parseRoute(path));
    },
    []
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-sp-5 px-sp-4 py-sp-5 sm:px-sp-5 lg:px-sp-7">
      <header className="flex flex-col gap-sp-4 border-b border-border-subtle pb-sp-4">
        <div className="flex flex-col gap-sp-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-sp-3">
            <AyoLogo size="md" variant="icon-only" />
            <div>
              <p className="text-11 font-bold uppercase tracking-wide text-ayo-on-air">
                Ayoitson v2
              </p>
              <h1 className="mt-sp-1 text-display font-display">
                {route.title}
              </h1>
            </div>
          </div>
          <nav
            className="flex flex-wrap items-center gap-sp-2"
            aria-label="Primary"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeRoute === item.route;
              return (
                <AyoButton
                  key={item.route}
                  variant={active ? 'primary' : 'ghost'}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'min-w-[112px]',
                    active && 'pointer-events-none'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </AyoButton>
              );
            })}
          </nav>
        </div>
      </header>

      {route.name === 'settings' && <SettingsView />}
      {route.name === 'channels' && <ChannelListView onNavigate={navigate} />}
      {route.name === 'channel-detail' && (
        <ChannelDetailPlaceholder number={route.number} onNavigate={navigate} />
      )}
      {route.name === 'guide' && <GuideView />}
      {route.name === 'library' && <PlexLibraryBrowser />}
    </main>
  );
}
