// The geometry of the reader page (READER-156).
//
//     npx jest src/hooks/useAdjustedDimensions.test.js
//
// iOS and web must return what they returned before Android was given its own arithmetic.
// On Android (edge to edge) the text must end just above the navigation bar, whatever the
// heights of the status bar and the navigation bar.

import { Platform, StatusBar } from 'react-native';

import useAdjustedDimensions from './useAdjustedDimensions';
import { getHasNotchInsets, getPageTop } from '../utils/toolbox';

let mockWindow = { width: 390, height: 844 };
let mockInsets = { top: 0, bottom: 0, left: 0, right: 0 };

// toolbox.js is used as it is: its real functions are part of the arithmetic
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },
}));
jest.mock('./useDimensions', () => () => ({ window: mockWindow }));
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

afterEach(() => {
  Platform.OS = realOS;
  StatusBar.currentHeight = realStatusBarCurrentHeight;
});

// Frozen copy of useAdjustedDimensions and of the toolbox functions it used at commit 0e27c0a6.
// Do not change it together with the hook: it is what iOS and web are compared with.
const before = ({
  os,
  window,
  insets: safeAreaInsets,
  statusBarCurrentHeight,
  props: {
    fullPageWidth,
    fullPageHeight,
    realFullPageWidth,
    realFullPageMarginHorizontal = 0,
    sidePanelSettings,
    widget = false,
  },
}) => {
  const COLUMN_MAX_WIDTH = 1000;
  const COLUMN_GAP = 60;
  const VERTICAL_MARGIN = 30;
  const getToolbarHeight = () => 56;
  const getStatusBarCurrentHeight = () => statusBarCurrentHeight || 0;
  const getIsAndroidWithCameraWithinScreen = () =>
    os === 'android' && getStatusBarCurrentHeight() > 20;

  const { width, height } = window;
  const wideMode = width > 900 && height > 550;

  if (!fullPageWidth) {
    fullPageWidth = width;
    fullPageHeight =
      height +
      (safeAreaInsets.top > 30 ? 40 : 0) +
      (getIsAndroidWithCameraWithinScreen() ? getStatusBarCurrentHeight() : 0);

    if (wideMode) {
      fullPageHeight -= getStatusBarCurrentHeight() + safeAreaInsets.top;
      fullPageHeight -= getToolbarHeight();
      if (sidePanelSettings.open && !widget) {
        fullPageWidth -= sidePanelSettings.width;
      }
    }

    realFullPageWidth = Math.min(
      fullPageWidth,
      COLUMN_MAX_WIDTH + COLUMN_GAP / 2,
    );
    realFullPageMarginHorizontal = (fullPageWidth - realFullPageWidth) / 2;
  }

  let truePageWidth = fullPageWidth;
  let truePageHeight = fullPageHeight - safeAreaInsets.bottom;
  let truePageMarginTop = 0;

  if (safeAreaInsets.top > 30 && !wideMode) {
    truePageHeight -= safeAreaInsets.top;
    truePageMarginTop = safeAreaInsets.top;
  } else if (wideMode) {
    truePageMarginTop =
      VERTICAL_MARGIN - (getStatusBarCurrentHeight() + safeAreaInsets.top);
  }

  return {
    width,
    height,
    fullPageWidth,
    fullPageHeight,
    realFullPageWidth,
    realFullPageMarginHorizontal,
    truePageWidth,
    truePageHeight,
    truePageMarginTop,
  };
};

const windows = [
  { width: 320, height: 568 }, // iPhone SE (1st generation)
  { width: 375, height: 667 }, // iPhone 8, SE
  { width: 375, height: 812 }, // iPhone X
  { width: 390, height: 844 }, // iPhone 14
  { width: 393, height: 852 }, // iPhone 15
  { width: 430, height: 932 }, // iPhone 15 Pro Max
  { width: 744, height: 1133 }, // iPad mini
  { width: 768, height: 1024 }, // iPad, upright
  { width: 1024, height: 768 }, // iPad, on its side: wide mode
  { width: 1366, height: 1024 }, // iPad Pro, on its side: wide mode
  { width: 360, height: 640 }, // small browser window
  { width: 901, height: 551 }, // just wide mode
  { width: 900, height: 550 }, // just not wide mode
  { width: 1280, height: 800 }, // laptop browser: wide mode
  { width: 1920, height: 1080 }, // desktop browser: wide mode
];
const tops = [0, 20, 24, 30, 30.5, 44, 47, 50, 59, 62];
const bottoms = [0, 20, 21, 34];
const propSets = [
  { sidePanelSettings: { open: false, width: 300 } },
  { sidePanelSettings: { open: true, width: 300 } },
  { sidePanelSettings: { open: true, width: 300 }, widget: true },
  // the way PageCapture calls it, with the full page size handed in
  {
    fullPageWidth: 390,
    fullPageHeight: 884,
    sidePanelSettings: { open: false, width: 300 },
  },
  {
    fullPageWidth: 1024,
    fullPageHeight: 692,
    realFullPageWidth: 1024,
    realFullPageMarginHorizontal: 0,
    sidePanelSettings: { open: true, width: 300 },
  },
];

