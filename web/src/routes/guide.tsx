import { useMemo, useState } from 'react';
import { CalendarDays, Clock } from 'lucide-react';
import { useQueries, useQuery } from '@tanstack/react-query';

import { AyoBadge, AyoButton, AyoCard, AyoEmptyState } from '@/components/ayo';
import {
  apiClient,
  ApiClientError,
  ChannelSummary,
  GuideLineup,
} from '@/lib/api-client';
import { cn } from '@/lib/cn';

type GuideProgram = {
  id: string;
  title: string;
  start?: string;
  stop?: string;
  description?: string;
  raw: Record<string, unknown>;
};

const CURRENT_TIME_MARKER_CLASSES = [
  'left-0',
  'left-[16.666%]',
  'left-[33.333%]',
  'left-1/2',
  'left-[66.666%]',
  'left-[83.333%]',
  'left-full',
] as const;

function errorText(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return 'Guide request failed.';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function textField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return undefined;
}

function extractPrograms(lineup?: GuideLineup): GuideProgram[] {
  if (!lineup) return [];
  const nestedChannel = asRecord(lineup.channel);
  const candidates = [
    lineup.programs,
    lineup.lineup,
    lineup.items,
    nestedChannel?.programs,
  ];

  const programs = candidates.find(Array.isArray);
  if (!programs) return [];

  return programs
    .map<GuideProgram | null>((program, index) => {
      const record = asRecord(program);
      if (!record) return null;

      const title =
        textField(record, ['title', 'name', 'showTitle', 'episodeTitle']) ||
        'Untitled program';
      const start = textField(record, ['start', 'startTime', 'from']);
      const stop = textField(record, ['stop', 'end', 'endTime', 'to']);
      const description = textField(record, ['description', 'summary', 'plot']);

      const normalized: GuideProgram = {
        id: textField(record, ['id']) || `${title}-${index}`,
        title,
        raw: record,
      };
      if (start) normalized.start = start;
      if (stop) normalized.stop = stop;
      if (description) normalized.description = description;
      return normalized;
    })
    .filter((program): program is GuideProgram => Boolean(program));
}

function displayNumber(channel: ChannelSummary) {
  return typeof channel.number === 'number'
    ? String(channel.number)
    : 'Unknown';
}

function channelName(
  lineup: GuideLineup | undefined,
  fallback: ChannelSummary
) {
  if (lineup && typeof lineup.name === 'string' && lineup.name.trim()) {
    return lineup.name;
  }
  return `Channel ${displayNumber(fallback)}`;
}

function buildRange() {
  const from = new Date();
  from.setMinutes(0, 0, 0);
  const to = new Date(from);
  to.setHours(to.getHours() + 6);
  return {
    from,
    to,
    dateFrom: from.toISOString(),
    dateTo: to.toISOString(),
  };
}

function percentBetween(from: Date, to: Date, value: Date) {
  const start = from.getTime();
  const end = to.getTime();
  const current = value.getTime();
  if (current < start || current > end) return null;
  return ((current - start) / (end - start)) * 100;
}

function currentMarkerClass(percent: number) {
  const bucket = Math.min(
    CURRENT_TIME_MARKER_CLASSES.length - 1,
    Math.max(0, Math.round(percent / (100 / 6)))
  );
  return CURRENT_TIME_MARKER_CLASSES[bucket];
}

function programTone(program: GuideProgram, now: Date) {
  const start = program.start ? new Date(program.start).getTime() : null;
  const stop = program.stop ? new Date(program.stop).getTime() : null;
  const current = now.getTime();
  if (start && stop && current >= start && current <= stop) return 'live';
  if (start && current < start) return 'scheduled';
  return 'past';
}

