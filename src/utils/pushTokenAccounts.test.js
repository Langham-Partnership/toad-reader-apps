// READER-145. Which accounts a changed push token is sent to.
//
//     npx jest src/utils/pushTokenAccounts.test.js

import {
  canForgetPendingToken,
  getAccountsToNotify,
  pendingTokenAfterChange,
  previousTokenToSend,
} from './pushTokenAccounts';

const idps = { 43: { id: 43, domain: 'readlangham.org' } };

describe('getAccountsToNotify', () => {
  it('sends to a logged-in account with a session cookie', () => {
    const accounts = { '43:70873': { cookie: 'connect.sid=abc' } };
    expect(getAccountsToNotify(accounts, idps)).toEqual([
      { accountId: '43:70873', idp: idps[43], cookie: 'connect.sid=abc' },
    ]);
  });

  it('skips the no-login account, which has a negative user id and no server session', () => {
    expect(getAccountsToNotify({ '43:-43': { cookie: 'x' } }, idps)).toEqual(
      [],
    );
  });

  it('skips an account that has to log in again, since its cookie is no longer valid', () => {
    expect(
      getAccountsToNotify(
        { '43:70873': { cookie: 'x', needToLogInAgain: true } },
        idps,
      ),
    ).toEqual([]);
  });

  it('skips an account with no cookie, or one whose idp is unknown', () => {
    expect(
      getAccountsToNotify({ '43:1': {}, '99:2': { cookie: 'x' } }, idps),
    ).toEqual([]);
  });

  it('returns nothing before the persisted state has anything in it', () => {
    expect(getAccountsToNotify(undefined, undefined)).toEqual([]);
  });

  it("uses the build's own idp over the persisted one, so the first launch after an upgrade reaches the new server", () => {
    const persisted = { 43: { id: 43, domain: 'langham.biblemesh.com' } };
    const core = { 43: { id: 43, domain: 'readlangham.org' } };
    const [target] = getAccountsToNotify(
      { '43:70873': { cookie: 'x' } },
      persisted,
      core,
    );
    expect(target.idp.domain).toBe('readlangham.org');
  });

  it('keeps a locked persisted idp, as the idps reducer does', () => {
    const persisted = {
      43: { id: 43, domain: 'custom.example.org', locked: true },
    };
    const core = { 43: { id: 43, domain: 'readlangham.org' } };
    const [target] = getAccountsToNotify(
      { '43:70873': { cookie: 'x' } },
      persisted,
      core,
    );
    expect(target.idp.domain).toBe('custom.example.org');
  });
});

// The two scenarios from Joel Cross's review on toad-reader-apps#2.
describe('the pending token to retire', () => {
  it('keeps the first un-retired token when the token changes again before the server has retired it', () => {
    // T0 -> T1 while the server is unreachable: T0 waits.
    const afterFirst = pendingTokenAfterChange(null, 'T0');
    expect(afterFirst).toBe('T0');
    // T1 -> T2 before T0 was retired: T0 must still be the one sent, not T1.
    expect(pendingTokenAfterChange(afterFirst, 'T1')).toBe('T0');
  });

  it('has nothing to wait for when the device never had a token', () => {
    expect(pendingTokenAfterChange(null, 'none')).toBeNull();
    expect(pendingTokenAfterChange(null, undefined)).toBeNull();
  });

  it('sends the pending token as previousToken, unless it is the current token', () => {
    expect(previousTokenToSend('T0', 'T2')).toBe('T0');
    expect(previousTokenToSend('T1', 'T1')).toBeNull();
    expect(previousTokenToSend(null, 'T1')).toBeNull();
  });

  it('is not forgotten by a login that sent no previousToken, even when the server accepted it', () => {
    // A login during the upgrade launch reads T1 from both keys, so it sends T1 alone and gets a 200.
    const previousToken = previousTokenToSend('T1', 'T1');
    expect(
      canForgetPendingToken({ previousToken, tried: 1, accepted: 1 }),
    ).toBe(false);
  });

  it('is forgotten only once every server tried has accepted it', () => {
    expect(
      canForgetPendingToken({ previousToken: 'T0', tried: 2, accepted: 2 }),
    ).toBe(true);
    expect(
      canForgetPendingToken({ previousToken: 'T0', tried: 2, accepted: 1 }),
    ).toBe(false);
    expect(
      canForgetPendingToken({ previousToken: 'T0', tried: 0, accepted: 0 }),
    ).toBe(false);
  });
});
