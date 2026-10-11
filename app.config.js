// From SDK 56 prebuild ignores the top-level splash key of the tenant's
// app.json. The tenant files keep that key (Splash.js reads it, and they are
// shared with branches on older SDKs), so the plugin entry is built from it
// here.
module.exports = ({ config }) => {
  const { image, backgroundColor, resizeMode } = config.splash || {};
  const plugins = config.plugins || [];

  const hasSplashPlugin = plugins.some(
    (plugin) =>
      (Array.isArray(plugin) ? plugin[0] : plugin) === 'expo-splash-screen',
  );

  if (!image || hasSplashPlugin) return config;

  return {
    ...config,
    plugins: [
      ...plugins,
      [
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
      ],
    ],
  };
};
