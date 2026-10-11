// Loads a web export (npx expo export --platform web) in jsdom, with the network
// blocked, and fails when the bundle throws while it starts or renders nothing.
// Usage: node scripts/checkWebBoot.js [export folder] [seconds to wait for the first render]

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom'); // installed with jest-environment-jsdom

const exportDir = path.resolve(process.argv[2] || 'dist');
const timeout = Number(process.argv[3] || 30) * 1000;
const settleTime = 2000;

const html = fs.readFileSync(path.join(exportDir, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(
  ([, src]) => src,
);

const errors = [];
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
// Rejected promises are expected, because the network is blocked
process.on('unhandledRejection', () => {});

const finish = () => {
  const root = window.document.getElementById('root');
  const elements = root ? root.querySelectorAll('*').length : 0;
  if (elements === 0) {
    errors.push('Nothing was rendered under #root.');
  }

  console.log(`Web boot check of ${exportDir}`);
  console.log(`  scripts loaded: ${scripts.length}`);
  console.log(`  elements under #root: ${elements}`);
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

// Wait for the first render, then a little longer for errors that follow it
const startedAt = Date.now();
const poll = setInterval(() => {
  const root = window.document.getElementById('root');
  const rendered = root && root.childElementCount > 0;
  if (rendered || Date.now() - startedAt > timeout) {
    clearInterval(poll);
    setTimeout(finish, rendered ? settleTime : 0);
  }
}, 100);
