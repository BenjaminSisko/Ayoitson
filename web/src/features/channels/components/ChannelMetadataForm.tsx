import type { ReactNode } from 'react';
import { Hash, Image, Tag, Tv, type LucideIcon } from 'lucide-react';

import { AyoInput, AyoLabel } from '@/components/ayo';
import { ChannelDraft } from '@/features/channels/channel-model';

export function ChannelMetadataForm({
  channel,
  onChange,
}: {
  channel: ChannelDraft;
  onChange: (patch: Partial<ChannelDraft>) => void;
}) {
  return (
    <div className="grid gap-sp-4 md:grid-cols-2">
      <Field label="Channel number" htmlFor="channel-number" icon={Hash}>
        <AyoInput
          id="channel-number"
          type="number"
          min="1"
          value={channel.number}
          onChange={(event) => onChange({ number: Number(event.target.value) })}
        />
      </Field>
      <Field label="Channel name" htmlFor="channel-name" icon={Tv}>
        <AyoInput
          id="channel-name"
          value={channel.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </Field>
      <Field label="Group" htmlFor="channel-group" icon={Tag}>
        <AyoInput
          id="channel-group"
          value={channel.groupTitle}
          onChange={(event) => onChange({ groupTitle: event.target.value })}
        />
      </Field>
      <Field label="Icon URL" htmlFor="channel-icon" icon={Image}>
        <AyoInput
          id="channel-icon"
          value={channel.icon}
          onChange={(event) => onChange({ icon: event.target.value })}
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  icon: Icon,
  children,
}: {
  label: string;
  htmlFor: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-sp-2">
      <AyoLabel htmlFor={htmlFor} className="inline-flex items-center gap-sp-2">
        <Icon className="h-4 w-4 text-ayo-on-air" aria-hidden="true" />
        {label}
      </AyoLabel>
      {children}
    </div>
  );
}
