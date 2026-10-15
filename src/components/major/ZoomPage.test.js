// The page picture that zooms between the page and the page list (READER-156).
//
//     npx jest src/components/major/ZoomPage.test.js
//
// iOS and web must get what they got before. On an Android phone nothing changes here. In wide
// mode on Android the picture must sit and land where it did on SDK 53, when the window ended
// at both bars and the insets were 0: the arithmetic below compares in the coordinates of the
// zoom view, which begins below the toolbar on both.

import { Platform, StatusBar, StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import ZoomPage from './ZoomPage';
import useAdjustedDimensions from '../../hooks/useAdjustedDimensions';
import { getWideMode } from '../../hooks/useWideMode';
import { getCornerSnapshotCoords } from '../../utils/toolbox';

let mockWindow = { width: 390, height: 844 };
let mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        PAGE_ZOOM_MILLISECONDS: 400,
        PAGE_LIST_MAXIMUM_PAGE_SIZE: 150,
        PAGES_HORIZONTAL_MARGIN: 10,
      },
    },
  },
}));
jest.mock('redux', () => ({ bindActionCreators: () => ({}) }));
jest.mock('react-redux', () => ({ connect: () => (Component) => Component }));
jest.mock('../../hooks/useDimensions', () => () => ({ window: mockWindow }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));

const realOS = Platform.OS;
const realStatusBarCurrentHeight = StatusBar.currentHeight;

const setDevice = ({ os, window, insets, statusBarCurrentHeight }) => {
  Platform.OS = os;
  StatusBar.currentHeight = statusBarCurrentHeight;
  mockWindow = window;
  mockInsets = { left: 0, right: 0, ...insets };
};

// The zoom starts on the next animation frame: it must not run after a test has ended
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  Platform.OS = realOS;
  StatusBar.currentHeight = realStatusBarCurrentHeight;
});

const sidePanelSettings = { open: true, width: 300 };

// Equal but for the last bits of a floating point sum
const expectCloseStyle = (actual, expected) => {
  const flat = ({ transform, ...rest }) => ({
    ...rest,
    translateX: transform[0].translateX,
    translateY: transform[1].translateY,
  });
  const a = flat(actual);
  const e = flat(expected);
  expect(Object.keys(a).sort()).toEqual(Object.keys(e).sort());
  Object.keys(e).forEach((key) => {
    if (typeof e[key] === 'number') {
      expect(a[key]).toBeCloseTo(e[key], 6);
    } else {
      expect(a[key]).toBe(e[key]);
    }
  });
};

// The style of the view that holds the picture, before the zoom starts
const renderPicture = (snapshotCoords) => {
  const { toJSON, unmount } = render(
    <ZoomPage
      bookId="1"
      spineIdRef="chapter-1"
      pageCfisKey="key"
      pageIndexInSpine={0}
      snapshotCoords={snapshotCoords}
      zoomed={false}
      zoomingEnabled={true}
      onZoomCompletion={() => {}}
      pageCfiKnown={false}
      sidePanelSettings={sidePanelSettings}
    />,
  );
  const style = StyleSheet.flatten(toJSON().props.style);
  unmount();
  return style;
};

// Frozen copy of usePageSize and of the arithmetic of ZoomPage at commit 48125c5f, which for
// iOS and web is that of commit 0e27c0a6. Do not change it together with ZoomPage.
const pageSize = ({ fullPageWidth: width, fullPageHeight: height }) => {
  const maxWidth = parseInt(height < width ? 150 : 150 * (width / height), 10);
  const pagesPerRow = parseInt(width / maxWidth, 10);
  const pageWidth = parseInt(
    (width - (pagesPerRow + 1) * 10) / pagesPerRow,
    10,
  );
  const pageHeight = parseInt(pageWidth / (width / height), 10);
  return { pageWidth, pageHeight };
};

const before = ({
  os,
  insets: safeAreaInsets,
  statusBarCurrentHeight,
  wideMode,
  snapshotCoords,
  dimensions: { fullPageWidth, fullPageHeight, truePageMarginTop },
}) => {
  const getStatusBarCurrentHeight = () => statusBarCurrentHeight || 0;
  const getIsAndroidWithCameraWithinScreen = () =>
    os === 'android' && getStatusBarCurrentHeight() > 20;
  const getHasNotchInsets = () => os !== 'android' && safeAreaInsets.top > 30;
  const { pageWidth, pageHeight } = pageSize({ fullPageWidth, fullPageHeight });
  const androidPhone = os === 'android' && !wideMode;

  const left = snapshotCoords.x;
  const top =
    snapshotCoords.y -
    (wideMode ? safeAreaInsets.top + getStatusBarCurrentHeight() + 56 : 0) +
    (getIsAndroidWithCameraWithinScreen() ? 20 : 0);
  const translateX = left - (fullPageWidth / 2 - pageWidth / 2);
  const translateY =
    top -
    (fullPageHeight / 2 - pageHeight / 2) +
    (getHasNotchInsets() ? 20 : 0);

  return {
    position: 'absolute',
    left: 0,
    right: 0,
    ...(androidPhone
      ? { top: 0, height: fullPageHeight }
      : {
          bottom: 0,
          top:
            (truePageMarginTop -
              (getHasNotchInsets() ? 20 : 0) -
              (getIsAndroidWithCameraWithinScreen()
                ? getStatusBarCurrentHeight() - 20
                : 0)) *
            -1,
        }),
    transform: [{ translateX }, { translateY }],
  };
};

