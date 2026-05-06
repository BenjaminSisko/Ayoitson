import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  CircleSlash,
  RotateCcw,
  Save,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  AyoBadge,
  AyoButton,
  AyoCard,
  AyoTabs,
  AyoTabsContent,
  AyoTabsList,
  AyoTabsTrigger,
} from '@/components/ayo';
import { ChannelMetadataForm } from '@/features/channels/components/ChannelMetadataForm';
import { EPGGrid } from '@/features/channels/components/EPGGrid';
import { FFmpegOverrides } from '@/features/channels/components/FFmpegOverrides';
import { FillerSelector } from '@/features/channels/components/FillerSelector';
import { OnDemandConfig } from '@/features/channels/components/OnDemandConfig';
import { ProgramList } from '@/features/channels/components/ProgramList';
import { ScheduleEditor } from '@/features/channels/components/ScheduleEditor';
import { WatermarkConfig } from '@/features/channels/components/WatermarkConfig';
import {
  ChannelDraft,
  normalizeChannel,
  sanitizeChannelForSave,
  validateChannel,
} from '@/features/channels/channel-model';
import { apiClient, ApiClientError } from '@/lib/api-client';

type Navigate = (path: string) => void;

const TAB_ITEMS = [
  { value: 'programs', label: 'Programs' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'filler', label: 'Filler' },
  { value: 'ffmpeg', label: 'FFmpeg' },
  { value: 'watermark', label: 'Watermark' },
  { value: 'on-demand', label: 'On-demand' },
] as const;

