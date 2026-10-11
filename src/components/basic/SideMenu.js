/*
 * Copied from react-native-simple-side-menu
 * (github:biblemesh/react-native-simple-side-menu, commit 23df42c).
 * Changes: the styles spread StyleSheet.absoluteFill, because newer React
 * Native has dropped the name used before; the unused React import is removed;
 * this repository's formatting.
 *
 * MIT License
 *
 * Copyright (c) 2022 Resourcing Education LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { useRef } from 'react';
import {
  Animated,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
  View,
  I18nManager,
} from 'react-native';

import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import usePrevious from 'react-use/lib/usePrevious';
import useUpdate from 'react-use/lib/useUpdate';

const styles = StyleSheet.create({
  childrenContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  cover: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, .8)',
    zIndex: 2,
  },
  menu: {
    zIndex: 3,
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  menuLeft: {
    left: 0,
  },
  menuRight: {
    right: 0,
  },
});

const useNativeDriver = Platform.OS !== 'web';

const SideMenu = ({
  open = false,
  onClose = () => {},
  menu = null,
  children = null,

  menuWidth = 280,
  menuPosition = 'left',
  coverBackgroundColor,
  duration = 250,
  onOpenAnimationComplete = () => {},
  onCloseAnimationComplete = () => {},
}) => {
  const animated = useRef(new Animated.Value(open ? 1 : 0)).current;
  const prevOpen = usePrevious(open);
  const update = useUpdate();

  useUpdateEffect(() => {
    if (open) {
      Animated.timing(animated, {
        toValue: 1,
        duration,
        useNativeDriver,
      }).start(onOpenAnimationComplete);
    } else {
      Animated.timing(animated, {
        toValue: 0,
        duration,
        useNativeDriver,
      }).start(() => {
        update();
        onCloseAnimationComplete();
      });
    }
  }, [open]);

  return (
    <>
      <View style={styles.childrenContainer}>{children}</View>
      {!!(open || prevOpen) && (
        <TouchableWithoutFeedback onPress={open ? onClose : null}>
          <Animated.View
            style={[
              styles.cover,
              !coverBackgroundColor
                ? null
                : {
                    backgroundColor: coverBackgroundColor,
                  },
              {
                opacity: animated,
              },
            ]}
          />
        </TouchableWithoutFeedback>
      )}
      <Animated.View
        style={[
          styles.menu,
          menuPosition === 'right' ? styles.menuRight : styles.menuLeft,
          {
            width: menuWidth,
            transform: [
              {
                translateX: animated.interpolate({
                  inputRange: [0, 1],
                  outputRange:
                    (menuPosition === 'right') === !I18nManager.isRTL
                      ? [menuWidth, 0]
                      : [menuWidth * -1, 0],
                }),
              },
            ],
          },
        ]}
      >
        {menu}
      </Animated.View>
    </>
  );
};

export default SideMenu;
