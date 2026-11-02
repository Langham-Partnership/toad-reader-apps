import { getJsonOrNull } from './getJsonOrNull';
import { safeFetch } from './toolbox';

jest.mock('./toolbox', () => ({
  safeFetch: jest.fn(),
  getReqOptionsWithAdditions: (additions: object) => additions,
}));

const fetchMock = jest.mocked(safeFetch);
const URL = 'https://data.readlangham.org/subscriptions';

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

describe('getJsonOrNull', () => {
  it('returns the parsed body', async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      json: async () => ({ subscriptions: [{ id: 1 }] }),
    } as never);

    expect(await getJsonOrNull(URL)).toEqual({ subscriptions: [{ id: 1 }] });
    expect(fetchMock).toHaveBeenCalledWith(URL, {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('returns null when the request fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Load failed'));

    expect(await getJsonOrNull(URL)).toBeNull();
    expect(console.log).toHaveBeenCalledWith(
      `GET ${URL} had an error.`,
      'Load failed',
      undefined,
    );
  });

  it('returns null when the body is not JSON', async () => {
    fetchMock.mockResolvedValue({
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    } as never);

    expect(await getJsonOrNull(URL)).toBeNull();
    expect(console.log).toHaveBeenCalledWith(
      `GET ${URL} had an error.`,
      'Unexpected token <',
      502,
    );
  });
});
