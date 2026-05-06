// @vitest-environment jsdom
import { useState } from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { normalizeChannel } from '@/features/channels/channel-model';
import { ChannelMetadataForm } from './ChannelMetadataForm';

describe('ChannelMetadataForm', () => {
  test('edits channel metadata fields', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const channel = normalizeChannel({ number: 7, name: 'News' });

    function Harness() {
      const [draft, setDraft] = useState(channel);
      return (
        <ChannelMetadataForm
          channel={draft}
          onChange={(patch) => {
            onChange(patch);
            setDraft((current) => ({ ...current, ...patch }));
          }}
        />
      );
    }

    render(<Harness />);

    await user.clear(screen.getByLabelText('Channel name'));
    await user.type(screen.getByLabelText('Channel name'), 'Movies');

    expect(onChange).toHaveBeenLastCalledWith({ name: 'Movies' });
  });
});
