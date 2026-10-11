export {};

declare global {
  // eslint-disable-next-line no-var
  var __DEV__: boolean;
}

// Global test setup
global.__DEV__ = true;

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  ),
);

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { extra: {} },
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file://test/',
}));

// Mock inline-i18n
jest.mock('inline-i18n', () => ({
  i18n: (key: string, params?: Record<string, string>) => {
    if (params) {
      let result = key;
      Object.keys(params).forEach((param) => {
        result = result.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
      });
      return result;
    }
    return key;
  },
  getLocale: () => 'en',
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

// Mock UI Kitten components — manual mock lives in __mocks__/@ui-kitten/components.tsx
jest.mock('@ui-kitten/components');
