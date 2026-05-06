import { useMemo, useState } from 'react';
import { Dice5, Wand2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

import { AyoBadge, AyoButton, AyoLabel } from '@/components/ayo';
import { ChannelProgram } from '@/features/channels/channel-model';
import { apiClient, ApiClientError } from '@/lib/api-client';

export function ScheduleEditor({
  programs,
  schedule,
  onProgramsChange,
  onScheduleChange,
}: {
  programs: ChannelProgram[];
  schedule: Record<string, unknown>;
  onProgramsChange: (programs: ChannelProgram[]) => void;
  onScheduleChange: (schedule: Record<string, unknown>) => void;
}) {
  const [scheduleText, setScheduleText] = useState(() =>
    JSON.stringify(schedule || {}, null, 2)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const programRecords = useMemo(
    () => programs as Array<Record<string, unknown>>,
    [programs]
  );

  const timeSlots = useMutation({
    mutationFn: (parsedSchedule: Record<string, unknown>) =>
      apiClient.applyTimeSlots(programRecords, parsedSchedule),
    onSuccess: (result) => applyResult(result),
    onError: (error) => setFormError(errorText(error)),
  });
  const randomSlots = useMutation({
    mutationFn: (parsedSchedule: Record<string, unknown>) =>
      apiClient.applyRandomSlots(programRecords, parsedSchedule),
    onSuccess: (result) => applyResult(result),
    onError: (error) => setFormError(errorText(error)),
  });

  function applySchedule(mode: 'time' | 'random') {
    setFormError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(scheduleText) as Record<string, unknown>;
    } catch {
      setFormError('Schedule must be valid JSON.');
      return;
    }
    onScheduleChange(parsed);
    if (mode === 'time') {
      timeSlots.mutate(parsed);
      return;
    }
    randomSlots.mutate(parsed);
  }

  function applyResult(result: {
    programs?: Array<Record<string, unknown>>;
    schedule?: Record<string, unknown>;
  }) {
    if (Array.isArray(result.programs)) {
      onProgramsChange(result.programs as ChannelProgram[]);
    }
    if (result.schedule) {
      onScheduleChange(result.schedule);
      setScheduleText(JSON.stringify(result.schedule, null, 2));
    }
  }

  return (
    <div className="grid gap-sp-4">
      <div className="flex flex-wrap gap-sp-2">
        <AyoBadge tone="neutral">{programs.length} source programs</AyoBadge>
        {(timeSlots.isPending || randomSlots.isPending) && (
          <AyoBadge tone="scheduled">Applying</AyoBadge>
        )}
      </div>
      <div className="grid gap-sp-2">
        <AyoLabel htmlFor="schedule-json">Schedule JSON</AyoLabel>
        <textarea
          id="schedule-json"
          className="min-h-56 rounded-2 border border-border-default bg-surface-1 px-sp-3 py-sp-2 font-mono text-12 text-text-primary focus:outline-none focus:border-ayo-on-air focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[color:var(--ayo-focus-ring)] focus-visible:outline-offset-2"
          value={scheduleText}
          onChange={(event) => setScheduleText(event.target.value)}
        />
      </div>
      {formError && (
        <AyoBadge tone="error" role="alert">
          {formError}
        </AyoBadge>
      )}
      <div className="flex flex-wrap justify-end gap-sp-2">
        <AyoButton
          variant="secondary"
          disabled={timeSlots.isPending || randomSlots.isPending}
          onClick={() => applySchedule('time')}
        >
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          Time slots
        </AyoButton>
        <AyoButton
          variant="secondary"
          disabled={timeSlots.isPending || randomSlots.isPending}
          onClick={() => applySchedule('random')}
        >
          <Dice5 className="h-4 w-4" aria-hidden="true" />
          Random slots
        </AyoButton>
      </div>
    </div>
  );
}

function errorText(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return 'Schedule request failed.';
}
