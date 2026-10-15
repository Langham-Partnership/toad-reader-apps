import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getHasNotchInsets,
  getIsAndroidWithCameraWithinScreen,
  getPageTop,
  getStatusBarCurrentHeight,
  getToolbarHeight,
} from '../utils/toolbox';

import useDimensions from './useDimensions';
import useWideMode from './useWideMode';

const COLUMN_MAX_WIDTH = 1000; // Needs to accord with columnMaxWidth in readium-js-viewer
const COLUMN_GAP = 60; // Needs to accord with columnGap in readium-js-viewer
const VERTICAL_MARGIN = 30; // Matches #epub-reader-container in readium-js-viewer
const ANDROID_GAP_ABOVE_NAVIGATION_BAR = 2; // What a phone with a plain status bar of 24 has always had

const useAdjustedDimensions = ({
  fullPageWidth,
  fullPageHeight,
  realFullPageWidth,
  realFullPageMarginHorizontal = 0,
  sidePanelSettings,
  widget = false,
}) => {
  const wideMode = useWideMode();
  const { width, height } = useDimensions().window;
  const safeAreaInsets = useSafeAreaInsets();

  // Android draws edge to edge: the window is the whole screen, and the status bar (with any
  // camera cut-out) and the navigation bar are the top and bottom insets. On a phone Book.js
  // starts the page getPageTop() from the bottom edge of the status bar and BookPage.js cuts
  // it off at the top edge of the navigation bar. The page is that distance plus the reader's
  // bottom margin, less a small gap, so the last line of text ends just above the navigation
  // bar. In wide mode the page runs from the toolbar to the navigation bar: both insets come
  // off the window height, and the rest is the arithmetic of a window that ended at both bars
  // with insets of 0. Either way fullPageHeight leaves the insets out: they must not be taken
  // off it again below.
  const android = Platform.OS === 'android';
  const androidPhone = android && !wideMode;

  if (!fullPageWidth) {
    fullPageWidth = width;
    fullPageHeight = androidPhone
      ? height -
        safeAreaInsets.top -
        safeAreaInsets.bottom -
        getPageTop() +
        VERTICAL_MARGIN -
        ANDROID_GAP_ABOVE_NAVIGATION_BAR
      : height +
        (getHasNotchInsets(safeAreaInsets) ? 40 : 0) +
        (getIsAndroidWithCameraWithinScreen()
          ? getStatusBarCurrentHeight()
          : 0);

    if (wideMode) {
      fullPageHeight -=
        getStatusBarCurrentHeight() +
        safeAreaInsets.top +
        (android ? safeAreaInsets.bottom : 0);
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
  let truePageHeight = fullPageHeight - (android ? 0 : safeAreaInsets.bottom);
  let truePageMarginTop = 0;

  if (getHasNotchInsets(safeAreaInsets) && !wideMode) {
    truePageHeight -= safeAreaInsets.top;
    truePageMarginTop = safeAreaInsets.top;
  } else if (wideMode) {
    truePageMarginTop =
      VERTICAL_MARGIN -
      (getStatusBarCurrentHeight() + (android ? 0 : safeAreaInsets.top));
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

export default useAdjustedDimensions;
