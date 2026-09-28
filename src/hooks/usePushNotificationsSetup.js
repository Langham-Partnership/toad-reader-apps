import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import usePushToken, {
  PUSH_TOKEN_KEY,
  PUSH_TOKEN_TO_RETIRE_KEY,
} from './usePushToken';
import { sendPushTokenToAllAccounts } from '../utils/sendPushToken';

// READER-145. The Expo push token is requested on EVERY launch, with the Expo project the build carries, and registered
// with the server for every logged-in account on every launch. It used to be requested once and cached for ever, so a
// device that upgraded to a build under a different Expo project (BibleMesh's to Langham's) kept a token issued under
// the old project, and the server kept sending to it. It also used to reach the server only at login.
//
// Permission is still asked for only once: on the first launch with no cached token, as before. Later launches never
// prompt; they only read the permission already given.
const usePushNotificationsSetup = (store) => {
  const { pushToken, refreshToken } = usePushToken();
  const checkedThisLaunch = useRef(false);

  useEffect(() => {
    if (!Device.isDevice || Platform.OS === 'web') return;
    if (pushToken === undefined) return; // the cached value has not been read yet
    if (checkedThisLaunch.current) return;
    checkedThisLaunch.current = true;

    (async () => {
      try {
        // Set up Android notification channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            sound: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
          });
        }

        // Check permissions, and ask only when no token has ever been cached
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted' && pushToken === 'none') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        // Handle iOS provisional status and Android granted status
        if (finalStatus !== 'granted' && finalStatus !== 'provisional') {
          if (pushToken === 'none') {
            console.warn(
              `Push notifications setup failed: Permissions not granted (${finalStatus})`,
            );
          }
          return;
        }

        const { data: token } = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        if (!token) return;

        if (token !== pushToken) {
          if (pushToken !== 'none') {
            // Remember the old token until the server has retired it
            await AsyncStorage.setItem(PUSH_TOKEN_TO_RETIRE_KEY, pushToken);
          }
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
          await refreshToken(); // Update UI immediately
        }

        // Registered on every launch, not only when the token changes. The server upserts, so repeating it is harmless,
        // and it heals a login whose registration failed or a row the server retired while the device was away.
        if (store) {
          const tokenToRetire = await AsyncStorage.getItem(
            PUSH_TOKEN_TO_RETIRE_KEY,
          );
          const { tried, accepted } = await sendPushTokenToAllAccounts({
            store,
            token,
            previousToken:
              tokenToRetire && tokenToRetire !== token ? tokenToRetire : null,
          });
          // Forget the old token only once a server has actually retired it. With no logged-in account, keep it: the
          // next login sends it (ADD_ACCOUNT).
          if (tokenToRetire && tried > 0 && accepted === tried) {
            await AsyncStorage.removeItem(PUSH_TOKEN_TO_RETIRE_KEY);
          }
        }
      } catch (error) {
        console.error('Push notifications setup failed:', {
          message: error?.message,
          code: error?.code,
          name: error?.name,
          stack: error?.stack,
        });
      }
    })();
  }, [pushToken]);
};

export default usePushNotificationsSetup;
