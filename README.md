# Installation

1. `npm i` (using Node 22)
2. Add tenants > toadreader from the zip file
3. In `toadreader/app.js`, update the `DEV_DATA_ORIGIN_OVERRIDE` value with server's IP address
4. `npm run change-tenant toadreader`

# Development

`npm start`

# Updating Staging, Beta, and Production

See `package.json` scripts.

## Sentry source maps and debug files

The Sentry organisation and project come from `SENTRY_ORG` and `SENTRY_PROJECT` in the tenant's `app.json` (`extra`). When both are set, `app.config.js` adds the `@sentry/react-native/expo` plugin. Every upload needs a Sentry organisation token with source map upload rights.

- **Web and OTA pushes** read the token from `.env.sentry` in the project root (gitignored):

  ```
  SENTRY_AUTH_TOKEN=<token>
  ```

  The web pushes upload the maps and then delete them from `web-build` before anything is copied to S3. Without the file, or if the upload fails, the push stops before S3. The OTA pushes upload the maps from `dist` after `eas update`.

- **EAS builds** upload JS source maps, iOS dSYMs and Android ProGuard mappings during the build. `SENTRY_AUTH_TOKEN` must be a secret EAS environment variable in both the `production` and `preview` environments, or release builds fail at the upload step. EAS picks the environment per profile: `staging` uses `production`, while `production`, `beta` and `staging-test` use `preview`. The `development` profile skips the upload (`SENTRY_DISABLE_AUTO_UPLOAD`).

# Demo

[toadreader.com/demo](https://toadreader.com/demo/)

# License

[AGPL-3.0](https://opensource.org/licenses/AGPL-3.0) ([summary](<https://tldrlegal.com/license/gnu-affero-general-public-license-v3-(agpl-3.0)>))
