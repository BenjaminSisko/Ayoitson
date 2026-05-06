// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithClient } from '@/test/render';
import { apiClient } from '@/lib/api-client';
import { XmltvPane } from './XmltvPane';

vi.mock('@/lib/api-client', () => ({
  ApiClientError: class ApiClientError extends Error {},
  apiClient: {
    getXmltvSettings: vi.fn(),
    updateXmltvSettings: vi.fn(),
    getXmltvOutputLocation: vi.fn(),
  },
}));

const mockedApi = vi.mocked(apiClient);

describe('XmltvPane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getXmltvSettings.mockResolvedValue({
      _id: 'xmltv',
      refresh: 4,
      cache: 7,
      enableImageCache: false,
    });
    mockedApi.getXmltvOutputLocation.mockResolvedValue({
      file: '/Users/benny/Documents/New project 5/Ayoitson/.ayoitson/xmltv.xml',
    });
    mockedApi.updateXmltvSettings.mockImplementation(
      async (settings) => settings
    );
  });

  test('loads and saves XMLTV refresh/cache settings through the client', async () => {
    const user = userEvent.setup();
    renderWithClient(<XmltvPane />);

    expect(await screen.findByDisplayValue('4')).toBeInTheDocument();
    expect(
      screen.getByText(
        '/Users/benny/Documents/New project 5/Ayoitson/.ayoitson/xmltv.xml'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('http://localhost:3000/api/guide/xmltv.xml')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy EPG XML URL' })
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Refresh hours'));
    await user.type(screen.getByLabelText('Refresh hours'), '8');
    await user.clear(screen.getByLabelText('Cache days'));
    await user.type(screen.getByLabelText('Cache days'), '14');
    await user.click(screen.getByLabelText('Enable image cache'));
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(mockedApi.updateXmltvSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'xmltv',
        refresh: 8,
        cache: 14,
        enableImageCache: true,
      })
    );
  });
});
