// READER-145. Which accounts a changed push token is sent to.
//
//     npx jest src/utils/pushTokenAccounts.test.js

import { getAccountsToNotify } from './pushTokenAccounts';

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
