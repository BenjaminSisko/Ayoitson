import { AyoBadge } from '@/components/ayo';

export default { title: 'Primitives / AyoBadge' };

export const AllTones = () => (
  <div className="flex flex-wrap gap-sp-3">
    <AyoBadge tone="neutral">Neutral</AyoBadge>
    <AyoBadge tone="live">Live</AyoBadge>
    <AyoBadge tone="scheduled">Scheduled</AyoBadge>
    <AyoBadge tone="past">Past</AyoBadge>
    <AyoBadge tone="error">Error</AyoBadge>
    <AyoBadge tone="warn">Warning</AyoBadge>
    <AyoBadge tone="success">Success</AyoBadge>
  </div>
);

export const NoIcon = () => (
  <div className="flex flex-wrap gap-sp-3">
    <AyoBadge tone="success" icon={null}>
      Saved
    </AyoBadge>
    <AyoBadge tone="warn" icon={null}>
      Stale
    </AyoBadge>
  </div>
);
