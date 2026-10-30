import appConfig from './app.config';

const pluginNames = (config) =>
  config.plugins.map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin));

const sentryOptions = (config) =>
  config.plugins.find(
    (plugin) =>
      Array.isArray(plugin) && plugin[0] === '@sentry/react-native/expo',
  )[1];

describe('app.config.js', () => {
  it('adds the Sentry plugin when the tenant names its Sentry project', () => {
    const config = appConfig({
      config: {
        plugins: ['expo-notifications'],
        extra: { SENTRY_ORG: 'atxanka', SENTRY_PROJECT: 'langham-ereader' },
      },
    });
    expect(pluginNames(config)).toEqual([
      'expo-notifications',
      '@sentry/react-native/expo',
    ]);
    expect(sentryOptions(config)).toEqual({
      url: 'https://sentry.io',
      organization: 'atxanka',
      project: 'langham-ereader',
      experimental_android: { enableAndroidGradlePlugin: true },
    });
  });

  it('leaves the Sentry plugin out when the tenant has no Sentry project', () => {
    expect(
      pluginNames(appConfig({ config: { extra: { SENTRY_ORG: 'atxanka' } } })),
    ).toEqual([]);
    expect(pluginNames(appConfig({ config: {} }))).toEqual([]);
  });

  it('does not add the Sentry plugin twice', () => {
    const config = appConfig({
      config: {
        plugins: [['@sentry/react-native/expo', { project: 'own' }]],
        extra: { SENTRY_ORG: 'atxanka', SENTRY_PROJECT: 'langham-ereader' },
      },
    });
    expect(config.plugins).toEqual([
      ['@sentry/react-native/expo', { project: 'own' }],
    ]);
  });

  it('still builds the splash plugin from the splash key', () => {
    const config = appConfig({
      config: {
        splash: { image: './splash.png', backgroundColor: '#fff' },
        extra: { SENTRY_ORG: 'atxanka', SENTRY_PROJECT: 'langham-ereader' },
      },
    });
    expect(pluginNames(config)).toEqual([
      'expo-splash-screen',
      '@sentry/react-native/expo',
    ]);
    expect(config.plugins[0][1]).toMatchObject({
      image: './splash.png',
      backgroundColor: '#fff',
      imageWidth: 288,
    });
  });

  it('does not change the tenant config it was given', () => {
    const plugins = ['expo-notifications'];
    appConfig({
      config: {
        plugins,
        extra: { SENTRY_ORG: 'atxanka', SENTRY_PROJECT: 'langham-ereader' },
      },
    });
    expect(plugins).toEqual(['expo-notifications']);
  });
});
