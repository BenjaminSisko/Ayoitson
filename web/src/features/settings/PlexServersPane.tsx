import { FormEvent, useState } from 'react';
import { Plus, Server, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/ui/panel';
import { Status } from '@/components/ui/status';
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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Plex Servers" description="Configured Plex origins.">
        {servers.isLoading && <Status>Loading Plex servers.</Status>}
        {servers.isError && (
          <Status tone="error">{errorText(servers.error)}</Status>
        )}
        {servers.isSuccess && servers.data.length === 0 && (
          <Status>No Plex servers found.</Status>
        )}
        {servers.isSuccess && servers.data.length > 0 && (
          <div className="grid gap-3">
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
      </Panel>

      <Panel title="Add Server">
        <form className="grid gap-3" onSubmit={submit}>
          <Label htmlFor="plex-name">Name</Label>
          <Input
            id="plex-name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <Label htmlFor="plex-uri">URI</Label>
          <Input
            id="plex-uri"
            value={form.uri}
            onChange={(event) => setForm({ ...form, uri: event.target.value })}
          />
          <Label htmlFor="plex-token">Access token</Label>
          <Input
            id="plex-token"
            type="password"
            value={form.accessToken}
            onChange={(event) =>
              setForm({ ...form, accessToken: event.target.value })
            }
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(form.arGuide)}
              onChange={(event) =>
                setForm({ ...form, arGuide: event.target.checked })
              }
            />
            Auto refresh guide
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(form.arChannels)}
              onChange={(event) =>
                setForm({ ...form, arChannels: event.target.checked })
              }
            />
            Auto refresh channels
          </label>
          <Button
            type="submit"
            variant="primary"
            disabled={createServer.isPending}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add server
          </Button>
        </form>
        {createServer.isError && (
          <div className="mt-4">
            <Status tone="error">{errorText(createServer.error)}</Status>
          </div>
        )}
      </Panel>
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
    <div className="flex flex-col gap-3 rounded-md border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-[hsl(var(--primary))]" />
          <h3 className="truncate text-sm font-semibold">{server.name}</h3>
        </div>
        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
          {server.uri}
        </p>
      </div>
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={onDelete}
        disabled={disabled}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Remove
      </Button>
    </div>
  );
}
