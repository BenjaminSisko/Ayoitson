import { AyoButton, AyoCard } from '@/components/ayo';

export default { title: 'Primitives / AyoCard' };

export const Default = () => (
  <AyoCard className="max-w-md">
    <AyoCard.Header>
      <div>
        <AyoCard.Title>Channel #5</AyoCard.Title>
        <AyoCard.Description>Drama / 24-hour rotation</AyoCard.Description>
      </div>
    </AyoCard.Header>
    <AyoCard.Body>
      Card body content. Padding sp-4 vertical, sp-5 horizontal.
    </AyoCard.Body>
    <AyoCard.Footer>
      <AyoButton variant="ghost">Cancel</AyoButton>
      <AyoButton variant="primary">Save</AyoButton>
    </AyoCard.Footer>
  </AyoCard>
);

export const TvRadius = () => (
  <AyoCard radius="tv" className="max-w-md">
    <AyoCard.Body>
      <p className="text-22 font-display">CRT-radius surface</p>
      <p className="text-14 text-text-muted">
        Channel cards override radius="tv" to echo the screen shape from the
        logo lockup.
      </p>
    </AyoCard.Body>
  </AyoCard>
);

export const Interactive = () => (
  <AyoCard interactive className="max-w-md">
    <AyoCard.Body>
      Hover me — elevation rises to shadow-1, snap easing.
    </AyoCard.Body>
  </AyoCard>
);