describe('useAdjustedDimensions on iOS and web', () => {
  // The status bar height that React Native reports: nothing on iOS and web.
  ['ios', 'web'].forEach((os) => {
    it(`returns on ${os} what it returned before Android had its own arithmetic`, () => {
      windows.forEach((window) => {
        tops.forEach((top) => {
          bottoms.forEach((bottom) => {
            propSets.forEach((props) => {
              const device = {
                os,
                window,
                insets: { top, bottom },
                statusBarCurrentHeight: os === 'ios' ? null : undefined,
              };
              setDevice(device);

              expect(useAdjustedDimensions({ ...props })).toEqual(
                before({ ...device, props: { ...props } }),
              );
            });
          });
        });
      });
    });
  });

  it('gives the known values of an iPhone without and with a notch', () => {
    // iPhone 8: status bar 20, no home indicator
    setDevice({
      os: 'ios',
      window: { width: 375, height: 667 },
      insets: { top: 20, bottom: 0 },
      statusBarCurrentHeight: null,
    });
    expect(
      useAdjustedDimensions({ sidePanelSettings: { open: false } }),
    ).toMatchObject({
      fullPageHeight: 667,
      truePageHeight: 667,
      truePageMarginTop: 0,
    });

    // iPhone 14: notch 47, home indicator 34
    setDevice({
      os: 'ios',
      window: { width: 390, height: 844 },
      insets: { top: 47, bottom: 34 },
      statusBarCurrentHeight: null,
    });
    expect(
      useAdjustedDimensions({ sidePanelSettings: { open: false } }),
    ).toMatchObject({
      fullPageHeight: 884,
      truePageHeight: 803,
      truePageMarginTop: 47,
    });
  });
});

describe('getHasNotchInsets', () => {
  it('is the old "top inset above 30" test on iOS and web, and never true on Android', () => {
    [0, 20, 24, 30, 30.5, 47, 50.29, 59].forEach((top) => {
      Platform.OS = 'ios';
      expect(getHasNotchInsets({ top })).toBe(top > 30);
      Platform.OS = 'web';
      expect(getHasNotchInsets({ top })).toBe(top > 30);
      Platform.OS = 'android';
      expect(getHasNotchInsets({ top })).toBe(false);
    });
  });
});

