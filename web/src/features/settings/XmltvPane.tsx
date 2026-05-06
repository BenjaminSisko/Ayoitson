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
import { apiClient, ApiClientError, XmltvSettings } from '@/lib/api-client';

function errorText(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return 'XMLTV settings request failed.';
}

function numberOrUndefined(value: string) {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function XmltvPane() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<XmltvSettings>({});

  const settings = useQuery({
    queryKey: ['settings', 'xmltv'],
    queryFn: apiClient.getXmltvSettings,
  });

  useEffect(() => {
    if (settings.data) {
      setDraft(settings.data);
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () => apiClient.updateXmltvSettings(draft),
    onSuccess: (result) => {
      setDraft(result);
      queryClient.invalidateQueries({ queryKey: ['settings', 'xmltv'] });
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
          <AyoCard.Title>XMLTV</AyoCard.Title>
          <AyoCard.Description>
            Guide refresh cadence and XMLTV cache behavior.
          </AyoCard.Description>
        </div>
      </AyoCard.Header>
      <AyoCard.Body>
        {settings.isLoading && (
          <AyoBadge tone="neutral">Loading XMLTV settings.</AyoBadge>
        )}
        {settings.isError && (
          <AyoBadge tone="error">{errorText(settings.error)}</AyoBadge>
        )}
        {settings.isSuccess && (
          <form className="grid max-w-3xl gap-sp-4" onSubmit={submit}>
            <div className="grid gap-sp-2 sm:grid-cols-2">
              <div className="grid gap-sp-2">
                <AyoLabel htmlFor="xmltv-refresh">Refresh hours</AyoLabel>
                <AyoInput
                  id="xmltv-refresh"
                  type="number"
                  min="1"
                  value={String(draft.refresh ?? '')}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      refresh: numberOrUndefined(event.target.value),
                    })
                  }
                />
              </div>
              <div className="grid gap-sp-2">
                <AyoLabel htmlFor="xmltv-cache">Cache days</AyoLabel>
                <AyoInput
                  id="xmltv-cache"
                  type="number"
                  min="0"
                  value={String(draft.cache ?? '')}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      cache: numberOrUndefined(event.target.value),
                    })
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-sp-2 text-14 text-text-primary">
              <AyoCheckbox
                checked={Boolean(draft.enableImageCache)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    enableImageCache: event.target.checked,
                  })
                }
              />
              Enable image cache
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
