import { FormEvent, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  AyoBadge,
  AyoButton,
  AyoCard,
  AyoCheckbox,
  AyoInput,
  AyoLabel,
} from '@/components/ayo';
import { apiClient, ApiClientError, HdhrSettings } from '@/lib/api-client';

function errorText(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return 'HDHomeRun settings request failed.';
}

function numberOrUndefined(value: string) {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function HdhrPane() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<HdhrSettings>({});

  const settings = useQuery({
    queryKey: ['settings', 'hdhr'],
    queryFn: apiClient.getHdhrSettings,
  });

  useEffect(() => {
    if (settings.data) {
      setDraft(settings.data);
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () => apiClient.updateHdhrSettings(draft),
    onSuccess: (result) => {
      setDraft(result);
      queryClient.invalidateQueries({ queryKey: ['settings', 'hdhr'] });
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
          <AyoCard.Title>HDHomeRun</AyoCard.Title>
          <AyoCard.Description>
            Tuner capacity and network discovery settings.
          </AyoCard.Description>
        </div>
      </AyoCard.Header>
      <AyoCard.Body>
        {settings.isLoading && (
          <AyoBadge tone="neutral">Loading HDHomeRun settings.</AyoBadge>
        )}
        {settings.isError && (
          <AyoBadge tone="error">{errorText(settings.error)}</AyoBadge>
        )}
        {settings.isSuccess && (
          <form className="grid max-w-3xl gap-sp-4" onSubmit={submit}>
            <div className="grid gap-sp-2">
              <AyoLabel htmlFor="hdhr-tuner-count">Tuner count</AyoLabel>
              <AyoInput
                id="hdhr-tuner-count"
                type="number"
                min="1"
                value={String(draft.tunerCount ?? '')}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    tunerCount: numberOrUndefined(event.target.value),
                  })
                }
              />
            </div>
            <label className="flex items-center gap-sp-2 text-14 text-text-primary">
              <AyoCheckbox
                checked={Boolean(draft.autoDiscoveryEnabled)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    autoDiscoveryEnabled: event.target.checked,
                  })
                }
              />
              Auto discovery enabled
            </label>
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
