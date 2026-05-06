import { KeyRound, MonitorCog, Server } from 'lucide-react';

import {
  AyoTabs,
  AyoTabsContent,
  AyoTabsList,
  AyoTabsTrigger,
} from '@/components/ayo';

export default { title: 'Primitives / AyoTabs' };

export const Default = () => (
  <AyoTabs defaultValue="api">
    <AyoTabsList aria-label="Settings">
      <AyoTabsTrigger value="api">
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
    <AyoTabsContent value="api">API Keys panel.</AyoTabsContent>
    <AyoTabsContent value="plex">Plex panel.</AyoTabsContent>
    <AyoTabsContent value="ffmpeg">FFmpeg panel.</AyoTabsContent>
  </AyoTabs>
);
