import { FormEvent, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  AyoBadge,
  AyoButton,
  AyoCard,
  AyoInput,
  AyoLabel,
} from '@/components/ayo';
import { apiClient, ApiClientError, FfmpegSettings } from '@/lib/api-client';

function errorText(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return 'FFmpeg settings request failed.';
}

function numberOrUndefined(value: string) {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function FfmpegPane() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<FfmpegSettings>({});

  const settings = useQuery({
    queryKey: ['settings', 'ffmpeg'],
    queryFn: apiClient.getFfmpegSettings,
  });

  useEffect(() => {
    if (settings.data) {
      setDraft(settings.data);
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () => apiClient.updateFfmpegSettings(draft),
    onSuccess: (result) => {
      setDraft(result);
      queryClient.invalidateQueries({ queryKey: ['settings', 'ffmpeg'] });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate();
  }

  return (
    <AyoCard>
      <AyoCard.Header>
        <div>
          <AyoCard.Title>FFmpeg</AyoCard.Title>
          <AyoCard.Description>
            Transcode process defaults used by the streaming engine.
          </AyoCard.Description>
        </div>
      </AyoCard.Header>
      <AyoCard.Body>
        {settings.isLoading && (
          <AyoBadge tone="neutral">Loading FFmpeg settings.</AyoBadge>
        )}
        {settings.isError && (
          <AyoBadge tone="error">{errorText(settings.error)}</AyoBadge>
        )}
        {settings.isSuccess && (
          <form className="grid max-w-3xl gap-sp-4" onSubmit={submit}>
            <div className="grid gap-sp-2">
              <AyoLabel htmlFor="ffmpeg-path">FFmpeg path</AyoLabel>
              <AyoInput
                id="ffmpeg-path"
                value={String(draft.ffmpegPath || '')}
                onChange={(event) =>
                  setDraft({ ...draft, ffmpegPath: event.target.value })
                }
              />
            </div>
            <div className="grid gap-sp-2 sm:grid-cols-2">
              <div className="grid gap-sp-2">
                <AyoLabel htmlFor="max-fps">Max FPS</AyoLabel>
                <AyoInput
                  id="max-fps"
                  type="number"
                  value={String(draft.maxFPS ?? '')}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      maxFPS: numberOrUndefined(event.target.value),
                    })
                  }
                />
              </div>
              <div className="grid gap-sp-2">
                <AyoLabel htmlFor="max-frame-buffer">Max frame buffer</AyoLabel>
                <AyoInput
                  id="max-frame-buffer"
                  type="number"
                  value={String(draft.maxFrameBuffer ?? '')}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      maxFrameBuffer: numberOrUndefined(event.target.value),
                    })
                  }
                />
              </div>
            </div>
            <AyoButton
              type="submit"
              variant="primary"
              disabled={save.isPending}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save
            </AyoButton>
            {save.isError && (
              <AyoBadge tone="error">{errorText(save.error)}</AyoBadge>
            )}
            {save.isSuccess && <AyoBadge tone="success">Saved.</AyoBadge>}
          </form>
        )}
      </AyoCard.Body>
    </AyoCard>
  );
}
