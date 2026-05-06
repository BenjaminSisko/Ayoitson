import { FormEvent, useState } from 'react';
import { KeyRound, Plus, RotateCcw } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/ui/panel';
import { Status } from '@/components/ui/status';
import { apiClient, ApiClientError, ApiKeyMetadata } from '@/lib/api-client';

function errorText(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return 'API key request failed.';
}

function formatDate(value: string | null) {
  if (!value) return 'never';
  return new Date(value).toLocaleString();
}

export function ApiKeysPane() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('operator');
  const [rawKey, setRawKey] = useState<string | null>(null);

  const keys = useQuery({
    queryKey: ['api-keys'],
    queryFn: apiClient.listApiKeys,
  });

  const createKey = useMutation({
    mutationFn: () => apiClient.createApiKey(name),
    onSuccess: (result) => {
      setRawKey(result.rawKey);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const revokeKey = useMutation({
    mutationFn: (id: string) => apiClient.revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createKey.mutate();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Panel
        title="API Keys"
        description="Active and revoked browser/operator keys."
      >
        {keys.isLoading && <Status>Loading keys.</Status>}
        {keys.isError && <Status tone="error">{errorText(keys.error)}</Status>}
        {keys.isSuccess && keys.data.length === 0 && (
          <Status>No API keys found.</Status>
        )}
        {keys.isSuccess && keys.data.length > 0 && (
          <div className="grid gap-3">
            {keys.data.map((key) => (
              <ApiKeyRow
                key={key.id}
                apiKey={key}
                onRevoke={() => revokeKey.mutate(key.id)}
                disabled={revokeKey.isPending || Boolean(key.revokedAt)}
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Create Key">
        <form className="grid gap-3" onSubmit={submit}>
          <Label htmlFor="api-key-name">Name</Label>
          <Input
            id="api-key-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={createKey.isPending}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create key
          </Button>
        </form>
        <div className="mt-4 grid gap-3">
          {createKey.isError && (
            <Status tone="error">{errorText(createKey.error)}</Status>
          )}
          {rawKey && (
            <Status tone="success">
              <span className="font-mono">{rawKey}</span>
            </Status>
          )}
        </div>
      </Panel>
    </div>
  );
}

function ApiKeyRow({
  apiKey,
  onRevoke,
  disabled,
}: {
  apiKey: ApiKeyMetadata;
  onRevoke: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[hsl(var(--primary))]" />
          <h3 className="truncate text-sm font-semibold">{apiKey.name}</h3>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {apiKey.id}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Last used: {formatDate(apiKey.lastUsedAt)}
        </p>
      </div>
      <Button
        type="button"
        variant={apiKey.revokedAt ? 'secondary' : 'danger'}
        size="sm"
        onClick={onRevoke}
        disabled={disabled}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {apiKey.revokedAt ? 'Revoked' : 'Revoke'}
      </Button>
    </div>
  );
}
