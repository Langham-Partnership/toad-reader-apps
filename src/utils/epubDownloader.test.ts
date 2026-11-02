import * as FileSystem from 'expo-file-system/legacy';
import { fetchEpubAndAssets } from './epubDownloader';
import { sentry } from './toolbox';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },
}));
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
  downloadAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));
jest.mock('./toolbox', () => ({
  sentry: jest.fn(),
  getBooksDir: () => 'file://books/',
}));

const fs = jest.mocked(FileSystem);
const CONTAINER =
  '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>';
const OPF = '<package><manifest><item href="img/a.png"/></manifest></package>';

const download = () =>
  fetchEpubAndAssets({
    downloadOrigin: 'https://readlangham.org',
    bookId: 7,
    cookie: 'c',
    title: 'Book',
  });

// The error passed to sentry({ error })
const reportedError = () =>
  (
    jest
      .mocked(sentry)
      .mock.calls.find(
        ([arg]) => arg && typeof arg === 'object' && 'error' in arg,
      )?.[0] as { error: Error & { cause?: Error & { status?: number } } }
  )?.error;

beforeEach(() => {
  jest.clearAllMocks();
  fs.makeDirectoryAsync.mockResolvedValue(undefined);
  fs.deleteAsync.mockResolvedValue(undefined);
  fs.getInfoAsync.mockResolvedValue({ exists: false } as never);
  fs.readAsStringAsync.mockRejectedValue(new Error('not on device'));
});

describe('fetchEpubAndAssets errors', () => {
  it('reports the HTTP status and file when a download is refused', async () => {
    fs.downloadAsync.mockResolvedValue({ status: 404 } as never);

    expect((await download()).success).toBe(false);

    const error = reportedError();
    expect(error.message).toBe(
      'Invalid response to epub fetch (book 7, META-INF/container.xml): http status: 404',
    );
    expect(error.cause?.status).toBe(404);
  });

  it('keeps a network error as the cause', async () => {
    const networkError = new Error('Unable to resolve host');
    fs.downloadAsync.mockRejectedValue(networkError);

    await download();

    const error = reportedError();
    expect(error.message).toBe(
      'Invalid response to epub fetch (book 7): Unable to resolve host',
    );
    expect(error.cause).toBe(networkError);
  });

  it('names the book file that failed', async () => {
    fs.readAsStringAsync.mockImplementation(async (uri: string) => {
      if (uri.endsWith('META-INF/container.xml')) return CONTAINER;
      if (uri.endsWith('OEBPS/content.opf')) return OPF;
      throw new Error('not on device');
    });
    fs.downloadAsync.mockImplementation(
      async (url: string) =>
        (url.endsWith('.png') ? { status: 500 } : { status: 404 }) as never,
    );

    await download();

    expect(reportedError().message).toBe(
      'Invalid response to epub fetch (book 7, OEBPS/img/a.png): http status: 500',
    );
  });

  it('still treats a 403 as no access', async () => {
    fs.downloadAsync.mockResolvedValue({ status: 403 } as never);

    expect(await download()).toEqual({ success: false, noAuth: true });
    expect(reportedError()).toBeUndefined();
  });
});
