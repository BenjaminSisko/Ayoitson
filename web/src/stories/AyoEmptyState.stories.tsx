import { Plus } from 'lucide-react';

import { AyoButton, AyoEmptyState } from '@/components/ayo';

export default { title: 'Primitives / AyoEmptyState' };

export const Default = () => (
  <AyoEmptyState
    title="No channels yet."
    description="Make one to start surfing."
    action={
      <AyoButton variant="primary">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add channel
      </AyoButton>
    }
  />
);

export const Minimal = () => <AyoEmptyState title="Quiet here." />;
