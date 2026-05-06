import { FormEvent, useState } from 'react';
import { KeyRound, Plus, RotateCcw } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  AyoBadge,
  AyoButton,
  AyoCard,
  AyoEmptyState,
  AyoInput,
  AyoLabel,
} from '@/components/ayo';
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
    <div className="grid gap-sp-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <AyoCard>
        <AyoCard.Header>
          <div>
            <AyoCard.Title>API Keys</AyoCard.Title>
            <AyoCard.Description>
              Active and revoked browser/operator keys.
            </AyoCard.Description>
          </div>
        </AyoCard.Header>
        <AyoCard.Body>
          {keys.isLoading && <AyoBadge tone="neutral">Loading keys.</AyoBadge>}
          {keys.isError && (
            <AyoBadge tone="error">{errorText(keys.error)}</AyoBadge>
          )}
          {keys.isSuccess && keys.data.length === 0 && (
            <AyoEmptyState
              title="No API keys yet."
              description="Mint one on the right to start using the API."
            />
          )}
          {keys.isSuccess && keys.data.length > 0 && (
            <div className="grid gap-sp-3">
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
        </AyoCard.Body>
      </AyoCard>

      <AyoCard>
        <AyoCard.Header>
          <AyoCard.Title>Create Key</AyoCard.Title>
        </AyoCard.Header>
        <AyoCard.Body>
          <form className="grid gap-sp-3" onSubmit={submit}>
            <AyoLabel htmlFor="api-key-name">Name</AyoLabel>
            <AyoInput
              id="api-key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <AyoButton
              type="submit"
              variant="primary"
              disabled={createKey.isPending}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create key
            </AyoButton>
          </form>
          <div className="mt-sp-4 grid gap-sp-3">
            {createKey.isError && (
              <AyoBadge tone="error">{errorText(createKey.error)}</AyoBadge>
            )}
            {rawKey && (
              <AyoBadge tone="success">
                <span className="font-mono">{rawKey}</span>
              </AyoBadge>
            )}
          </div>
        </AyoCard.Body>
      </AyoCard>
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
    <div className="flex flex-col gap-sp-3 rounded-2 border border-border-default bg-surface-page px-sp-4 py-sp-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-sp-2">
          <KeyRound className="h-4 w-4 text-ayo-on-air" aria-hidden="true" />
          <h3 className="truncate text-14 font-semibold">{apiKey.name}</h3>
        </div>
        <p className="mt-sp-1 font-mono text-12 text-text-muted">{apiKey.id}</p>
        <p className="mt-sp-1 text-12 text-text-muted">
          Last used: {formatDate(apiKey.lastUsedAt)}
        </p>
      </div>
      <AyoButton
        type="button"
        variant={apiKey.revokedAt ? 'secondary' : 'accent'}
        size="compact"
        onClick={onRevoke}
        disabled={disabled}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {apiKey.revokedAt ? 'Revoked' : 'Revoke'}
      </AyoButton>
    </div>
  );
}
