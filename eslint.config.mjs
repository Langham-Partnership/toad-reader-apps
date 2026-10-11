import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginReact from 'eslint-plugin-react';
import pluginReactNative from 'eslint-plugin-react-native';
import prettierConfig from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config([
  {
    ignores: ['web-build/', 'dist/', 'android/', 'ios/'], // Generated folders
  },
  pluginJs.configs.recommended, // Apply recommended ESLint rules
  tseslint.configs.recommended, // Apply recommended TypeScript rules
  prettierConfig, // Disable rules that conflict with Prettier
  pluginReact.configs.flat['jsx-runtime'],
  {
    files: ['./web-build-overrides/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: globals.browser, // Enable browser global variables
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        __DEV__: 'readonly', // __DEV__ comes from Expo, it will always be set in React code
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react: pluginReact,
      'react-native': pluginReactNative,
    },
    rules: {
      'react-native/no-unused-styles': 'error',
      'react-native/no-inline-styles': 'warn',
      'react-native/no-color-literals': 'warn',
      'react-native/no-raw-text': 'warn',
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    files: ['**/*.test.{js,ts,jsx,tsx}'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  {
    files: ['*.config.js', 'scripts/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
