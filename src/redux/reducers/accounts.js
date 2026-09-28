import AsyncStorage from '@react-native-async-storage/async-storage';

import { setUser } from '../../utils/analytics';
import {
  PUSH_TOKEN_KEY,
  PUSH_TOKEN_TO_RETIRE_KEY,
} from '../../hooks/usePushToken';
import { sendPushTokenToServer } from '../../utils/sendPushToken';

const initialState = {};

export default function (state = initialState, action) {
  const newState = { ...state };

  switch (action.type) {
    case 'ADD_ACCOUNT': {
      const newAccountId = `${action.idpId}:${action.userId}`;
      const noLoginAccountId = `${action.idpId}:-${action.idpId}`;

      newState[newAccountId] = action.accountInfo;

      Object.keys(newState).forEach((accountId) => {
        if (
          newState[accountId].needToLogInAgain || // weed out needToLogInAgain accounts
          // weed out no-login accounts (unless the current add is no-login)
          (accountId === noLoginAccountId &&
            newAccountId !== noLoginAccountId) ||
          accountId !== newAccountId // at this point, make sure we are left to only the new account (just in case)
        ) {
          delete newState[accountId];
        }
      });

      // async send the server the push token, when applicable (fail silently)
      (async () => {
        const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
        if (token) {
          // READER-145: also hand over a token still waiting to be retired, for a device that changed token while
          // no account was logged in. It is forgotten only once the server has accepted it.
          const tokenToRetire = await AsyncStorage.getItem(
            PUSH_TOKEN_TO_RETIRE_KEY,
          );
          const previousToken =
            tokenToRetire && tokenToRetire !== token ? tokenToRetire : null;
          const accepted = await sendPushTokenToServer({
            idp: action.idp,
            cookie: action.accountInfo.cookie,
            token,
            previousToken,
          });
          if (accepted && tokenToRetire) {
            await AsyncStorage.removeItem(PUSH_TOKEN_TO_RETIRE_KEY);
          }
        }
      })();

      if (action.userId > 0) {
        setUser({
          userId: action.userId,
          properties: {
            name: action.accountInfo.fullname,
            email: action.accountInfo.email,
            admin: !!action.accountInfo.isAdmin,
          },
        });
      }

      return newState;
    }

    case 'UPDATE_ACCOUNT': {
      newState[action.accountId] = {
        ...state[action.accountId],
        ...action.accountInfo,
      };
      return newState;
    }

    case 'REMOVE_ACCOUNT': {
      delete newState[action.accountId];
      setUser();
      return newState;
    }

    case 'ADD_BOOKS': {
      newState[action.accountId].libraryHash = action.hash;
      return newState;
    }

    case 'DELETE_BOOK':
    case 'SET_SUBSCRIPTIONS': {
      // we no longer know the proper hash
      delete newState[action.accountId].libraryHash;
      return newState;
    }
  }

  return state;
}
