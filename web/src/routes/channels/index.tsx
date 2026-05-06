import { FormEvent, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Search, Trash2, Tv } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  AyoBadge,
  AyoButton,
  AyoCard,
  AyoEmptyState,
  AyoInput,
  AyoLabel,
} from '@/components/ayo';
import {
  apiClient,
  ApiClientError,
  Channel,
  ChannelCreate,
  ChannelSummary,
} from '@/lib/api-client';

type Navigate = (path: string) => void;
type ChannelListItem = ChannelSummary & {
  name?: string;
  icon?: string;
  stealth?: boolean;
};

function errorText(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return 'Channel request failed.';
}

function displayName(channel: ChannelListItem | Channel) {
  return channel.name || `Channel ${channel.number ?? 'unknown'}`;
}

function displayNumber(channel: ChannelListItem | Channel) {
  return typeof channel.number === 'number'
    ? String(channel.number)
    : 'Unknown';
}

function sortChannels(channels: ChannelSummary[]) {
  return [...channels].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
}

export function ChannelListView({ onNavigate }: { onNavigate?: Navigate }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [channelNumber, setChannelNumber] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const channels = useQuery({
    queryKey: ['channels'],
    queryFn: apiClient.listChannels,
  });

  const createChannel = useMutation({
    mutationFn: (channel: ChannelCreate) => apiClient.createChannel(channel),
    onSuccess: (result) => {
      setCreateOpen(false);
      setChannelNumber('');
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      if (typeof result.number === 'number') {
        onNavigate?.(`/v2/channels/${result.number}`);
      }
    },
  });

  const deleteChannel = useMutation({
    mutationFn: (number: number) => apiClient.deleteChannel(number),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });

  const filteredChannels = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = sortChannels(channels.data || []) as ChannelListItem[];
    if (!query) return list;

    return list.filter((channel) => {
      const haystack = [
        displayNumber(channel),
        channel.name || '',
        channel.icon || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [channels.data, search]);

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number(channelNumber);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setFormError('Channel number must be a positive whole number.');
      return;
    }
    createChannel.mutate({ number: parsed });
  }

  function confirmDelete(number: number) {
    if (window.confirm(`Delete channel ${number}?`)) {
      deleteChannel.mutate(number);
    }
  }

  return (
    <div className="grid gap-sp-5">
      <div className="flex flex-col gap-sp-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid max-w-md flex-1 gap-sp-2">
          <AyoLabel htmlFor="channel-search">Search channels</AyoLabel>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-sp-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <AyoInput
              id="channel-search"
              className="pl-sp-7"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Channel number"
            />
          </div>
        </div>
        <AyoButton variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create channel
        </AyoButton>
      </div>

      <AyoCard>
        <AyoCard.Header>
          <div>
            <AyoCard.Title>Channels</AyoCard.Title>
            <AyoCard.Description>
              Linear channel inventory from the API.
            </AyoCard.Description>
          </div>
          {channels.isSuccess && (
            <AyoBadge tone="neutral">{channels.data.length} total</AyoBadge>
          )}
        </AyoCard.Header>
        <AyoCard.Body>
          {channels.isLoading && (
            <AyoBadge tone="neutral">Loading channels.</AyoBadge>
          )}
          {channels.isError && (
            <AyoBadge tone="error">{errorText(channels.error)}</AyoBadge>
          )}
          {channels.isSuccess && channels.data.length === 0 && (
            <AyoEmptyState
              title="No channels yet."
              description="Create the first channel from the toolbar."
              action={
                <AyoButton
                  variant="primary"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create channel
                </AyoButton>
              }
            />
          )}
          {channels.isSuccess &&
            channels.data.length > 0 &&
            filteredChannels.length === 0 && (
              <AyoEmptyState
                title="No matching channels."
                description="Clear the search to see the full lineup."
              />
            )}
          {filteredChannels.length > 0 && (
            <div className="grid gap-sp-2">
              {filteredChannels.map((channel) => (
                <ChannelRow
                  key={channel.number}
                  channel={channel}
                  onOpen={() =>
                    channel.number
                      ? onNavigate?.(`/v2/channels/${channel.number}`)
                      : undefined
                  }
                  onDelete={() =>
                    channel.number ? confirmDelete(channel.number) : undefined
                  }
                  disabled={deleteChannel.isPending}
                />
              ))}
            </div>
          )}
        </AyoCard.Body>
      </AyoCard>

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ayo-ink/45 px-sp-4"
          role="presentation"
        >
          <section
            aria-modal="true"
            className="w-full max-w-md rounded-3 bg-surface-1 p-sp-5 shadow-2"
            role="dialog"
            aria-labelledby="create-channel-title"
          >
            <h2 id="create-channel-title" className="text-18">
              Create Channel
            </h2>
            <form className="mt-sp-4 grid gap-sp-4" onSubmit={submitCreate}>
              <div className="grid gap-sp-2">
                <AyoLabel htmlFor="new-channel-number">Channel number</AyoLabel>
                <AyoInput
                  id="new-channel-number"
                  type="number"
                  min="1"
                  value={channelNumber}
                  invalid={Boolean(formError)}
                  onChange={(event) => {
                    setChannelNumber(event.target.value);
                    setFormError(null);
                  }}
                  autoFocus
                />
                {formError && (
                  <p className="text-12 text-[color:var(--status-error)]">
                    {formError}
                  </p>
                )}
              </div>
              {createChannel.isError && (
                <AyoBadge tone="error">
                  {errorText(createChannel.error)}
                </AyoBadge>
              )}
              <div className="flex justify-end gap-sp-2">
                <AyoButton
                  variant="ghost"
                  onClick={() => {
                    setCreateOpen(false);
                    setFormError(null);
                  }}
                >
                  Cancel
                </AyoButton>
                <AyoButton
                  type="submit"
                  variant="primary"
                  disabled={createChannel.isPending}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create
                </AyoButton>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export function ChannelDetailPlaceholder({
  number,
  onNavigate,
}: {
  number: number;
  onNavigate?: Navigate;
}) {
  const channel = useQuery({
    queryKey: ['channels', number, 'programless'],
    queryFn: () => apiClient.getChannel(number, { programless: true }),
  });

  return (
    <div className="grid gap-sp-5">
      <AyoButton
        className="w-fit"
        variant="ghost"
        onClick={() => onNavigate?.('/v2/channels')}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Channels
      </AyoButton>
      <AyoCard>
        <AyoCard.Header>
          <div>
            <AyoCard.Title>
              {channel.data ? displayName(channel.data) : `Channel ${number}`}
            </AyoCard.Title>
            <AyoCard.Description>
              Channel configuration moves into the next Lane Beta prompt.
            </AyoCard.Description>
          </div>
          <AyoBadge tone="neutral">#{number}</AyoBadge>
        </AyoCard.Header>
        <AyoCard.Body>
          {channel.isLoading && (
            <AyoBadge tone="neutral">Loading channel.</AyoBadge>
          )}
          {channel.isError && (
            <AyoBadge tone="error">{errorText(channel.error)}</AyoBadge>
          )}
          {channel.isSuccess && (
            <div className="grid gap-sp-3 text-14 text-text-muted">
              <p>
                This placeholder confirms route handoff for channel{' '}
                {displayNumber(channel.data)}.
              </p>
              {channel.data.icon && (
                <p className="font-mono text-12">{channel.data.icon}</p>
              )}
            </div>
          )}
        </AyoCard.Body>
      </AyoCard>
    </div>
  );
}

function ChannelRow({
  channel,
  onOpen,
  onDelete,
  disabled,
}: {
  channel: ChannelListItem;
  onOpen: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-sp-3 rounded-2 border border-border-default bg-surface-page px-sp-4 py-sp-3 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-sp-3 text-left focus:outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[color:var(--ayo-focus-ring)] focus-visible:outline-offset-2"
        onClick={onOpen}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tv bg-surface-2 text-ayo-on-air">
          <Tv className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-14 font-semibold text-text-primary">
            {displayName(channel)}
          </span>
          <span className="mt-sp-1 block truncate font-mono text-12 text-text-muted">
            Channel {displayNumber(channel)}
          </span>
        </span>
      </button>
      <AyoButton
        type="button"
        variant="accent"
        size="compact"
        onClick={onDelete}
        disabled={disabled}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Delete
      </AyoButton>
    </div>
  );
}
