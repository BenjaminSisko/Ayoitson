import { Pause, RotateCw } from 'lucide-react';

import { AyoCheckbox, AyoLabel, AyoSelect } from '@/components/ayo';
import {
  ChannelDraft,
  ChannelOnDemand,
} from '@/features/channels/channel-model';

const SEGMENT_OPTIONS = [
  { value: 1, label: '1 ms' },
  { value: 1000, label: '1 second' },
  { value: 60000, label: '1 minute' },
  { value: 300000, label: '5 minutes' },
  { value: 900000, label: '15 minutes' },
  { value: 1800000, label: '30 minutes' },
];

export function OnDemandConfig({
  channel,
  onChange,
}: {
  channel: ChannelDraft;
  onChange: (onDemand: ChannelOnDemand) => void;
}) {
  const onDemand = channel.onDemand;

  function patch(patchValue: Partial<ChannelOnDemand>) {
    onChange({ ...onDemand, ...patchValue });
  }

  return (
    <div className="grid gap-sp-4 md:grid-cols-2">
      <label className="flex items-center gap-sp-2 rounded-2 border border-border-default bg-surface-page px-sp-3 py-sp-2">
        <AyoCheckbox
          checked={onDemand.isOnDemand}
          onChange={(event) => patch({ isOnDemand: event.target.checked })}
        />
        <span className="inline-flex items-center gap-sp-2 text-14 font-medium">
          <RotateCw className="h-4 w-4 text-ayo-on-air" aria-hidden="true" />
          On-demand
        </span>
      </label>
      <label className="flex items-center gap-sp-2 rounded-2 border border-border-default bg-surface-page px-sp-3 py-sp-2">
        <AyoCheckbox
          checked={Boolean(onDemand.paused)}
          onChange={(event) => patch({ paused: event.target.checked })}
        />
        <span className="inline-flex items-center gap-sp-2 text-14 font-medium">
          <Pause className="h-4 w-4 text-ayo-on-air" aria-hidden="true" />
          Paused
        </span>
      </label>
      <div className="grid gap-sp-2 md:col-span-2">
        <AyoLabel htmlFor="on-demand-segment">Segment length</AyoLabel>
        <AyoSelect
          id="on-demand-segment"
          value={String(onDemand.modulo)}
          onChange={(event) => patch({ modulo: Number(event.target.value) })}
          disabled={!onDemand.isOnDemand}
        >
          {SEGMENT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </AyoSelect>
      </div>
    </div>
  );
}
