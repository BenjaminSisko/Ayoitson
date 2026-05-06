import { AyoLiveIndicator } from '@/components/ayo';

export default { title: 'Primitives / AyoLiveIndicator' };

export const Default = () => <AyoLiveIndicator />;
export const CustomLabel = () => <AyoLiveIndicator label="Now playing" />;

export const Stack = () => (
  <div className="flex items-center gap-sp-3">
    <AyoLiveIndicator />
    <AyoLiveIndicator label="On Air" />
    <AyoLiveIndicator label="Live" />
  </div>
);
