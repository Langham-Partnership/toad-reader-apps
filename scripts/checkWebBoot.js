// Loads a web export (npx expo export --platform web) in jsdom, with the network
// blocked. Fails when the bundle throws while it loads, when start-up does not
// get past its spinner, or when the first screen throws while it renders.
// Not covered: anything behind the sign-in. Without a session the first screen
// is the hand-over to the sign-in page: no library, no menu and no reader.
// Usage: node scripts/checkWebBoot.js [export folder] [seconds to wait for the first screen]

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom'); // installed with jest-environment-jsdom

const exportDir = path.resolve(process.argv[2] || 'dist');
const timeout = (Number(process.argv[3]) || 30) * 1000;
const settleTime = 2000;

const html = fs.readFileSync(path.join(exportDir, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(
  ([, src]) => src,
);

const errors = [];
const rejections = [];
let blockedRequests = 0;

const describeError = (error) => String((error && error.stack) || error);

const { window } = new JSDOM(html, {
  url: 'https://web-boot-check.test/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  virtualConsole: new VirtualConsole(), // the app's console output is dropped
});

// Web APIs that jsdom does not provide and Node does
[
  'TextEncoder',
  'TextDecoder',
  'structuredClone',
  'ReadableStream',
  'Request',
  'Response',
  'BroadcastChannel',
  'MessageChannel',
].forEach((name) => {
  window[name] = globalThis[name];
});

// Browser APIs that jsdom does not provide at all
class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = Observer;
window.IntersectionObserver = Observer;
window.Worker = class {
  postMessage() {}
  terminate() {}
};
window.URL.createObjectURL = () => 'blob:web-boot-check';
window.URL.revokeObjectURL = () => {};
// Fonts count as loaded at once. Without this the app waits 12 seconds for its
// icon fonts before it leaves the start-up spinner
window.document.fonts = { load: () => Promise.resolve([{}]) };
window.matchMedia = () => ({
  matches: false,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
});

// No request leaves the machine
window.fetch = () => {
  blockedRequests++;
  return Promise.reject(new TypeError('Network request failed'));
};
window.XMLHttpRequest.prototype.send = function () {
  blockedRequests++;
  setTimeout(() => this.dispatchEvent(new window.ProgressEvent('error')), 0);
};
window.WebSocket = undefined;

// Errors thrown later, from timers, event handlers and rendering
window.addEventListener('error', ({ error, message }) => {
  errors.push(describeError(error || message));
});
// Rejected promises are expected, because the network is blocked. They are only
// reported when start-up does not finish, where one of them may be the cause
process.on('unhandledRejection', (reason) => {
  rejections.push(describeError(reason));
});

const finish = () => {
  const root = window.document.getElementById('root');
  const elements = root ? root.querySelectorAll('*').length : 0;
  if (elements === 0) {
    errors.push('Nothing was rendered under #root.');
  }

  console.log(`Web boot check of ${exportDir}`);
  console.log(`  scripts loaded: ${scripts.length}`);
  console.log(`  elements under #root: ${elements}`);
  console.log(`  text under #root: ${root ? root.textContent.trim() : ''}`);
  console.log(`  network requests blocked: ${blockedRequests}`);
  console.log(`  errors: ${errors.length}`);
  errors.forEach((error) => console.log(`\n${error}`));
  process.exit(errors.length === 0 ? 0 : 1);
};

try {
  scripts.forEach((src) => {
    window.eval(fs.readFileSync(path.join(exportDir, src), 'utf8'));
  });
} catch (error) {
  errors.push(describeError(error));
  finish();
}

// Wait for the first screen, then a little longer for errors that follow it.
// The start-up spinner has no text and the first screen has, so text under
// #root means that start-up is over
const startedAt = Date.now();
const poll = setInterval(() => {
  const root = window.document.getElementById('root');
  const started = root && root.textContent.trim() !== '';
  const timedOut = Date.now() - startedAt > timeout;
  if (started || timedOut || errors.length > 0) {
    clearInterval(poll);
    if (timedOut && !started) {
      errors.push(
        [
          `No first screen after ${timeout / 1000} seconds: the app did not get past its start-up spinner.`,
          ...rejections.map((rejection) => `Rejected promise: ${rejection}`),
        ].join('\n'),
      );
    }
    setTimeout(finish, started ? settleTime : 0);
  }
}, 100);
