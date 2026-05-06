import { Cpu } from 'lucide-react';

import { AyoBadge, AyoInput, AyoLabel, AyoSelect } from '@/components/ayo';
import {
  ChannelDraft,
  ChannelTranscoding,
} from '@/features/channels/channel-model';

const RESOLUTION_OPTIONS = [
  '',
  '420x420',
  '480x270',
  '640x360',
  '720x480',
  '800x600',
  '1024x768',
  '1280x720',
  '1920x1080',
  '3840x2160',
];

export function FFmpegOverrides({
  channel,
  onChange,
}: {
  channel: ChannelDraft;
  onChange: (transcoding: ChannelTranscoding) => void;
}) {
  const transcoding = channel.transcoding;

  function patch(patchValue: Partial<ChannelTranscoding>) {
    onChange({ ...transcoding, ...patchValue });
  }

  return (
    <div className="grid gap-sp-4">
      <div className="flex flex-wrap items-center gap-sp-2">
        <Cpu className="h-4 w-4 text-ayo-on-air" aria-hidden="true" />
        <AyoBadge tone="neutral">Channel override</AyoBadge>
      </div>
      <div className="grid gap-sp-4 md:grid-cols-3">
        <div className="grid gap-sp-2">
          <AyoLabel htmlFor="channel-target-resolution">
            Target resolution
          </AyoLabel>
          <AyoSelect
            id="channel-target-resolution"
            value={transcoding.targetResolution || ''}
            onChange={(event) =>
              patch({ targetResolution: event.target.value })
            }
          >
            <option value="">Use global setting</option>
            {RESOLUTION_OPTIONS.filter(Boolean).map((resolution) => (
              <option key={resolution} value={resolution}>
                {resolution}
              </option>
            ))}
          </AyoSelect>
        </div>
        <div className="grid gap-sp-2">
          <AyoLabel htmlFor="channel-video-bitrate">Video bitrate</AyoLabel>
          <AyoInput
            id="channel-video-bitrate"
            type="number"
            min="0"
            value={transcoding.videoBitrate ?? ''}
            onChange={(event) =>
              patch({ videoBitrate: numberOrUndefined(event.target.value) })
            }
            placeholder="Use global"
          />
        </div>
        <div className="grid gap-sp-2">
          <AyoLabel htmlFor="channel-video-buffer">Video buffer</AyoLabel>
          <AyoInput
            id="channel-video-buffer"
            type="number"
            min="0"
            value={transcoding.videoBufSize ?? ''}
            onChange={(event) =>
              patch({ videoBufSize: numberOrUndefined(event.target.value) })
            }
            placeholder="Use global"
          />
        </div>
      </div>
    </div>
  );
}

function numberOrUndefined(value: string) {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
