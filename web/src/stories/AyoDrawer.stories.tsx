import { useState } from 'react';

import { AyoButton, AyoDrawer } from '@/components/ayo';

export default { title: 'Primitives / AyoDrawer' };

export const Default = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <AyoButton variant="primary" onClick={() => setOpen(true)}>
        Open drawer
      </AyoButton>
      <AyoDrawer
        open={open}
        onOpenChange={setOpen}
        title="Program detail"
        description="The drawer slides in from the right edge."
        footer={
          <>
            <AyoButton variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </AyoButton>
            <AyoButton variant="primary" onClick={() => setOpen(false)}>
              Save
            </AyoButton>
          </>
        }
      >
        <p className="text-14">
          ESC dismisses, the backdrop is click-to-close, focus is trapped, body
          scroll is locked. All free from Radix Dialog.
        </p>
      </AyoDrawer>
    </>
  );
};
