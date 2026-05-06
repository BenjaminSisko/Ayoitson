import { FormEvent, useState } from 'react';
import { KeyRound, LogIn } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

import {
  AyoButton,
  AyoCard,
  AyoInput,
  AyoLabel,
  AyoLogo,
  AyoBadge,
} from '@/components/ayo';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

function errorText(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return 'Unable to complete setup.';
}

export function SetupView() {
  const setApiKey = useAuthStore((state) => state.setApiKey);
  const [existingKey, setExistingKey] = useState('');
  const [name, setName] = useState('master');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const setup = useMutation({
    mutationFn: () => apiClient.setupInitialKey(name),
    onSuccess: (result) => {
      setCreatedKey(result.rawKey);
      setApiKey(result.rawKey);
    },
  });

  function submitExisting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (existingKey.trim()) {
      setApiKey(existingKey.trim());
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-sp-4 py-sp-7">
      <AyoCard className="w-full">
        <AyoCard.Header>
          <div className="flex items-center gap-sp-3">
            <AyoLogo size="sm" variant="icon-only" />
            <div>
              <AyoCard.Title as="h2">Connect to Ayoitson</AyoCard.Title>
              <AyoCard.Description>
                Set the browser API key for this workstation.
              </AyoCard.Description>
            </div>
          </div>
        </AyoCard.Header>
        <AyoCard.Body>
          <div className="grid gap-sp-5">
            <form
              className="grid gap-sp-3"
              onSubmit={(event) => {
                event.preventDefault();
                setup.mutate();
              }}
            >
              <AyoLabel htmlFor="setup-key-name">Initial key name</AyoLabel>
              <div className="flex flex-col gap-sp-2 sm:flex-row">
                <AyoInput
                  id="setup-key-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <AyoButton
                  type="submit"
                  variant="primary"
                  disabled={setup.isPending}
                >
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  Create
                </AyoButton>
              </div>
            </form>

            <form className="grid gap-sp-3" onSubmit={submitExisting}>
              <AyoLabel htmlFor="existing-key">Existing API key</AyoLabel>
              <div className="flex flex-col gap-sp-2 sm:flex-row">
                <AyoInput
                  id="existing-key"
                  type="password"
                  value={existingKey}
                  onChange={(event) => setExistingKey(event.target.value)}
                />
                <AyoButton type="submit">
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Use key
                </AyoButton>
              </div>
            </form>

            {setup.isError && (
              <AyoBadge tone="error">{errorText(setup.error)}</AyoBadge>
            )}
            {createdKey && (
              <AyoBadge tone="success">
                <span className="font-mono">{createdKey}</span>
              </AyoBadge>
            )}
          </div>
        </AyoCard.Body>
      </AyoCard>
    </main>
  );
}
