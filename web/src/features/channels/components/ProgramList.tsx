import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Film, Library, Plus, Trash2 } from 'lucide-react';

import {
  AyoBadge,
  AyoButton,
  AyoCard,
  AyoEmptyState,
  AyoInput,
  AyoLabel,
} from '@/components/ayo';
import { PlexLibraryBrowser } from '@/features/plex-browser/PlexLibraryBrowser';
import type { PlexBrowserItem } from '@/features/plex-browser/PlexLibraryBrowser';
import {
  ChannelProgram,
  createOfflineProgram,
  formatDuration,
  programDuration,
  programSource,
  programTitle,
} from '@/features/channels/channel-model';

const INITIAL_VISIBLE = 60;
const VISIBLE_STEP = 60;

export function ProgramList({
  programs,
  onChange,
}: {
  programs: ChannelProgram[];
  onChange: (programs: ChannelProgram[]) => void;
}) {
  const [offlineTitle, setOfflineTitle] = useState('Offline block');
  const [offlineMinutes, setOfflineMinutes] = useState('30');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [showPlexBrowser, setShowPlexBrowser] = useState(false);
  const visiblePrograms = programs.slice(0, visibleCount);
  const totalDuration = useMemo(
    () =>
      programs.reduce((total, program) => total + programDuration(program), 0),
    [programs]
  );

  function addOfflineProgram() {
    onChange([
      ...programs,
      createOfflineProgram(offlineTitle, Number(offlineMinutes)),
    ]);
  }

  function addPlexSelection(items: PlexBrowserItem[]) {
    onChange([...programs, ...items.map(plexItemToProgram)]);
    setShowPlexBrowser(false);
  }

  function moveProgram(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= programs.length) return;
    const next = [...programs];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  }

  function removeProgram(index: number) {
    onChange(programs.filter((_, candidate) => candidate !== index));
  }

  return (
    <div className="grid gap-sp-4">
      <div className="flex flex-wrap gap-sp-2">
        <AyoBadge tone="neutral">{programs.length} programs</AyoBadge>
        <AyoBadge tone="scheduled">{formatDuration(totalDuration)}</AyoBadge>
        {programs.length > visiblePrograms.length && (
          <AyoBadge tone="neutral">{visiblePrograms.length} rendered</AyoBadge>
        )}
      </div>

      <div className="grid gap-sp-3 rounded-3 border border-border-default bg-surface-page p-sp-3 md:grid-cols-[minmax(0,1fr)_140px_auto_auto] md:items-end">
        <div className="grid gap-sp-2">
          <AyoLabel htmlFor="offline-title">Offline title</AyoLabel>
          <AyoInput
            id="offline-title"
            value={offlineTitle}
            onChange={(event) => setOfflineTitle(event.target.value)}
          />
        </div>
        <div className="grid gap-sp-2">
          <AyoLabel htmlFor="offline-duration">Minutes</AyoLabel>
          <AyoInput
            id="offline-duration"
            type="number"
            min="1"
            value={offlineMinutes}
            onChange={(event) => setOfflineMinutes(event.target.value)}
          />
        </div>
        <AyoButton variant="secondary" onClick={addOfflineProgram}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Offline
        </AyoButton>
        <AyoButton
          variant="ghost"
          onClick={() => setShowPlexBrowser((value) => !value)}
        >
          <Library className="h-4 w-4" aria-hidden="true" />
          Plex
        </AyoButton>
      </div>

      {showPlexBrowser && (
        <PlexLibraryBrowser framed={false} onPick={addPlexSelection} />
      )}

      {programs.length === 0 ? (
        <AyoEmptyState
          title="No programs yet."
          description="Add an offline block or select from Plex."
        />
      ) : (
        <div className="grid max-h-[38rem] gap-sp-2 overflow-y-auto pr-sp-1">
          {visiblePrograms.map((program, index) => (
            <ProgramRow
              key={`${programTitle(program)}-${index}`}
              index={index}
              program={program}
              disableUp={index === 0}
              disableDown={index === programs.length - 1}
              onMove={moveProgram}
              onRemove={removeProgram}
            />
          ))}
          {programs.length > visiblePrograms.length && (
            <AyoButton
              variant="ghost"
              onClick={() =>
                setVisibleCount((count) =>
                  Math.min(programs.length, count + VISIBLE_STEP)
                )
              }
            >
              Show more
            </AyoButton>
          )}
        </div>
      )}
    </div>
  );
}

function ProgramRow({
  index,
  program,
  disableUp,
  disableDown,
  onMove,
  onRemove,
}: {
  index: number;
  program: ChannelProgram;
  disableUp: boolean;
  disableDown: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <AyoCard as="article" className="bg-surface-page">
      <div className="grid gap-sp-3 p-sp-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
        <div className="grid h-12 w-12 place-items-center rounded-tv bg-surface-2 text-ayo-on-air">
          <Film className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h4 className="truncate text-15 font-semibold text-text-primary">
            {programTitle(program)}
          </h4>
          <p className="mt-sp-1 flex flex-wrap gap-sp-2 text-12 text-text-muted">
            <span>{programSource(program)}</span>
            <span>{formatDuration(programDuration(program))}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-sp-2">
          <AyoButton
            size="icon"
            variant="ghost"
            aria-label={`Move ${programTitle(program)} up`}
            disabled={disableUp}
            onClick={() => onMove(index, -1)}
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </AyoButton>
          <AyoButton
            size="icon"
            variant="ghost"
            aria-label={`Move ${programTitle(program)} down`}
            disabled={disableDown}
            onClick={() => onMove(index, 1)}
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </AyoButton>
          <AyoButton
            size="icon"
            variant="accent"
            aria-label={`Remove ${programTitle(program)}`}
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </AyoButton>
        </div>
      </div>
    </AyoCard>
  );
}

function plexItemToProgram(item: PlexBrowserItem): ChannelProgram {
  return {
    title: item.title,
    duration: 30 * 60 * 1000,
    serverKey: item.serverName,
    source: 'plex',
    key: item.id,
  };
}
