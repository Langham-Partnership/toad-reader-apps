import { render, screen } from '@testing-library/react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { getAccountIdIsNoAuth } from '../../hooks/useHasNoAuth';
import HighlighterShareIcon from './HighlighterShareIcon';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { QUOTES_DOMAIN: 'quotes.example.com' } } },
}));
jest.mock('redux', () => ({ bindActionCreators: () => ({}) }));
jest.mock('react-redux', () => ({ connect: () => (Component) => Component }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('inline-i18n', () => ({ i18n: (str: string) => str }));
jest.mock('../../utils/toolbox', () => ({
  getDataOrigin: () => 'https://test.com',
  isStaging: () => false,
}));
jest.mock('../../hooks/useClassroomInfo', () => () => ({
  idpId: '1',
  accountId: 'account-1',
}));
jest.mock('../../hooks/useNonBlurringOnPress', () => (handler: () => void) => ({
  onPress: handler,
}));
jest.mock('../../hooks/useHasNoAuth', () => ({
  getAccountIdIsNoAuth: jest.fn(() => false),
}));
jest.mock('../major/WebView', () => () => null);
jest.mock('../major/Dialog', () => () => null);

const defaultProps = {
  bookId: 'book-1',
  selectionInfo: {
    text: 'Selected text',
    spineIdRef: 'spine-1',
    cfi: '/4/2/1',
  },
  highlight: { color: 1, share_code: 'abc123' },
  idps: { '1': { domain: 'example.com' } },
  books: { 'book-1': { title: 'Book One', accounts: {} } },
  syncStatus: 'synced',
};

describe('HighlighterShareIcon Component', () => {
  beforeEach(() => {
    jest.mocked(getAccountIdIsNoAuth).mockReturnValue(false);
  });

  it('should return null when isNoAuth is true', () => {
    jest.mocked(getAccountIdIsNoAuth).mockReturnValue(true);
    const { toJSON } = render(<HighlighterShareIcon {...defaultProps} />);
    expect(toJSON()).toBeNull();
  });

  it('should render without crashing when authenticated', () => {
    const { toJSON } = render(<HighlighterShareIcon {...defaultProps} />);
    expect(toJSON()).not.toBeNull();
  });

  it('should render the share icon button', () => {
    render(<HighlighterShareIcon {...defaultProps} />);
    expect(screen.UNSAFE_getByType(TouchableOpacity)).toBeTruthy();
  });

  it('should keep the share button hidden (READER-168)', () => {
    render(<HighlighterShareIcon {...defaultProps} />);
    const button = screen.UNSAFE_getByType(TouchableOpacity);
    expect(StyleSheet.flatten(button.props.style)).toEqual({ display: 'none' });
  });
});
