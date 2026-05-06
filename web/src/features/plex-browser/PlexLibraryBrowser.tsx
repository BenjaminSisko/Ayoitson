import { Suspense, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Database, Server } from 'lucide-react';
import { useSuspenseQuery } from '@tanstack/react-query';

import {
  AyoBadge,
  AyoButton,
  AyoCard,
  AyoEmptyState,
  AyoLabel,
  AyoSelect,
} from '@/components/ayo';
import { apiClient, PlexServerPublic } from '@/lib/api-client';
import { cn } from '@/lib/cn';

export type PlexBrowserItem = {
  id: string;
  title: string;
  type: 'server' | 'folder' | 'placeholder';
  serverName: string;
  selectable?: boolean;
  disabled?: boolean;
  children?: PlexBrowserItem[];
};

export type PlexLibraryBrowserProps = {
  onPick?: (items: PlexBrowserItem[]) => void;
  framed?: boolean;
};

const TREE_INDENT_CLASSES = [
  'pl-0',
  'pl-sp-4',
  'pl-sp-6',
  'pl-sp-7',
  'pl-sp-8',
] as const;

export function PlexLibraryBrowser(props: PlexLibraryBrowserProps) {
  return (
    <Suspense
      fallback={<AyoBadge tone="neutral">Loading Plex servers.</AyoBadge>}
    >
      <PlexLibraryBrowserContent {...props} />
    </Suspense>
  );
}

function PlexLibraryBrowserContent({
  onPick,
  framed = true,
}: PlexLibraryBrowserProps) {
  const [selectedServerName, setSelectedServerName] = useState('');
  const [selectedItems, setSelectedItems] = useState<PlexBrowserItem[]>([]);
  const servers = useSuspenseQuery({
    queryKey: ['plex-servers'],
    queryFn: apiClient.listPlexServers,
  });

  const selectedServer =
    servers.data.find((server) => server.name === selectedServerName) ||
    servers.data[0];
  const tree = useMemo(
    () => (selectedServer ? buildLibraryTree(selectedServer) : []),
    [selectedServer]
  );

  function chooseServer(name: string) {
    setSelectedServerName(name);
    setSelectedItems([]);
  }

  function toggleItem(item: PlexBrowserItem) {
    if (!item.selectable || item.disabled) return;
    setSelectedItems((current) => {
      const exists = current.some((candidate) => candidate.id === item.id);
      if (exists) {
        return current.filter((candidate) => candidate.id !== item.id);
      }
      return [...current, item];
    });
  }

  if (servers.data.length === 0) {
    return (
      <AyoEmptyState
        title="No Plex servers yet."
        description="Add a Plex server in Settings before browsing libraries."
      />
    );
  }

  const content = (
    <>
      <div className="grid gap-sp-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="grid gap-sp-2">
          <AyoLabel htmlFor="plex-browser-server">Server</AyoLabel>
          <AyoSelect
            id="plex-browser-server"
            value={selectedServer?.name || ''}
            onChange={(event) => chooseServer(event.target.value)}
          >
            {servers.data.map((server) => (
              <option key={server.name} value={server.name}>
                {server.name}
              </option>
            ))}
          </AyoSelect>
          {selectedServer?.uri && (
            <p className="truncate font-mono text-12 text-text-muted">
              {selectedServer.uri}
            </p>
          )}
        </div>

        <div className="rounded-2 border border-border-default bg-surface-page p-sp-3">
          {tree.map((item) => (
            <TreeNode
              key={item.id}
              item={item}
              depth={0}
              selectedIds={selectedItems.map((selected) => selected.id)}
              onToggle={toggleItem}
            />
          ))}
        </div>
      </div>
      <div className="mt-sp-4 flex justify-end">
        <AyoButton
          variant="primary"
          disabled={selectedItems.length === 0}
          onClick={() => onPick?.(selectedItems)}
        >
          Use selection
        </AyoButton>
      </div>
    </>
  );

  if (!framed) {
    return (
      <div className="rounded-3 border border-border-default bg-surface-page p-sp-3">
        {content}
      </div>
    );
  }

  return (
    <AyoCard>
      <AyoCard.Header>
        <div>
          <AyoCard.Title>Plex Browser</AyoCard.Title>
          <AyoCard.Description>
            Select a registered server for channel configuration.
          </AyoCard.Description>
        </div>
        <AyoBadge tone="neutral">{selectedItems.length} selected</AyoBadge>
      </AyoCard.Header>
      <AyoCard.Body>{content}</AyoCard.Body>
    </AyoCard>
  );
}

function buildLibraryTree(server: PlexServerPublic): PlexBrowserItem[] {
  return [
    {
      id: `server:${server.name}`,
      title: server.name,
      type: 'server',
      serverName: server.name,
      selectable: true,
      children: [
        {
          id: `pending:${server.name}:libraries`,
          title: 'Library endpoint pending backend contract',
          type: 'placeholder',
          serverName: server.name,
          disabled: true,
        },
      ],
    },
  ];
}

function TreeNode({
  item,
  depth,
  selectedIds,
  onToggle,
}: {
  item: PlexBrowserItem;
  depth: number;
  selectedIds: string[];
  onToggle: (item: PlexBrowserItem) => void;
}) {
  const [isOpen, setOpen] = useState(true);
  const hasChildren = Boolean(item.children?.length);
  const selected = selectedIds.includes(item.id);

  return (
    <div>
      <div
        className={cn(
          'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-sp-1',
          TREE_INDENT_CLASSES[Math.min(depth, TREE_INDENT_CLASSES.length - 1)]
        )}
      >
        <AyoButton
          aria-label={isOpen ? 'Collapse branch' : 'Expand branch'}
          size="icon"
          variant="ghost"
          disabled={!hasChildren}
          onClick={() => setOpen((value) => !value)}
        >
          {hasChildren && isOpen ? (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          )}
        </AyoButton>
        <button
          type="button"
          className={cn(
            'flex min-w-0 items-center gap-sp-2 rounded-2 px-sp-3 py-sp-2 text-left text-14',
            'focus:outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[color:var(--ayo-focus-ring)] focus-visible:outline-offset-2',
            selected
              ? 'bg-ayo-ink text-ayo-cream'
              : 'text-text-primary hover:bg-surface-1',
            item.disabled && 'cursor-not-allowed text-text-muted'
          )}
          disabled={item.disabled}
          onClick={() => onToggle(item)}
        >
          {item.type === 'server' ? (
            <Server className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Database className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="truncate">{item.title}</span>
        </button>
      </div>
      {isOpen &&
        item.children?.map((child) => (
          <TreeNode
            key={child.id}
            item={child}
            depth={depth + 1}
            selectedIds={selectedIds}
            onToggle={onToggle}
          />
        ))}
    </div>
  );
}
