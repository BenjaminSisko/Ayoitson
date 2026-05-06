import { AyoButton, useAyoToast } from '@/components/ayo';

export default { title: 'Primitives / AyoToast' };

export const FireToasts = () => {
  const { toast, ToastViewport } = useAyoToast();
  return (
    <>
      <div className="flex gap-sp-3">
        <AyoButton onClick={() => toast({ title: 'Saved.', tone: 'success' })}>
          Success
        </AyoButton>
        <AyoButton
          variant="ghost"
          onClick={() => toast({ title: 'Heads up.', tone: 'info' })}
        >
          Info
        </AyoButton>
        <AyoButton
          variant="ghost"
          onClick={() =>
            toast({
              title: 'Slow scan.',
              description: 'Plex is slow.',
              tone: 'warn',
            })
          }
        >
          Warn
        </AyoButton>
        <AyoButton
          variant="accent"
          onClick={() =>
            toast({
              title: 'Plex unreachable.',
              description: 'Check the URI.',
              tone: 'error',
            })
          }
        >
          Error
        </AyoButton>
      </div>
      <ToastViewport />
    </>
  );
};
