// Where the highlight panel sits (READER-156).
//
//     npx jest src/components/major/Highlighter.test.tsx
//
// iOS and web must get what they got before. On an Android phone nothing changes here. In wide
// mode on Android the panel must get what it got on SDK 53, when the window ended at both bars
// and the insets were 0.

import { Keyboard, Platform, StatusBar, StyleSheet } from 'react-native';
import { act, render } from '@testing-library/react-native';

import Highlighter from './Highlighter';
import { getWideMode } from '../../hooks/useWideMode';

let mockWindow = { width: 390, height: 844 };
let mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };
let mockRouterState = {};

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },
}));
jest.mock('redux', () => ({ bindActionCreators: () => ({}) }));
jest.mock('react-redux', () => ({ connect: () => (Component) => Component }));
jest.mock('../../redux/actions', () => ({ setHighlight: jest.fn() }));
jest.mock('../../hooks/useRouterState', () => () => ({
  routerState: mockRouterState,
}));
jest.mock('../../hooks/useDimensions', () => () => ({ window: mockWindow }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));
jest.mock('../basic/HighlighterLabel', () => () => null);
jest.mock('../basic/HighlighterNotes', () => () => null);
jest.mock('../basic/HighlighterSketch', () => () => null);
jest.mock('../basic/BackFunction', () => () => null);
jest.mock('./HighlighterInstructorHighlightSection', () => () => null);

const realOS = Platform.OS;
const realStatusBarCurrentHeight = StatusBar.currentHeight;

const setDevice = ({
  os,
  window,
  insets,
  statusBarCurrentHeight,
  widget = undefined,
}) => {
  Platform.OS = os;
  StatusBar.currentHeight = statusBarCurrentHeight;
  mockWindow = window;
  mockInsets = { left: 0, right: 0, ...insets };
  mockRouterState = widget ? { widget: true } : {};
};

let keyboardListeners = {};
beforeEach(() => {
  keyboardListeners = {};
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, listener) => {
    keyboardListeners[event] = listener;
    return { remove: () => {} } as unknown as ReturnType<
      typeof Keyboard.addListener
    >;
  });
});

afterEach(() => {
  Platform.OS = realOS;
  StatusBar.currentHeight = realStatusBarCurrentHeight;
  jest.restoreAllMocks();
});

// The style of the panel, for a selection in the lower or upper half, with or without the
// keyboard up
const renderPanel = ({ copyTooltipInLowerHalf, keyboardShowing }) => {
  const { UNSAFE_root, unmount } = render(
    <Highlighter
      selectionInfo={{
        text: 'Selected text',
        spineIdRef: 'chapter-1',
        cfi: '/4/2/4,/1:16,/1:24',
        copyTooltipInLowerHalf,
      }}
      bookId="1"
      idpId={1}
      setSelectionText={() => {}}
      updateNoteInEdit={() => {}}
      updateSketchInEdit={() => {}}
      books={{}}
      userDataByBookId={{}}
      setHighlight={() => {}}
    />,
  );
  if (keyboardShowing) {
    act(() =>
      (keyboardListeners as Record<string, () => void>).keyboardDidShow(),
    );
  }
  const [panel] = UNSAFE_root.findAll(
    (node) => typeof node.type === 'string' && !!node.props.onTouchEnd,
  );
  const style = StyleSheet.flatten(panel.props.style);
  unmount();
  return style;
};

// Frozen copy of the panel style of Highlighter at commit 0e27c0a6. Do not change it together
// with Highlighter.
const before = ({
  os,
  insets: safeAreaInsets,
  statusBarCurrentHeight,
  wideMode,
  widget,
  copyTooltipInLowerHalf,
  keyboardShowing,
}) => {
  const getStatusBarCurrentHeight = () => statusBarCurrentHeight || 0;
  const getIsAndroidWithCameraWithinScreen = () =>
    os === 'android' && getStatusBarCurrentHeight() > 20;

  return {
    position: 'absolute',
    right: 0,
    left: 0,
    zIndex: 3,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,.2)',
    backgroundColor: 'white',
    ...(copyTooltipInLowerHalf || keyboardShowing
      ? {
          top: safeAreaInsets.top > 30 ? (safeAreaInsets.top - 20) * -1 : 0,
          paddingTop: Math.max(
            safeAreaInsets.top +
              getStatusBarCurrentHeight() -
              10 -
              (getIsAndroidWithCameraWithinScreen() ? 20 : 0),
            0,
          ),
        }
      : {
          bottom: 0,
          paddingBottom: safeAreaInsets.bottom,
        }),
    ...(copyTooltipInLowerHalf && wideMode && !widget
      ? { paddingTop: 0 }
      : null),
  };
};

