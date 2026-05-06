import { AyoLogo } from '@/components/ayo';

export default { title: 'Primitives / AyoLogo' };

export const Sizes = () => (
  <div className="flex items-end gap-sp-5">
    <AyoLogo size="sm" />
    <AyoLogo size="md" />
    <AyoLogo size="lg" />
    <AyoLogo size="xl" />
  </div>
);

export const IconOnly = () => (
  <div className="flex items-center gap-sp-5">
    <AyoLogo size="sm" variant="icon-only" />
    <AyoLogo size="md" variant="icon-only" />
    <AyoLogo size="lg" variant="icon-only" />
  </div>
);

export const ModeLight = () => <AyoLogo size="lg" mode="light" />;
export const ModeAuto = () => <AyoLogo size="lg" mode="auto" />;
