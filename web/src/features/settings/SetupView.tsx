import { FormEvent, useState } from 'react';
import { KeyRound, LogIn } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/ui/panel';
import { Status } from '@/components/ui/status';
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
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-8">
      <Panel
        title="Connect to Ayoitson"
        description="Set the browser API key for this workstation."
        className="w-full"
      >
        <div className="grid gap-5">
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setup.mutate();
            }}
          >
            <Label htmlFor="setup-key-name">Initial key name</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="setup-key-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={setup.isPending}
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Create
              </Button>
            </div>
          </form>

          <form className="grid gap-3" onSubmit={submitExisting}>
            <Label htmlFor="existing-key">Existing API key</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="existing-key"
                type="password"
                value={existingKey}
                onChange={(event) => setExistingKey(event.target.value)}
              />
              <Button type="submit">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Use key
              </Button>
            </div>
          </form>

          {setup.isError && (
            <Status tone="error">{errorText(setup.error)}</Status>
          )}
          {createdKey && (
            <Status tone="success">
              <span className="font-mono">{createdKey}</span>
            </Status>
          )}
        </div>
      </Panel>
    </main>
  );
}
