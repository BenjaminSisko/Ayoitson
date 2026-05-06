import { FileText, Gauge, KeyRound, MonitorCog, Server } from 'lucide-react';

import {
  AyoTabs,
  AyoTabsContent,
  AyoTabsList,
  AyoTabsTrigger,
} from '@/components/ayo';
import { ApiKeysPane } from '@/features/settings/ApiKeysPane';
import { FfmpegPane } from '@/features/settings/FfmpegPane';
import { HdhrPane } from '@/features/settings/HdhrPane';
import { PlexServersPane } from '@/features/settings/PlexServersPane';
import { XmltvPane } from '@/features/settings/XmltvPane';

export function SettingsView() {
  return (
    <AyoTabs defaultValue="api-keys">
      <AyoTabsList
        aria-label="Settings panes"
        className="flex w-full flex-wrap items-center"
      >
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
        <AyoTabsTrigger value="xmltv">
          <FileText className="h-4 w-4" aria-hidden="true" />
          XMLTV
        </AyoTabsTrigger>
        <AyoTabsTrigger value="hdhr">
          <Gauge className="h-4 w-4" aria-hidden="true" />
          HDHR
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
      <AyoTabsContent value="xmltv">
        <XmltvPane />
      </AyoTabsContent>
      <AyoTabsContent value="hdhr">
        <HdhrPane />
      </AyoTabsContent>
    </AyoTabs>
  );
}
