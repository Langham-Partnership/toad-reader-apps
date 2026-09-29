import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

export const PUSH_TOKEN_KEY = `pushToken`;
// READER-145. The token this device held before its token last changed, kept until the server has retired it, so an
// offline launch does not lose track of it.
export const PUSH_TOKEN_TO_RETIRE_KEY = `pushTokenToRetire`;

const usePushToken = () => {
  const [pushToken, setPushToken] = useState();

  const refreshToken = async () => {
    if (Device.isDevice) {
      try {
        const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
        const finalToken = storedToken || 'none';
        setPushToken(finalToken);
      } catch (error) {
        console.error('usePushToken - Error:', error);
        setPushToken('none');
      }
    }
  };

  useEffect(() => {
    refreshToken();
  }, []);

  return { pushToken, refreshToken };
};

export default usePushToken;
