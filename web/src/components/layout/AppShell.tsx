import { KeyRound, MonitorCog, Server } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiKeysPane } from '@/features/settings/ApiKeysPane';
import { FfmpegPane } from '@/features/settings/FfmpegPane';
import { PlexServersPane } from '@/features/settings/PlexServersPane';

export function AppShell() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--accent))]">
            Ayoitson v2
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal sm:text-3xl">
            Settings
          </h1>
        </div>
        <div className="text-sm text-muted-foreground">
          React shell mounted at <span className="font-mono">/v2</span>
        </div>
      </header>

      <Tabs defaultValue="api-keys">
        <TabsList aria-label="Settings panes">
          <TabsTrigger value="api-keys">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="plex">
            <Server className="h-4 w-4" aria-hidden="true" />
            Plex
          </TabsTrigger>
          <TabsTrigger value="ffmpeg">
            <MonitorCog className="h-4 w-4" aria-hidden="true" />
            FFmpeg
          </TabsTrigger>
        </TabsList>
        <TabsContent value="api-keys">
          <ApiKeysPane />
        </TabsContent>
        <TabsContent value="plex">
          <PlexServersPane />
        </TabsContent>
        <TabsContent value="ffmpeg">
          <FfmpegPane />
        </TabsContent>
      </Tabs>
    </main>
  );
}
