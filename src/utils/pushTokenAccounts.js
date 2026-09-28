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
