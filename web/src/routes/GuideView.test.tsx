// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { apiClient } from '@/lib/api-client';
import { renderWithClient } from '@/test/render';
import { GuideView } from './guide';

vi.mock('@/lib/api-client', () => ({
  ApiClientError: class ApiClientError extends Error {},
  apiClient: {
    listChannels: vi.fn(),
    getGuideChannel: vi.fn(),
  },
}));

const mockedApi = vi.mocked(apiClient);

describe('GuideView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.listChannels.mockResolvedValue([{ number: 101 }]);
    mockedApi.getGuideChannel.mockResolvedValue({
      number: 101,
      name: 'Movies',
      programs: [
        {
          id: 'program-1',
          title: 'Morning Movie',
          start: '2026-05-06T12:00:00.000Z',
          stop: '2026-05-06T13:30:00.000Z',
          description: 'A quiet test film.',
        },
      ],
    });
  });

  test('renders channel guide programs and opens program details', async () => {
    const user = userEvent.setup();
    renderWithClient(<GuideView />);

    expect(await screen.findByText('Movies')).toBeInTheDocument();
    expect(mockedApi.getGuideChannel).toHaveBeenCalledWith(
      101,
      expect.any(String),
      expect.any(String)
    );

    await user.click(screen.getByRole('button', { name: /morning movie/i }));

    expect(
      screen.getByRole('heading', { name: 'Morning Movie' })
    ).toBeInTheDocument();
    expect(screen.getByText('A quiet test film.')).toBeInTheDocument();
  });
});
