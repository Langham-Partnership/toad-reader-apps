const hasPlugin = (plugins, name) =>
  plugins.some(
    (plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === name,
  );

module.exports = ({ config }) => {
  const plugins = [...(config.plugins || [])];

  // From SDK 56 prebuild ignores the top-level splash key of the tenant's
  // app.json. The tenant files keep that key (Splash.js reads it, and they are
  // shared with branches on older SDKs), so the plugin entry is built from it
  // here.
  const { image, backgroundColor, resizeMode } = config.splash || {};

  if (image && !hasPlugin(plugins, 'expo-splash-screen')) {
    plugins.push([
      'expo-splash-screen',
      {
        image,
        backgroundColor,
        resizeMode,
        // Android draws the image inside a square of 288 dp. Filling that
        // square is the closest it gets to the full screen image in
        // Splash.js.
        imageWidth: 288,
        // iOS: full screen image, as before SDK 56 and as in Splash.js.
        enableFullScreenImage_legacy: true,
      },
    ]);
  }

  // Sentry uploads in EAS builds. Needs SENTRY_AUTH_TOKEN.
  const { SENTRY_ORG, SENTRY_PROJECT } = config.extra || {};

  if (
    SENTRY_ORG &&
    SENTRY_PROJECT &&
    !hasPlugin(plugins, '@sentry/react-native/expo')
  ) {
    plugins.push([
      '@sentry/react-native/expo',
      {
        url: 'https://sentry.io',
        organization: SENTRY_ORG,
        project: SENTRY_PROJECT,
        // ProGuard mappings need the Sentry Android Gradle Plugin
        experimental_android: { enableAndroidGradlePlugin: true },
      },
    ]);
  }

  return { ...config, plugins };
};
