import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getToolbarHeight,
  getStatusBarCurrentHeight,
  getIsAndroidWithCameraWithinScreen,
  getPageTop,
  getHasNotchInsets,
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

  // An Android phone draws edge to edge: the window is the whole screen, and the status bar
  // (with any camera cut-out) and the navigation bar are the top and bottom insets. Book.js
  // starts the page getPageTop() from the bottom edge of the status bar and BookPage.js cuts
  // it off at the top edge of the navigation bar. The page is made as tall as that distance
  // plus the reader's own bottom margin, less a small gap, so the last line of text ends just
  // above the navigation bar whatever the heights of the two bars. For a plain status bar of
  // 24 this is the height the page always had. The insets are therefore not in
  // fullPageHeight and must not be taken off it again further down.
  const androidPhone = Platform.OS === 'android' && !wideMode;

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
  let truePageHeight =
    fullPageHeight - (androidPhone ? 0 : safeAreaInsets.bottom);
  let truePageMarginTop = 0;

  if (getHasNotchInsets(safeAreaInsets) && !wideMode) {
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

export default useAdjustedDimensions;
