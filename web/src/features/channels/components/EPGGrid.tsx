import { Clock3 } from 'lucide-react';

import { AyoBadge, AyoLiveIndicator } from '@/components/ayo';
import {
  ChannelProgram,
  formatDuration,
  programDuration,
  programTitle,
} from '@/features/channels/channel-model';
import { cn } from '@/lib/cn';

export function EPGGrid({
  programs,
  startTime,
  now = new Date(),
}: {
  programs: ChannelProgram[];
  startTime?: string;
  now?: Date;
}) {
  const currentIndex = findCurrentProgramIndex(programs, startTime, now);

  if (programs.length === 0) {
    return (
      <div className="rounded-tv border-2 border-ayo-ink bg-surface-1 p-sp-2">
        <div className="grid min-h-24 place-items-center rounded-3 bg-surface-page text-14 text-text-muted">
          No scheduled blocks
        </div>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-tv border-2 border-ayo-ink bg-surface-1 p-sp-2"
      aria-label="EPG grid"
    >
      <div className="flex min-w-max gap-sp-2">
        {programs.slice(0, 24).map((program, index) => {
          const isCurrent = index === currentIndex;
          return (
            <button
              key={`${programTitle(program)}-${index}`}
              type="button"
              aria-current={isCurrent ? 'time' : undefined}
              className={cn(
                'grid h-28 w-48 shrink-0 content-between rounded-3 border p-sp-3 text-left shadow-0 transition-shadow duration-fast ease-snap hover:shadow-tv-glow',
                isCurrent
                  ? 'border-ayo-on-air bg-ayo-on-air text-white'
                  : 'border-border-subtle bg-surface-page text-text-primary'
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-14 font-semibold">
                  {programTitle(program)}
                </span>
                <span
                  className={cn(
                    'mt-sp-1 flex items-center gap-sp-1 text-12',
                    isCurrent ? 'text-white' : 'text-text-muted'
                  )}
                >
                  <Clock3 className="h-3 w-3" aria-hidden="true" />
                  {formatDuration(programDuration(program))}
                </span>
              </span>
              {isCurrent ? (
                <AyoLiveIndicator label="On air" />
              ) : (
                <AyoBadge tone="neutral">Queued</AyoBadge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function findCurrentProgramIndex(
  programs: ChannelProgram[],
  startTime: string | undefined,
  now: Date
) {
  if (programs.length === 0) return -1;
  const start = startTime ? new Date(startTime).getTime() : NaN;
  if (!Number.isFinite(start)) return 0;
  const elapsed = now.getTime() - start;
  if (elapsed <= 0) return 0;
  const totalDuration = programs.reduce(
    (total, program) => total + programDuration(program),
    0
  );
  if (totalDuration <= 0) return 0;
  let cursor = elapsed % totalDuration;
  for (let index = 0; index < programs.length; index += 1) {
    cursor -= programDuration(programs[index]);
    if (cursor < 0) return index;
  }
  return 0;
}
