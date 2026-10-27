// READER-182. Only the reader's own messages are parsed; anything else posted into the page is ignored.
//
//     npx jest src/utils/postMessage.test.js

import { parseReaderMessage } from './postMessage';

describe('parseReaderMessage', () => {
  it('parses a reader message', () => {
    expect(
      parseReaderMessage('{"identifier":"loaded","payload":{"a":1}}'),
    ).toEqual({ identifier: 'loaded', payload: { a: 1 } });
  });

  it('ignores a plain string from a browser extension (Sentry: "GET_URL")', () => {
    expect(parseReaderMessage('GET_URL')).toBeNull();
  });

  it('ignores an object message (Sentry: "[object Object]")', () => {
    expect(parseReaderMessage({ type: 'something' })).toBeNull();
  });

  it('ignores valid JSON that is not a reader message', () => {
    expect(parseReaderMessage('null')).toBeNull();
    expect(parseReaderMessage('123')).toBeNull();
    expect(parseReaderMessage('{"type":"x"}')).toBeNull();
  });
});