const situations = [
  { copyTooltipInLowerHalf: false, keyboardShowing: false },
  { copyTooltipInLowerHalf: true, keyboardShowing: false },
  { copyTooltipInLowerHalf: false, keyboardShowing: true },
  { copyTooltipInLowerHalf: true, keyboardShowing: true },
];

describe('Highlighter on iOS and web', () => {
  ['ios', 'web'].forEach((os) => {
    it(`places the panel on ${os} as before`, () => {
      [
        { width: 390, height: 844 },
        { width: 375, height: 667 },
        { width: 1024, height: 768 }, // wide mode
        { width: 1280, height: 800 }, // wide mode
      ].forEach((window) => {
        [0, 20, 24, 44, 47, 59].forEach((top) => {
          [0, 34].forEach((bottom) => {
            [false, true].forEach((widget) => {
              const device = {
                os,
                window,
                insets: { top, bottom },
                statusBarCurrentHeight: os === 'ios' ? null : undefined,
                widget,
              };
              setDevice(device);
              const wideMode = getWideMode(window);

              situations.forEach((situation) => {
                expect(renderPanel(situation)).toEqual(
                  before({ ...device, wideMode, ...situation }),
                );
              });
            });
          });
        });
      });
    });
  });
});

describe('Highlighter on an Android phone', () => {
  it('starts the top panel at the top of the screen with its content below the status bar', () => {
    // Pixel 8 with camera cut-out: the page starts 20 above the bottom of the status bar
    setDevice({
      os: 'android',
      window: { width: 1080 / 2.625, height: 2400 / 2.625 },
      insets: { top: 50.29, bottom: 24 },
      statusBarCurrentHeight: 50.29,
    });

    expect(
      renderPanel({ copyTooltipInLowerHalf: true, keyboardShowing: false }),
    ).toMatchObject({ top: -30.29, paddingTop: 50.29 });
    expect(
      renderPanel({ copyTooltipInLowerHalf: false, keyboardShowing: false }),
    ).toMatchObject({ bottom: 0, paddingBottom: 24 });
  });
});

describe('Highlighter in wide mode on Android (edge to edge)', () => {
  it('places the top panel as on SDK 53', () => {
    [
      { width: 1280, height: 800 },
      { width: 1000, height: 1400 },
    ].forEach((window) => {
      [0, 20, 24, 28, 50.29, 77].forEach((statusBarCurrentHeight) => {
        [24, 50.29, 77].forEach((top) => {
          [0, 32, 56].forEach((bottom) => {
            [false, true].forEach((widget) => {
              const device = {
                os: 'android',
                window,
                insets: { top, bottom },
                statusBarCurrentHeight,
                widget,
              };
              setDevice(device);

              situations
                .filter((s) => s.copyTooltipInLowerHalf || s.keyboardShowing)
                .forEach((situation) => {
                  expect(renderPanel(situation)).toEqual(
                    before({
                      ...device,
                      insets: { top: 0, bottom: 0 },
                      wideMode: true,
                      ...situation,
                    }),
                  );
                });
            });
          });
        });
      });
    });
  });

  it('gives a tablet on its side no blank band above the panel', () => {
    // 2560 x 1600 px at 320 dpi, status bar 24, a highlight in the upper half, note field focused
    setDevice({
      os: 'android',
      window: { width: 1280, height: 800 },
      insets: { top: 24, bottom: 32 },
      statusBarCurrentHeight: 24,
    });

    expect(
      renderPanel({ copyTooltipInLowerHalf: false, keyboardShowing: true }),
    ).toMatchObject({ top: 0, paddingTop: 0 });
  });
});
