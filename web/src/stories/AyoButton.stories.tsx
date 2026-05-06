import { Plus, Save, Trash2 } from 'lucide-react';

import { AyoButton } from '@/components/ayo';

export default { title: 'Primitives / AyoButton' };

export const AllVariants = () => (
  <div className="flex flex-wrap gap-sp-3">
    <AyoButton variant="primary">Primary</AyoButton>
    <AyoButton variant="accent">Accent</AyoButton>
    <AyoButton variant="secondary">Secondary</AyoButton>
    <AyoButton variant="ghost">Ghost</AyoButton>
    <AyoButton variant="link">Link</AyoButton>
  </div>
);

export const Sizes = () => (
  <div className="flex items-center gap-sp-3">
    <AyoButton variant="primary" size="default">
      Default
    </AyoButton>
    <AyoButton variant="primary" size="compact">
      Compact
    </AyoButton>
    <AyoButton variant="primary" size="icon" aria-label="add">
      <Plus className="h-4 w-4" aria-hidden="true" />
    </AyoButton>
  </div>
);

export const WithIcons = () => (
  <div className="flex gap-sp-3">
    <AyoButton variant="primary">
      <Save className="h-4 w-4" aria-hidden="true" />
      Save
    </AyoButton>
    <AyoButton variant="accent">
      <Trash2 className="h-4 w-4" aria-hidden="true" />
      Stop broadcast
    </AyoButton>
  </div>
);

export const Disabled = () => (
  <div className="flex gap-sp-3">
    <AyoButton variant="primary" disabled>
      Primary
    </AyoButton>
    <AyoButton variant="accent" disabled>
      Accent
    </AyoButton>
    <AyoButton variant="secondary" disabled>
      Secondary
    </AyoButton>
  </div>
);