const windows = [
  { width: 390, height: 844 }, // iPhone 14
  { width: 375, height: 667 }, // iPhone 8
  { width: 768, height: 1024 }, // iPad, upright
  { width: 1024, height: 768 }, // iPad on its side: wide mode
  { width: 1366, height: 1024 }, // wide mode
  { width: 1280, height: 800 }, // laptop browser: wide mode
];
const tops = [0, 20, 24, 44, 47, 59];
const bottoms = [0, 20, 34];
const ys = [0, 120, 431.5, 700];

describe('ZoomPage on iOS and web', () => {
  ['ios', 'web'].forEach((os) => {
    it(`places and moves the picture on ${os} as before`, () => {
      windows.forEach((window) => {
        tops.forEach((top) => {
          bottoms.forEach((bottom) => {
            const device = {
              os,
              window,
              insets: { top, bottom },
              statusBarCurrentHeight: os === 'ios' ? null : undefined,
            };
            setDevice(device);
            const wideMode = getWideMode(window);
            // useAdjustedDimensions.test.js shows these are unchanged on iOS and web
            const dimensions = useAdjustedDimensions({ sidePanelSettings });

            ys.forEach((y) => {
              const snapshotCoords = { x: 20, y };
              expect(renderPicture(snapshotCoords)).toEqual(
                before({ ...device, wideMode, snapshotCoords, dimensions }),
              );
            });
          });
        });
      });
    });
  });
});

describe('ZoomPage on an Android phone', () => {
  it('is unchanged', () => {
    [
      { width: 1080 / 2.625, height: 2400 / 2.625 },
      { width: 360, height: 640 },
    ].forEach((window) => {
      [24, 50.29].forEach((top) => {
        [24, 48].forEach((bottom) => {
          const device = {
            os: 'android',
            window,
            insets: { top, bottom },
            statusBarCurrentHeight: top,
          };
          setDevice(device);
          const dimensions = useAdjustedDimensions({ sidePanelSettings });
          const snapshotCoords = getCornerSnapshotCoords({
            height: dimensions.fullPageHeight,
            windowHeight: window.height,
            safeAreaInsets: mockInsets,
            wideMode: false,
          });

          expect(renderPicture(snapshotCoords)).toEqual(
            before({ ...device, wideMode: false, snapshotCoords, dimensions }),
          );
        });
      });
    });
  });
});

describe('ZoomPage in wide mode on Android (edge to edge)', () => {
  const tabletWindows = [
    { width: 1280, height: 800 },
    { width: 1194, height: 834 },
    { width: 1000, height: 1400 },
  ];

  it('places and moves the picture as on SDK 53', () => {
    tabletWindows.forEach((window) => {
      [24, 28, 50.29].forEach((statusBarCurrentHeight) => {
        [24, 28, 50.29].forEach((top) => {
          [0, 32, 48, 56].forEach((bottom) => {
            setDevice({
              os: 'android',
              window,
              insets: { top, bottom },
              statusBarCurrentHeight,
            });
            // useAdjustedDimensions.test.js shows these are the SDK 53 values in wide mode
            const dimensions = useAdjustedDimensions({ sidePanelSettings });
            const sdk53 = {
              os: 'android',
              insets: { top: 0, bottom: 0 },
              statusBarCurrentHeight,
              wideMode: true,
              dimensions,
            };

            // A page in the page list, measured from the top of the window: the window now
            // begins at the top of the screen, one status bar higher
            [0, 120, 431.5].forEach((y) => {
              expectCloseStyle(renderPicture({ x: 20, y: y + top }), {
                ...before({ ...sdk53, snapshotCoords: { x: 20, y } }),
                // the zoom view now reaches the bottom of the screen
                bottom,
              });
            });

            // The bottom left corner, as Book.js works it out
            const corner = getCornerSnapshotCoords({
              height: dimensions.fullPageHeight,
              windowHeight: window.height,
              safeAreaInsets: mockInsets,
              wideMode: true,
            });
            const sdk53Corner = { x: 0, y: dimensions.fullPageHeight };
            expectCloseStyle(renderPicture(corner), {
              ...before({ ...sdk53, snapshotCoords: sdk53Corner }),
              bottom,
            });
          });
        });
      });
    });
  });

  it('gives the known values of a tablet on its side', () => {
    // 2560 x 1600 px at 320 dpi, status bar 24, gesture navigation. The page is 688 high:
    // the picture starts 2 above it and ends at the navigation bar, as on SDK 53.
    setDevice({
      os: 'android',
      window: { width: 1280, height: 800 },
      insets: { top: 24, bottom: 32 },
      statusBarCurrentHeight: 24,
    });

    expect(renderPicture({ x: 0, y: 0 })).toMatchObject({
      top: -2,
      bottom: 32,
    });
  });
});

describe('getCornerSnapshotCoords', () => {
  it('is height less the bottom inset on iOS and web, as before', () => {
    ['ios', 'web'].forEach((os) => {
      Platform.OS = os;
      [500, 803.5, 884].forEach((height) => {
        [0, 20, 34].forEach((bottom) => {
          [false, true].forEach((wideMode) => {
            expect(
              getCornerSnapshotCoords({
                height,
                windowHeight: 844,
                safeAreaInsets: { top: 47, bottom },
                wideMode,
              }),
            ).toEqual({ x: 0, y: height - bottom });
          });
        });
      });
    });
  });

  it('is the bottom edge of the screen on an Android phone', () => {
    Platform.OS = 'android';
    expect(
      getCornerSnapshotCoords({
        height: 888,
        windowHeight: 914.29,
        safeAreaInsets: { top: 50.29, bottom: 24 },
        wideMode: false,
      }),
    ).toEqual({ x: 0, y: 864 });
  });
});