function formatTime(value?: string) {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function GuideView() {
  const [selectedProgram, setSelectedProgram] = useState<GuideProgram | null>(
    null
  );
  const range = useMemo(buildRange, []);
  const now = useMemo(() => new Date(), []);
  const nowPercent = percentBetween(range.from, range.to, now);

  const channels = useQuery({
    queryKey: ['channels'],
    queryFn: apiClient.listChannels,
  });

  const channelNumbers = useMemo(
    () =>
      (channels.data || [])
        .filter((channel) => typeof channel.number === 'number')
        .sort((a, b) => (a.number ?? 0) - (b.number ?? 0)),
    [channels.data]
  );

  const guideQueries = useQueries({
    queries: channelNumbers.map((channel) => ({
      queryKey: ['guide', channel.number, range.dateFrom, range.dateTo],
      queryFn: () =>
        apiClient.getGuideChannel(
          channel.number ?? 0,
          range.dateFrom,
          range.dateTo
        ),
      enabled: typeof channel.number === 'number',
    })),
  });

  const anyGuideLoading = guideQueries.some((query) => query.isLoading);
  const firstGuideError = guideQueries.find((query) => query.isError)?.error;

  return (
    <div className="grid gap-sp-5">
      <div className="flex flex-col gap-sp-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-12 font-semibold uppercase text-ayo-on-air">
            Six-hour lineup
          </p>
          <h2 className="text-24 font-display text-text-primary">
            Guide Viewer
          </h2>
        </div>
        <AyoBadge tone="neutral" icon={<CalendarDays className="h-3 w-3" />}>
          {formatTime(range.dateFrom)} - {formatTime(range.dateTo)}
        </AyoBadge>
      </div>

      {channels.isLoading && (
        <AyoBadge tone="neutral">Loading channel list.</AyoBadge>
      )}
      {channels.isError && (
        <AyoBadge tone="error">{errorText(channels.error)}</AyoBadge>
      )}
      {channels.isSuccess && channelNumbers.length === 0 && (
        <AyoEmptyState
          title="No channels to schedule."
          description="Create channels before reading the guide."
        />
      )}
      {anyGuideLoading && (
        <AyoBadge tone="neutral">Loading guide lineups.</AyoBadge>
      )}
      {firstGuideError && (
        <AyoBadge tone="error">{errorText(firstGuideError)}</AyoBadge>
      )}

      {channelNumbers.length > 0 && (
        <div className="grid gap-sp-3">
          {channelNumbers.map((channel, index) => {
            const lineup = guideQueries[index]?.data;
            const programs = extractPrograms(lineup);
            return (
              <AyoCard key={channel.number} radius="tv">
                <AyoCard.Header className="sm:items-center">
                  <div>
                    <AyoCard.Title>
                      {channelName(lineup, channel)}
                    </AyoCard.Title>
                    <AyoCard.Description>
                      Channel {displayNumber(channel)}
                    </AyoCard.Description>
                  </div>
                  <AyoBadge tone="neutral">{programs.length} programs</AyoBadge>
                </AyoCard.Header>
                <AyoCard.Body>
                  {programs.length === 0 ? (
                    <p className="text-14 text-text-muted">
                      No guide programs returned for this window.
                    </p>
                  ) : (
                    <div className="relative overflow-x-auto pb-sp-1">
                      {nowPercent !== null && (
                        <div
                          className={cn(
                            'absolute bottom-0 top-0 z-10 w-[2px] bg-ayo-on-air',
                            currentMarkerClass(nowPercent)
                          )}
                          aria-hidden="true"
                        />
                      )}
                      <div className="grid min-w-[720px] grid-cols-6 gap-sp-2">
                        {programs.slice(0, 12).map((program) => (
                          <AyoButton
                            key={program.id}
                            className={cn(
                              'h-auto min-h-[88px] flex-col items-start justify-between whitespace-normal rounded-tv p-sp-3 text-left',
                              programTone(program, now) === 'live' &&
                                'border-ayo-on-air bg-ayo-on-air/10'
                            )}
                            variant="secondary"
                            onClick={() => setSelectedProgram(program)}
                          >
                            <span className="line-clamp-2 text-13 font-semibold">
                              {program.title}
                            </span>
                            <span className="flex items-center gap-sp-1 text-12 text-text-muted">
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              {formatTime(program.start)}
                            </span>
                          </AyoButton>
                        ))}
                      </div>
                    </div>
                  )}
                </AyoCard.Body>
              </AyoCard>
            );
          })}
        </div>
      )}

      {selectedProgram && (
        <section
          aria-label="Program details"
          className="rounded-3 border border-border-default bg-surface-1 p-sp-5 shadow-0"
        >
          <div className="flex flex-col gap-sp-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-18">{selectedProgram.title}</h3>
              <p className="mt-sp-1 text-13 text-text-muted">
                {formatTime(selectedProgram.start)} -{' '}
                {formatTime(selectedProgram.stop)}
              </p>
            </div>
            <AyoButton variant="ghost" onClick={() => setSelectedProgram(null)}>
              Close
            </AyoButton>
          </div>
          {selectedProgram.description && (
            <p className="mt-sp-3 text-14 text-text-muted">
              {selectedProgram.description}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export { extractPrograms };
