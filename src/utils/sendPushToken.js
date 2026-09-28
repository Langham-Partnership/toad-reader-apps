import Constants from 'expo-constants';

import {
  getDataOrigin,
  getReqOptionsWithAdditions,
  safeFetch,
} from './toolbox';
import { getAccountsToNotify } from './pushTokenAccounts';

// Registers the device's Expo push token with the server for one account. previousToken, when given, is the token this
// device held before; the server retires it for this user (READER-145). Resolves true if the server accepted it.
export const sendPushTokenToServer = async ({
  idp,
  cookie,
  token,
  previousToken,
}) => {
  try {
    const response = await safeFetch(
      `${getDataOrigin(idp)}/addpushtoken`,
      getReqOptionsWithAdditions({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cookie-override': cookie,
        },
        body: JSON.stringify(
          previousToken ? { token, previousToken } : { token },
        ),
      }),
    );
    return !!(response && response.ok);
  } catch {
    return false;
  }
};

// The persisted redux state (accounts, idps) is loaded from disk after launch. Reading it before that would find no
// accounts, and the token would not reach the server on this launch.
const waitForRehydration = (store) =>
  new Promise((resolve) => {
    const isRehydrated = () => {
      const { _persist } = store.getState() || {};
      return !_persist || _persist.rehydrated;
    };
    if (isRehydrated()) return resolve();
    const unsubscribe = store.subscribe(() => {
      if (isRehydrated()) {
        unsubscribe();
        resolve();
      }
    });
  });

// Sends the token for every logged-in account on the device. Resolves the number of accounts tried and the number
// that accepted, so the caller knows whether a token waiting to be retired has actually been retired.
export const sendPushTokenToAllAccounts = async ({
  store,
  token,
  previousToken,
}) => {
  await waitForRehydration(store);
  const { accounts, idps } = store.getState();
  const targets = getAccountsToNotify(
    accounts,
    idps,
    Constants.expoConfig?.extra?.IDPS,
  );
  const results = await Promise.all(
    targets.map(({ idp, cookie }) =>
      sendPushTokenToServer({ idp, cookie, token, previousToken }),
    ),
  );
  return { tried: targets.length, accepted: results.filter(Boolean).length };
};
