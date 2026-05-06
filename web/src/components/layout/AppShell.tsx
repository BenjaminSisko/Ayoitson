import { KeyRound, MonitorCog, Server } from 'lucide-react';

import {
  AyoLogo,
  AyoTabs,
  AyoTabsContent,
  AyoTabsList,
  AyoTabsTrigger,
} from '@/components/ayo';
import { ApiKeysPane } from '@/features/settings/ApiKeysPane';
import { FfmpegPane } from '@/features/settings/FfmpegPane';
import { PlexServersPane } from '@/features/settings/PlexServersPane';

export function AppShell() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-sp-5 px-sp-4 py-sp-5 sm:px-sp-5 lg:px-sp-7">
      <header className="flex flex-col gap-sp-3 border-b border-border-subtle pb-sp-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-sp-3">
          <AyoLogo size="md" variant="icon-only" />
          <div>
            <p className="text-11 font-bold uppercase tracking-wide text-ayo-on-air">
              Ayoitson v2
            </p>
            <h1 className="mt-sp-1 text-display font-display">Settings</h1>
          </div>
        </div>
        <div className="text-14 text-text-muted">
          React shell mounted at <span className="font-mono">/v2</span>
        </div>
      </header>

      <AyoTabs defaultValue="api-keys">
        <AyoTabsList aria-label="Settings panes">
          <AyoTabsTrigger value="api-keys">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            API Keys
          </AyoTabsTrigger>
          <AyoTabsTrigger value="plex">
            <Server className="h-4 w-4" aria-hidden="true" />
            Plex
          </AyoTabsTrigger>
          <AyoTabsTrigger value="ffmpeg">
            <MonitorCog className="h-4 w-4" aria-hidden="true" />
            FFmpeg
          </AyoTabsTrigger>
        </AyoTabsList>
        <AyoTabsContent value="api-keys">
          <ApiKeysPane />
        </AyoTabsContent>
        <AyoTabsContent value="plex">
          <PlexServersPane />
        </AyoTabsContent>
        <AyoTabsContent value="ffmpeg">
          <FfmpegPane />
        </AyoTabsContent>
      </AyoTabs>
    </main>
  );
}
