import { FormEvent, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/ui/panel';
import { Status } from '@/components/ui/status';
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
    <Panel
      title="FFmpeg"
      description="Transcode process defaults used by the streaming engine."
    >
      {settings.isLoading && <Status>Loading FFmpeg settings.</Status>}
      {settings.isError && (
        <Status tone="error">{errorText(settings.error)}</Status>
      )}
      {settings.isSuccess && (
        <form className="grid max-w-3xl gap-4" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor="ffmpeg-path">FFmpeg path</Label>
            <Input
              id="ffmpeg-path"
              value={String(draft.ffmpegPath || '')}
              onChange={(event) =>
                setDraft({ ...draft, ffmpegPath: event.target.value })
              }
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="max-fps">Max FPS</Label>
              <Input
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
            <div className="grid gap-2">
              <Label htmlFor="max-frame-buffer">Max frame buffer</Label>
              <Input
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
          <Button type="submit" variant="primary" disabled={save.isPending}>
            <Save className="h-4 w-4" aria-hidden="true" />
            Save
          </Button>
          {save.isError && (
            <Status tone="error">{errorText(save.error)}</Status>
          )}
          {save.isSuccess && <Status tone="success">Saved.</Status>}
        </form>
      )}
    </Panel>
  );
}
