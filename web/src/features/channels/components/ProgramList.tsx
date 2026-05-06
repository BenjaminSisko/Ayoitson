import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  Library,
  Plus,
  Trash2,
} from 'lucide-react';

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

const WINDOW_SIZE = 80;

export function ProgramList({
  programs,
  onChange,
}: {
  programs: ChannelProgram[];
  onChange: (programs: ChannelProgram[]) => void;
}) {
  const [offlineTitle, setOfflineTitle] = useState('Offline block');
  const [offlineMinutes, setOfflineMinutes] = useState('30');
  const [windowStart, setWindowStart] = useState(0);
  const [showPlexBrowser, setShowPlexBrowser] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const windowEnd = Math.min(programs.length, windowStart + WINDOW_SIZE);
  const visiblePrograms = programs.slice(windowStart, windowEnd);
  const totalDuration = useMemo(
    () =>
      programs.reduce((total, program) => total + programDuration(program), 0),
    [programs]
  );
  const windowed = programs.length > WINDOW_SIZE;

  useEffect(() => {
    setWindowStart((current) => clampWindowStart(current, programs.length));
  }, [programs.length]);

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
    onChange(reorderPrograms(programs, index, target));
    setWindowStart((current) => keepIndexInWindow(target, current));
  }

  function dropProgram(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }
    onChange(reorderPrograms(programs, draggedIndex, targetIndex));
    setWindowStart((current) => keepIndexInWindow(targetIndex, current));
    setDraggedIndex(null);
  }

  function removeProgram(index: number) {
    onChange(programs.filter((_, candidate) => candidate !== index));
  }

  function pageWindow(direction: -1 | 1) {
    setWindowStart((current) =>
      clampWindowStart(current + direction * WINDOW_SIZE, programs.length)
    );
  }

  return (
    <div className="grid gap-sp-4">
      <div className="flex flex-wrap gap-sp-2">
        <AyoBadge tone="neutral">{programs.length} programs</AyoBadge>
        <AyoBadge tone="scheduled">{formatDuration(totalDuration)}</AyoBadge>
        {windowed && (
          <>
            <AyoBadge tone="neutral">
              Showing {windowStart + 1}-{windowEnd} of {programs.length}
            </AyoBadge>
            <AyoBadge tone="success">Windowed rendering</AyoBadge>
          </>
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
        <div className="grid gap-sp-3">
          {windowed && (
            <div className="flex flex-wrap items-center justify-between gap-sp-2 rounded-3 border border-border-default bg-surface-page p-sp-3">
              <p className="text-13 text-text-muted">
                Large lineups render in fixed windows so the editor stays
                responsive while you reorder.
              </p>
              <div className="flex flex-wrap gap-sp-2">
                <AyoButton
                  variant="ghost"
                  size="compact"
                  disabled={windowStart === 0}
                  onClick={() => pageWindow(-1)}
                >
                  <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
                  Previous window
                </AyoButton>
                <AyoButton
                  variant="ghost"
                  size="compact"
                  disabled={windowEnd >= programs.length}
                  onClick={() => pageWindow(1)}
                >
                  Next window
                  <ChevronsRight className="h-4 w-4" aria-hidden="true" />
                </AyoButton>
              </div>
            </div>
          )}
          <div className="grid max-h-[38rem] gap-sp-2 overflow-y-auto pr-sp-1">
            {visiblePrograms.map((program, visibleIndex) => {
              const index = windowStart + visibleIndex;
              return (
                <ProgramRow
                  key={programKey(program, index)}
                  index={index}
                  displayIndex={index + 1}
                  program={program}
                  dragging={draggedIndex === index}
                  disableUp={index === 0}
                  disableDown={index === programs.length - 1}
                  onDragStart={setDraggedIndex}
                  onDrop={dropProgram}
                  onDragCancel={() => setDraggedIndex(null)}
                  onMove={moveProgram}
                  onRemove={removeProgram}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgramRow({
  index,
  displayIndex,
  program,
  dragging,
  disableUp,
  disableDown,
  onDragStart,
  onDrop,
  onDragCancel,
  onMove,
  onRemove,
}: {
  index: number;
  displayIndex: number;
  program: ChannelProgram;
  dragging: boolean;
  disableUp: boolean;
  disableDown: boolean;
  onDragStart: (index: number) => void;
  onDrop: (index: number) => void;
  onDragCancel: () => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}) {
  const title = programTitle(program);
  return (
    <AyoCard
      as="article"
      draggable
      aria-label={`Program ${displayIndex}: ${title}`}
      className={[
        'bg-surface-page transition-colors',
        dragging ? 'border border-ayo-on-air shadow-tv-glow' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
        onDragStart(index);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(index);
      }}
      onDragEnd={onDragCancel}
    >
      <div className="grid gap-sp-3 p-sp-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
        <div className="grid h-12 w-12 place-items-center rounded-tv bg-surface-2 text-ayo-on-air">
          <GripVertical className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h4 className="truncate text-15 font-semibold text-text-primary">
            {title}
          </h4>
          <p className="mt-sp-1 flex flex-wrap gap-sp-2 text-12 text-text-muted">
            <span>#{displayIndex}</span>
            <span>{programSource(program)}</span>
            <span>{formatDuration(programDuration(program))}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-sp-2">
          <AyoButton
            size="icon"
            variant="ghost"
            aria-label={`Move ${title} up`}
            disabled={disableUp}
            onClick={() => onMove(index, -1)}
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </AyoButton>
          <AyoButton
            size="icon"
            variant="ghost"
            aria-label={`Move ${title} down`}
            disabled={disableDown}
            onClick={() => onMove(index, 1)}
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </AyoButton>
          <AyoButton
            size="icon"
            variant="accent"
            aria-label={`Remove ${title}`}
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

function reorderPrograms(
  programs: ChannelProgram[],
  fromIndex: number,
  toIndex: number
) {
  const next = [...programs];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function clampWindowStart(candidate: number, programCount: number) {
  if (programCount <= WINDOW_SIZE) return 0;
  const maxStart = Math.max(0, programCount - WINDOW_SIZE);
  return Math.min(Math.max(0, candidate), maxStart);
}

function keepIndexInWindow(index: number, currentStart: number) {
  if (index < currentStart) return index;
  if (index >= currentStart + WINDOW_SIZE) return index - WINDOW_SIZE + 1;
  return currentStart;
}

function programKey(program: ChannelProgram, index: number) {
  return String(program.key || program.ratingKey || program.title || index);
}
