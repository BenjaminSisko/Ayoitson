import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Copy, Save } from 'lucide-react';
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

function ReadOnlyLocationField({
  id,
  label,
  value,
  disabled,
  onCopy,
}: {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="grid gap-sp-2">
      <AyoLabel htmlFor={id}>{label}</AyoLabel>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-sp-2">
        <div
          id={id}
          role="textbox"
          aria-readonly="true"
          tabIndex={0}
          className="min-h-9 w-full break-all rounded-2 border border-border-default bg-surface-1 px-sp-3 py-sp-2 font-mono text-13 text-text-primary"
        >
          {value}
        </div>
        <AyoButton
          type="button"
          variant="secondary"
          size="icon"
          title={`Copy ${label}`}
          aria-label={`Copy ${label}`}
          disabled={disabled}
          onClick={onCopy}
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
        </AyoButton>
      </div>
    </div>
  );
}

export function XmltvPane() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<XmltvSettings>({});
  const [copied, setCopied] = useState<string | null>(null);

  const settings = useQuery({
    queryKey: ['settings', 'xmltv'],
    queryFn: apiClient.getXmltvSettings,
  });

  const outputLocation = useQuery({
    queryKey: ['settings', 'xmltv', 'output-location'],
    queryFn: apiClient.getXmltvOutputLocation,
    retry: false,
  });

  const epgUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/api/guide/xmltv.xml';
    return new URL('/xmltv.xml', window.location.origin).toString();
  }, []);

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

  async function copyValue(label: string, value: string) {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
  }

  const outputFile =
    outputLocation.data?.file ||
    (outputLocation.isLoading
      ? 'Loading output path.'
      : 'Server-managed xmltv.xml');
  const providerXmltvUrl = outputLocation.data?.xmltvUrl || epgUrl;
  const providerM3uUrl = outputLocation.data?.m3uUrl;

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
            <div className="grid gap-sp-4">
              <ReadOnlyLocationField
                id="xmltv-output-path"
                label="EPG output path"
                value={outputFile}
                disabled={!outputLocation.data?.file}
                onCopy={() =>
                  outputLocation.data?.file &&
                  copyValue('output path', outputLocation.data.file)
                }
              />
              <ReadOnlyLocationField
                id="xmltv-api-url"
                label="Plex XMLTV URL"
                value={providerXmltvUrl}
                onCopy={() => copyValue('XMLTV URL', providerXmltvUrl)}
              />
              {providerM3uUrl && (
                <ReadOnlyLocationField
                  id="xmltv-m3u-url"
                  label="M3U playlist URL"
                  value={providerM3uUrl}
                  onCopy={() => copyValue('M3U URL', providerM3uUrl)}
                />
              )}
              {copied && <AyoBadge tone="success">Copied {copied}.</AyoBadge>}
            </div>

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
