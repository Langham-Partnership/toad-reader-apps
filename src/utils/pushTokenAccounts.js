// READER-145. Which of the device's accounts the push token has to be sent to, and at which server.
//
// Kept free of React Native imports so it can be tested on its own. Account ids are `${idpId}:${userId}`. The no-login
// account has a negative user id and no server session, and an account that has to log in again has no valid cookie,
// so neither can register a token; the token reaches them at their next login through ADD_ACCOUNT instead.
//
// coreIdps is the build's own IDPS config. It is laid over the persisted idps the same way the idps reducer's
// AUTO_UPDATE_CORE_IDPS does (the build wins unless the persisted idp is locked), because this runs at launch, before
// Library has dispatched that update: on the first launch after an upgrade, the persisted idp still names the data
// origin of the build being replaced.
export const getAccountsToNotify = (accounts = {}, idps = {}, coreIdps = {}) =>
  Object.keys(accounts || {})
    .map((accountId) => {
      const [idpId, userId] = accountId.split(':');
      const accountInfo = (accounts || {})[accountId] || {};
      const persistedIdp = (idps || {})[idpId];
      const coreIdp = (coreIdps || {})[idpId];
      const idp =
        coreIdp && !(persistedIdp || {}).locked
          ? { ...persistedIdp, ...coreIdp }
          : persistedIdp;
      return {
        accountId,
        idp,
        userId: parseInt(userId, 10),
        cookie: accountInfo.cookie,
        accountInfo,
      };
    })
    .filter(
      ({ idp, userId, cookie, accountInfo }) =>
        idp && userId > 0 && !!cookie && !accountInfo.needToLogInAgain,
    )
    .map(({ accountId, idp, cookie }) => ({ accountId, idp, cookie }));

// READER-145 review (Joel Cross on #2). The slot for "the old token the server still has to retire" holds one token.
//
// When the device's token changes, the slot keeps the token it already holds rather than being overwritten: that is
// the oldest token not yet retired, the one a server may still have. A later token that never reached a server has
// nothing to retire.
export const pendingTokenAfterChange = (pending, oldToken) =>
  pending || (oldToken && oldToken !== 'none' ? oldToken : null);

// The previousToken to send along with token: the pending one, unless it is the token itself.
export const previousTokenToSend = (pending, token) =>
  pending && pending !== token ? pending : null;

// The pending token may be forgotten only once it was actually sent as previousToken and every server tried accepted
// it. Sending the current token alone (previousToken null) says nothing about the old one, so it must stay.
export const canForgetPendingToken = ({ previousToken, tried, accepted }) =>
  !!previousToken && tried > 0 && accepted === tried;
