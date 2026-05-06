import { FormEvent, useState } from 'react';
import { Plus, Server, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  AyoBadge,
  AyoButton,
  AyoCard,
  AyoCheckbox,
  AyoEmptyState,
  AyoInput,
  AyoLabel,
} from '@/components/ayo';
import {
  apiClient,
  ApiClientError,
  PlexServerCreate,
  PlexServerPublic,
} from '@/lib/api-client';

function errorText(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return 'Plex server request failed.';
}

const emptyServer: PlexServerCreate = {
  name: '',
  uri: '',
  accessToken: '',
  arGuide: false,
  arChannels: false,
};

export function PlexServersPane() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PlexServerCreate>(emptyServer);

  const servers = useQuery({
    queryKey: ['plex-servers'],
    queryFn: apiClient.listPlexServers,
  });

  const createServer = useMutation({
    mutationFn: () => apiClient.createPlexServer(form),
    onSuccess: () => {
      setForm(emptyServer);
      queryClient.invalidateQueries({ queryKey: ['plex-servers'] });
    },
  });

  const deleteServer = useMutation({
    mutationFn: (name: string) => apiClient.deletePlexServer(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plex-servers'] });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createServer.mutate();
  }

  return (
    <div className="grid gap-sp-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <AyoCard>
        <AyoCard.Header>
          <div>
            <AyoCard.Title>Plex Servers</AyoCard.Title>
            <AyoCard.Description>Configured Plex origins.</AyoCard.Description>
          </div>
        </AyoCard.Header>
        <AyoCard.Body>
          {servers.isLoading && (
            <AyoBadge tone="neutral">Loading Plex servers.</AyoBadge>
          )}
          {servers.isError && (
            <AyoBadge tone="error">{errorText(servers.error)}</AyoBadge>
          )}
          {servers.isSuccess && servers.data.length === 0 && (
            <AyoEmptyState
              title="No Plex servers yet."
              description="Add one on the right."
            />
          )}
          {servers.isSuccess && servers.data.length > 0 && (
            <div className="grid gap-sp-3">
              {servers.data.map((server) => (
                <PlexServerRow
                  key={server.name}
                  server={server}
                  onDelete={() => deleteServer.mutate(server.name || '')}
                  disabled={deleteServer.isPending}
                />
              ))}
            </div>
          )}
        </AyoCard.Body>
      </AyoCard>

      <AyoCard>
        <AyoCard.Header>
          <AyoCard.Title>Add Server</AyoCard.Title>
        </AyoCard.Header>
        <AyoCard.Body>
          <form className="grid gap-sp-3" onSubmit={submit}>
            <AyoLabel htmlFor="plex-name">Name</AyoLabel>
            <AyoInput
              id="plex-name"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
            <AyoLabel htmlFor="plex-uri">URI</AyoLabel>
            <AyoInput
              id="plex-uri"
              value={form.uri}
              onChange={(event) =>
                setForm({ ...form, uri: event.target.value })
              }
            />
            <AyoLabel htmlFor="plex-token">Access token</AyoLabel>
            <AyoInput
              id="plex-token"
              type="password"
              value={form.accessToken}
              onChange={(event) =>
                setForm({ ...form, accessToken: event.target.value })
              }
            />
            <label className="flex items-center gap-sp-2 text-14 text-text-primary">
              <AyoCheckbox
                checked={Boolean(form.arGuide)}
                onChange={(event) =>
                  setForm({ ...form, arGuide: event.target.checked })
                }
              />
              Auto refresh guide
            </label>
            <label className="flex items-center gap-sp-2 text-14 text-text-primary">
              <AyoCheckbox
                checked={Boolean(form.arChannels)}
                onChange={(event) =>
                  setForm({ ...form, arChannels: event.target.checked })
                }
              />
              Auto refresh channels
            </label>
            <AyoButton
              type="submit"
              variant="primary"
              disabled={createServer.isPending}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add server
            </AyoButton>
          </form>
          {createServer.isError && (
            <div className="mt-sp-4">
              <AyoBadge tone="error">{errorText(createServer.error)}</AyoBadge>
            </div>
          )}
        </AyoCard.Body>
      </AyoCard>
    </div>
  );
}

function PlexServerRow({
  server,
  onDelete,
  disabled,
}: {
  server: PlexServerPublic;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-sp-3 rounded-2 border border-border-default bg-surface-page px-sp-4 py-sp-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-sp-2">
          <Server className="h-4 w-4 text-ayo-on-air" aria-hidden="true" />
          <h3 className="truncate text-14 font-semibold">{server.name}</h3>
        </div>
        <p className="mt-sp-1 truncate font-mono text-12 text-text-muted">
          {server.uri}
        </p>
      </div>
      <AyoButton
        type="button"
        variant="accent"
        size="compact"
        onClick={onDelete}
        disabled={disabled}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Remove
      </AyoButton>
    </div>
  );
}
