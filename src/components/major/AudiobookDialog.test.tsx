// READER-181. Library renders this closed dialog even when nobody is logged in, as on the error page after a failed
// web login. It must not throw there.
//
//     npx jest src/components/major/AudiobookDialog.test.tsx

import { render } from '@testing-library/react-native';
import AudiobookDialog from './AudiobookDialog';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },
}));
jest.mock('redux', () => ({ bindActionCreators: () => ({}) }));
jest.mock('react-redux', () => ({ connect: () => (Component) => Component }));
jest.mock('../../redux/actions', () => ({ setBookCookies: jest.fn() }));
jest.mock('../../utils/media', () => ({ Audio: {}, mediaAvailable: true }));
jest.mock('../../hooks/useBookCookies', () => () => undefined);
jest.mock('../../hooks/useCoverHref', () => () => undefined);
jest.mock('./Dialog', () => () => null);
jest.mock('./FileImporter', () => () => null);
jest.mock('./BookCoverEditor', () => () => null);

const props = {
  open: false,
  bookId: undefined,
  setAudiobookId: jest.fn(),
  onClose: jest.fn(),
  handleNewLibrary: jest.fn(),
  idps: { 43: { id: 43, domain: 'readlangham.org' } },
  books: {},
};

describe('AudiobookDialog', () => {
  it('renders with no logged-in account', () => {
    expect(() =>
      render(<AudiobookDialog {...props} accounts={{}} />),
    ).not.toThrow();
  });

  it('renders with a logged-in account', () => {
    expect(() =>
      render(
        <AudiobookDialog
          {...props}
          accounts={{ '43:1': { cookie: 'connect.sid=x' } }}
        />,
      ),
    ).not.toThrow();
  });
});
