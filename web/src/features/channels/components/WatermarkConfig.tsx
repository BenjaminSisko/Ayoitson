import { ImagePlus } from 'lucide-react';

import {
  AyoBadge,
  AyoCheckbox,
  AyoInput,
  AyoLabel,
  AyoSelect,
} from '@/components/ayo';
import {
  ChannelDraft,
  ChannelWatermark,
  validateWatermark,
} from '@/features/channels/channel-model';

const POSITIONS: Array<ChannelWatermark['position']> = [
  'top-left',
  'top-right',
  'bottom-right',
  'bottom-left',
];

export function WatermarkConfig({
  channel,
  onChange,
}: {
  channel: ChannelDraft;
  onChange: (watermark: ChannelWatermark) => void;
}) {
  const watermark = channel.watermark;
  const error = validateWatermark(watermark);

  function patch(patchValue: Partial<ChannelWatermark>) {
    onChange({ ...watermark, ...patchValue });
  }

  return (
    <div className="grid gap-sp-4">
      <label className="flex w-fit items-center gap-sp-2 rounded-2 border border-border-default bg-surface-page px-sp-3 py-sp-2">
        <AyoCheckbox
          checked={watermark.enabled}
          onChange={(event) => patch({ enabled: event.target.checked })}
        />
        <span className="inline-flex items-center gap-sp-2 text-14 font-medium">
          <ImagePlus className="h-4 w-4 text-ayo-on-air" aria-hidden="true" />
          Watermark
        </span>
      </label>

      {watermark.enabled && (
        <div className="grid gap-sp-4 md:grid-cols-2">
          <div className="grid gap-sp-2 md:col-span-2">
            <AyoLabel htmlFor="watermark-url">Watermark URL</AyoLabel>
            <AyoInput
              id="watermark-url"
              type="url"
              value={watermark.url}
              invalid={Boolean(error)}
              onChange={(event) => patch({ url: event.target.value })}
              placeholder="https://"
            />
          </div>
          <div className="grid gap-sp-2">
            <AyoLabel htmlFor="watermark-position">Position</AyoLabel>
            <AyoSelect
              id="watermark-position"
              value={watermark.position}
              onChange={(event) =>
                patch({
                  position: event.target.value as ChannelWatermark['position'],
                })
              }
            >
              {POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </AyoSelect>
          </div>
          <NumberField
            id="watermark-width"
            label="Width"
            value={watermark.width}
            onChange={(value) => patch({ width: value })}
          />
          <NumberField
            id="watermark-horizontal"
            label="Horizontal margin"
            value={watermark.horizontalMargin}
            onChange={(value) => patch({ horizontalMargin: value })}
          />
          <NumberField
            id="watermark-vertical"
            label="Vertical margin"
            value={watermark.verticalMargin}
            onChange={(value) => patch({ verticalMargin: value })}
          />
          <NumberField
            id="watermark-duration"
            label="Duration"
            value={watermark.duration}
            onChange={(value) => patch({ duration: value })}
          />
          <label className="flex items-center gap-sp-2 rounded-2 border border-border-default bg-surface-page px-sp-3 py-sp-2">
            <AyoCheckbox
              checked={watermark.fixedSize}
              onChange={(event) => patch({ fixedSize: event.target.checked })}
            />
            <span className="text-14 font-medium">Fixed size</span>
          </label>
          <label className="flex items-center gap-sp-2 rounded-2 border border-border-default bg-surface-page px-sp-3 py-sp-2">
            <AyoCheckbox
              checked={watermark.animated}
              onChange={(event) => patch({ animated: event.target.checked })}
            />
            <span className="text-14 font-medium">Animated</span>
          </label>
        </div>
      )}

      {error && (
        <AyoBadge tone="error" role="alert">
          {error}
        </AyoBadge>
      )}
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-sp-2">
      <AyoLabel htmlFor={id}>{label}</AyoLabel>
      <AyoInput
        id={id}
        type="number"
        min="0"
        max="100"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