describe('useAdjustedDimensions on an Android phone (edge to edge)', () => {
  const VERTICAL_MARGIN = 30; // the reader's own margin above and below the text
  const GAP = 2; // the text ends this far above the navigation bar

  // In device pixels: the whole screen, the status bar and the navigation bar.
  const shapes = [
    {
      name: 'Pixel 8 with camera cut-out, gesture navigation',
      scale: 2.625,
      px: { width: 1080, height: 2400, statusBar: 132, navigationBar: 63 },
      expected: { fullPageHeight: 888, truePageHeight: 888 },
    },
    {
      name: 'Pixel 8 with camera cut-out, three buttons',
      scale: 2.625,
      px: { width: 1080, height: 2400, statusBar: 132, navigationBar: 126 },
      expected: { fullPageHeight: 864, truePageHeight: 864 },
    },
    {
      name: 'same screen without a cut-out, gesture navigation',
      scale: 2.625,
      px: { width: 1080, height: 2400, statusBar: 63, navigationBar: 63 },
      expected: { fullPageHeight: 914.29, truePageHeight: 914.29 },
    },
    {
      name: 'same screen without a cut-out, three buttons',
      scale: 2.625,
      px: { width: 1080, height: 2400, statusBar: 63, navigationBar: 126 },
      expected: { fullPageHeight: 890.29, truePageHeight: 890.29 },
    },
    {
      name: 'small phone, gesture navigation',
      scale: 2,
      px: { width: 720, height: 1280, statusBar: 48, navigationBar: 48 },
      expected: { fullPageHeight: 640, truePageHeight: 640 },
    },
    {
      name: 'small phone, three buttons',
      scale: 2,
      px: { width: 720, height: 1280, statusBar: 48, navigationBar: 96 },
      expected: { fullPageHeight: 616, truePageHeight: 616 },
    },
  ];

  shapes.forEach(({ name, scale, px, expected }) => {
    it(`fits the page between the bars: ${name}`, () => {
      const window = { width: px.width / scale, height: px.height / scale };
      const insets = {
        top: px.statusBar / scale,
        bottom: px.navigationBar / scale,
      };
      setDevice({
        os: 'android',
        window,
        insets,
        statusBarCurrentHeight: insets.top,
      });

      const result = useAdjustedDimensions({
        sidePanelSettings: { open: false },
      });

      expect(result.fullPageHeight).toBeCloseTo(expected.fullPageHeight, 2);
      expect(result.truePageHeight).toBeCloseTo(expected.truePageHeight, 2);
      expect(result.truePageMarginTop).toBe(0);
      expect(result.fullPageWidth).toBe(window.width);
      expect(result.truePageWidth).toBe(window.width);
    });
  });

  it('ends the text just above the navigation bar for any heights of the two bars', () => {
    const window = { width: 400, height: 880 };

    [0, 16, 20, 24, 28, 30, 31, 36, 44, 50.29, 56, 64].forEach((top) => {
      [0, 16, 24, 48, 56].forEach((bottom) => {
        // React Native reports the status bar height once, when the app starts, so it can
        // differ from the top inset (split screen) or be missing.
        [top, 0, 24].forEach((statusBarCurrentHeight) => {
          setDevice({
            os: 'android',
            window,
            insets: { top, bottom },
            statusBarCurrentHeight,
          });

          const { fullPageHeight, truePageHeight, truePageMarginTop } =
            useAdjustedDimensions({ sidePanelSettings: { open: false } });

          const textBottom =
            top + getPageTop() + truePageHeight - VERTICAL_MARGIN;
          expect(textBottom).toBeCloseTo(window.height - bottom - GAP, 6);
          expect(truePageHeight).toBe(fullPageHeight);
          expect(truePageMarginTop).toBe(0);

          // PageCapture hands the full page size back in and must get the same page
          expect(
            useAdjustedDimensions({
              fullPageWidth: window.width,
              fullPageHeight,
              sidePanelSettings: { open: false },
            }),
          ).toMatchObject({ truePageHeight, truePageMarginTop: 0 });
        });
      });
    });
  });

  it('keeps the page height a phone with a plain status bar of 24 had before', () => {
    // There the old arithmetic already ended the text 2 above the navigation bar.
    [
      { width: 1080 / 2.625, height: 2400 / 2.625 },
      { width: 360, height: 640 },
      { width: 412, height: 915 },
    ].forEach((window) => {
      [0, 24, 48].forEach((bottom) => {
        const device = {
          os: 'android',
          window,
          insets: { top: 24, bottom },
          statusBarCurrentHeight: 24,
        };
        setDevice(device);

        const props = { sidePanelSettings: { open: false } };
        const now = useAdjustedDimensions({ ...props });
        const then = before({ ...device, props: { ...props } });
        expect(now.truePageHeight).toBeCloseTo(then.truePageHeight, 6);
        expect(now.truePageMarginTop).toBe(then.truePageMarginTop);
      });
    });
  });

  it('leaves wide mode (a large tablet on its side) as it was, apart from the notch test', () => {
    [24, 30].forEach((top) => {
      const device = {
        os: 'android',
        window: { width: 1280, height: 800 },
        insets: { top, bottom: 24 },
        statusBarCurrentHeight: top,
      };
      setDevice(device);

      const props = { sidePanelSettings: { open: false, width: 300 } };
      expect(useAdjustedDimensions({ ...props })).toEqual(
        before({ ...device, props: { ...props } }),
      );
    });
  });

  it('drops the iPhone notch allowance in wide mode too when the status bar is tall', () => {
    const device = {
      os: 'android',
      window: { width: 1000, height: 1400 },
      insets: { top: 77, bottom: 32 },
      statusBarCurrentHeight: 77,
    };
    setDevice(device);

    const props = { sidePanelSettings: { open: false, width: 300 } };
    expect(useAdjustedDimensions({ ...props }).truePageHeight).toBeCloseTo(
      before({ ...device, props: { ...props } }).truePageHeight - 40,
      6,
    );
  });
});
