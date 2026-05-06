import { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import {
  AyoBadge,
  AyoButton,
  AyoCheckbox,
  AyoEmptyState,
  AyoInput,
  AyoLabel,
} from '@/components/ayo';
import {
  ChannelDraft,
  FillerCollection,
} from '@/features/channels/channel-model';
import { apiClient, FillerListSummary } from '@/lib/api-client';

export function FillerSelector({
  channel,
  onChange,
}: {
  channel: ChannelDraft;
  onChange: (
    fillerCollections: FillerCollection[],
    fillerRepeatCooldown: number
  ) => void;
}) {
  const fillers = useQuery({
    queryKey: ['filler-lists'],
    queryFn: apiClient.listFillerLists,
  });
  const selectedIds = useMemo(
    () => new Set(channel.fillerCollections.map((entry) => entry.id)),
    [channel.fillerCollections]
  );

  function toggle(summary: FillerListSummary, checked: boolean) {
    const id = fillerId(summary);
    if (!id) return;
    if (!checked) {
      onChange(
        channel.fillerCollections.filter((entry) => entry.id !== id),
        channel.fillerRepeatCooldown
      );
      return;
    }
    onChange(
      [
        ...channel.fillerCollections,
        {
          id,
          weight: 1,
          cooldown: 0,
        },
      ],
      channel.fillerRepeatCooldown
    );
  }

  function patchCollection(index: number, patch: Partial<FillerCollection>) {
    const next = channel.fillerCollections.map((entry, candidate) =>
      candidate === index ? { ...entry, ...patch } : entry
    );
    onChange(next, channel.fillerRepeatCooldown);
  }

  function removeCollection(index: number) {
    onChange(
      channel.fillerCollections.filter((_, candidate) => candidate !== index),
      channel.fillerRepeatCooldown
    );
  }

  return (
    <div className="grid gap-sp-4">
      <div className="grid gap-sp-2 sm:max-w-xs">
        <AyoLabel htmlFor="filler-repeat-cooldown">Repeat cooldown</AyoLabel>
        <AyoInput
          id="filler-repeat-cooldown"
          type="number"
          min="0"
          value={Math.round(channel.fillerRepeatCooldown / 60000)}
          onChange={(event) =>
            onChange(
              channel.fillerCollections,
              Number(event.target.value || 0) * 60000
            )
          }
        />
      </div>

      {fillers.isLoading && <AyoBadge tone="neutral">Loading fillers</AyoBadge>}
      {fillers.isSuccess && fillers.data.length === 0 && (
        <AyoEmptyState
          title="No filler lists."
          description="Create filler lists before assigning them here."
        />
      )}
      {fillers.isSuccess && fillers.data.length > 0 && (
        <div className="grid gap-sp-2">
          {fillers.data.map((summary) => {
            const id = fillerId(summary);
            if (!id) return null;
            const checked = selectedIds.has(id);
            return (
              <label
                key={id}
                className="flex items-center gap-sp-2 rounded-2 border border-border-default bg-surface-page px-sp-3 py-sp-2"
              >
                <AyoCheckbox
                  checked={checked}
                  onChange={(event) => toggle(summary, event.target.checked)}
                />
                <span className="text-14 font-medium">
                  {fillerName(summary)}
                </span>
                {checked && <Plus className="h-4 w-4" aria-hidden="true" />}
              </label>
            );
          })}
        </div>
      )}

      {channel.fillerCollections.length > 0 && (
        <div className="grid gap-sp-3">
          {channel.fillerCollections.map((collection, index) => (
            <div
              key={`${collection.id}-${index}`}
              className="grid gap-sp-3 rounded-3 border border-border-default bg-surface-page p-sp-3 md:grid-cols-[minmax(0,1fr)_120px_140px_auto] md:items-end"
            >
              <div className="grid gap-sp-2">
                <AyoLabel htmlFor={`filler-id-${index}`}>Filler ID</AyoLabel>
                <AyoInput
                  id={`filler-id-${index}`}
                  value={collection.id}
                  onChange={(event) =>
                    patchCollection(index, { id: event.target.value })
                  }
                />
              </div>
              <div className="grid gap-sp-2">
                <AyoLabel htmlFor={`filler-weight-${index}`}>Weight</AyoLabel>
                <AyoInput
                  id={`filler-weight-${index}`}
                  type="number"
                  min="1"
                  value={collection.weight}
                  onChange={(event) =>
                    patchCollection(index, {
                      weight: Number(event.target.value || 1),
                    })
                  }
                />
              </div>
              <div className="grid gap-sp-2">
                <AyoLabel htmlFor={`filler-cooldown-${index}`}>
                  Cooldown
                </AyoLabel>
                <AyoInput
                  id={`filler-cooldown-${index}`}
                  type="number"
                  min="0"
                  value={Math.round(collection.cooldown / 60000)}
                  onChange={(event) =>
                    patchCollection(index, {
                      cooldown: Number(event.target.value || 0) * 60000,
                    })
                  }
                />
              </div>
              <AyoButton
                variant="accent"
                size="icon"
                aria-label={`Remove filler ${collection.id}`}
                onClick={() => removeCollection(index)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </AyoButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fillerId(summary: FillerListSummary) {
  return typeof summary.id === 'string'
    ? summary.id
    : typeof summary._id === 'string'
      ? summary._id
      : '';
}

function fillerName(summary: FillerListSummary) {
  return typeof summary.name === 'string' && summary.name
    ? summary.name
    : fillerId(summary);
}