export function ChannelConfigPage({
  number,
  onNavigate,
}: {
  number: number;
  onNavigate?: Navigate;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ChannelDraft | null>(null);
  const [savedDraft, setSavedDraft] = useState<ChannelDraft | null>(null);

  const channel = useQuery({
    queryKey: ['channels', number],
    queryFn: () => apiClient.getChannel(number),
  });

  useEffect(() => {
    if (channel.data) {
      const normalized = normalizeChannel(channel.data, number);
      setDraft(normalized);
      setSavedDraft(normalized);
    }
  }, [channel.data, number]);

  const validationErrors = useMemo(
    () => (draft ? validateChannel(draft) : []),
    [draft]
  );
  const isDirty = useMemo(
    () =>
      Boolean(
        draft &&
        savedDraft &&
        JSON.stringify(sanitizeChannelForSave(draft)) !==
          JSON.stringify(sanitizeChannelForSave(savedDraft))
      ),
    [draft, savedDraft]
  );

  const saveChannel = useMutation({
    mutationFn: async (channelDraft: ChannelDraft) => {
      const payload = sanitizeChannelForSave(channelDraft);
      await apiClient.updateChannel(channelDraft.number, payload);
      return normalizeChannel(payload, channelDraft.number);
    },
    onSuccess: (normalized) => {
      setDraft(normalized);
      setSavedDraft(normalized);
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['guide'] });
    },
  });

  function patchDraft(patch: Partial<ChannelDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  if (channel.isLoading || !draft) {
    return <AyoBadge tone="neutral">Loading channel.</AyoBadge>;
  }

  if (channel.isError) {
    return <AyoBadge tone="error">{errorText(channel.error)}</AyoBadge>;
  }

  const saveDisabled =
    !isDirty || validationErrors.length > 0 || saveChannel.isPending;

  return (
    <div className="grid gap-sp-5 pb-24">
      <AyoButton
        className="w-fit"
        variant="ghost"
        onClick={() => onNavigate?.('/channels')}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Channels
      </AyoButton>

      <AyoCard radius="tv">
        <AyoCard.Header>
          <div>
            <AyoCard.Title>{draft.name}</AyoCard.Title>
            <AyoCard.Description>Channel {draft.number}</AyoCard.Description>
          </div>
          <div className="flex flex-wrap gap-sp-2">
            <AyoBadge tone={isDirty ? 'warn' : 'success'}>
              {isDirty ? 'Unsaved' : 'Saved'}
            </AyoBadge>
            <AyoBadge tone="neutral">{draft.programs.length} programs</AyoBadge>
          </div>
        </AyoCard.Header>
        <AyoCard.Body>
          <ChannelMetadataForm channel={draft} onChange={patchDraft} />
        </AyoCard.Body>
      </AyoCard>

      <EPGGrid programs={draft.programs} startTime={draft.startTime} />

      <AyoTabs defaultValue="programs">
        <AyoTabsList className="flex flex-wrap">
          {TAB_ITEMS.map((tab) => (
            <AyoTabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </AyoTabsTrigger>
          ))}
        </AyoTabsList>

        <AyoTabsContent value="programs">
          <AyoCard>
            <AyoCard.Header>
              <AyoCard.Title>Programs</AyoCard.Title>
              <AyoCard.Description>Lineup blocks.</AyoCard.Description>
            </AyoCard.Header>
            <AyoCard.Body>
              <ProgramList
                programs={draft.programs}
                onChange={(programs) =>
                  patchDraft({
                    programs,
                    duration: programs.reduce(
                      (total, program) => total + Number(program.duration || 0),
                      0
                    ),
                  })
                }
              />
            </AyoCard.Body>
          </AyoCard>
        </AyoTabsContent>

        <AyoTabsContent value="schedule">
          <AyoCard>
            <AyoCard.Header>
              <AyoCard.Title>Schedule</AyoCard.Title>
              <AyoCard.Description>Slot tools.</AyoCard.Description>
            </AyoCard.Header>
            <AyoCard.Body>
              <ScheduleEditor
                programs={draft.programs}
                schedule={readRecord(draft.schedule)}
                onProgramsChange={(programs) => patchDraft({ programs })}
                onScheduleChange={(schedule) => patchDraft({ schedule })}
              />
            </AyoCard.Body>
          </AyoCard>
        </AyoTabsContent>

        <AyoTabsContent value="filler">
          <AyoCard>
            <AyoCard.Header>
              <AyoCard.Title>Filler</AyoCard.Title>
              <AyoCard.Description>Flex blocks.</AyoCard.Description>
            </AyoCard.Header>
            <AyoCard.Body>
              <FillerSelector
                channel={draft}
                onChange={(fillerCollections, fillerRepeatCooldown) =>
                  patchDraft({ fillerCollections, fillerRepeatCooldown })
                }
              />
            </AyoCard.Body>
          </AyoCard>
        </AyoTabsContent>

        <AyoTabsContent value="ffmpeg">
          <AyoCard>
            <AyoCard.Header>
              <AyoCard.Title>FFmpeg</AyoCard.Title>
              <AyoCard.Description>Per-channel output.</AyoCard.Description>
            </AyoCard.Header>
            <AyoCard.Body>
              <FFmpegOverrides
                channel={draft}
                onChange={(transcoding) => patchDraft({ transcoding })}
              />
            </AyoCard.Body>
          </AyoCard>
        </AyoTabsContent>

        <AyoTabsContent value="watermark">
          <AyoCard>
            <AyoCard.Header>
              <AyoCard.Title>Watermark</AyoCard.Title>
              <AyoCard.Description>Channel overlay.</AyoCard.Description>
            </AyoCard.Header>
            <AyoCard.Body>
              <WatermarkConfig
                channel={draft}
                onChange={(watermark) => patchDraft({ watermark })}
              />
            </AyoCard.Body>
          </AyoCard>
        </AyoTabsContent>

        <AyoTabsContent value="on-demand">
          <AyoCard>
            <AyoCard.Header>
              <AyoCard.Title>On-demand</AyoCard.Title>
              <AyoCard.Description>Playback state.</AyoCard.Description>
            </AyoCard.Header>
            <AyoCard.Body>
              <OnDemandConfig
                channel={draft}
                onChange={(onDemand) => patchDraft({ onDemand })}
              />
            </AyoCard.Body>
          </AyoCard>
        </AyoTabsContent>
      </AyoTabs>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-surface-1/95 px-sp-4 py-sp-3 shadow-2 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-sp-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-sp-2">
            {validationErrors.length === 0 ? (
              <AyoBadge tone="success">
                <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                Valid
              </AyoBadge>
            ) : (
              <AyoBadge tone="error">
                <CircleSlash className="h-3 w-3" aria-hidden="true" />
                {validationErrors[0]}
              </AyoBadge>
            )}
            {saveChannel.isError && (
              <AyoBadge tone="error">{errorText(saveChannel.error)}</AyoBadge>
            )}
          </div>
          <div className="flex justify-end gap-sp-2">
            <AyoButton
              variant="ghost"
              disabled={!isDirty || saveChannel.isPending}
              onClick={() => savedDraft && setDraft(savedDraft)}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Cancel
            </AyoButton>
            <AyoButton
              variant="primary"
              disabled={saveDisabled}
              onClick={() => draft && saveChannel.mutate(draft)}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save
            </AyoButton>
          </div>
        </div>
      </footer>
    </div>
  );
}

function errorText(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return 'Channel request failed.';
}

function readRecord(value: unknown) {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}
