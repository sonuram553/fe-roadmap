# Lesson 3 — Inside a worker

Level: beginner. What a worker's global scope has and doesn't have, how its URLs resolve, and why it keeps working when the page is busy.

## 1. A kitchen with no view of the dining room

The cook can use everything in the kitchen: the stove, the knives, the phone to call a supplier. What the cook can't do is see the dining room or touch anything in it. A worker is the same. It is a full JavaScript environment, but the page itself is on the other side of the wall.

Kabir had a worker check a list of globals and report which ones exist:

```js
// scope-worker.js
const names = ['window', 'document', 'localStorage', 'sessionStorage', 'alert', 'requestAnimationFrame',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'indexedDB', 'caches', 'setTimeout', 'setInterval', 'queueMicrotask',
  'crypto', 'navigator', 'location', 'performance', 'BroadcastChannel', 'OffscreenCanvas', 'createImageBitmap',
  'Worker', 'importScripts', 'structuredClone', 'console'];
const have = [], missing = [];
for (const n of names) (typeof self[n] === 'undefined' ? missing : have).push(n);
self.postMessage({ have, missing });
```

```
available: requestAnimationFrame, fetch, XMLHttpRequest, WebSocket, indexedDB, caches, setTimeout, setInterval, queueMicrotask, crypto, navigator, location, performance, BroadcastChannel, OffscreenCanvas, createImageBitmap, Worker, importScripts, structuredClone, console
missing: window, document, localStorage, sessionStorage, alert
```

The missing list is short and it is all about the page: no `window`, no `document` (so no elements, no `querySelector`, no events on buttons), no `localStorage` or `sessionStorage`, no `alert`. Everything else is there. A worker can make network requests, open WebSockets, read and write IndexedDB, use timers and `crypto`, and even start workers of its own.

Two surprises in the available list. `requestAnimationFrame` exists in a dedicated worker in Chrome, which only makes sense once the worker has something to draw on; [lesson 10](10-offscreen-canvas.md) gives it one. And `OffscreenCanvas` means a worker can draw and encode images without any page canvas at all.

`localStorage` is missing because it is synchronous: reading it blocks until the value is there, and letting several threads block on the same storage would cause exactly the problems workers are meant to avoid. If a worker needs a saved setting, the page can read it and send it in a message, or both sides can use IndexedDB, which is asynchronous and works in both.

## 2. `self`, and giving a worker a name

In a worker, the global object is `self`. The same worker also reported:

```
scope: DedicatedWorkerGlobalScope | self === globalThis: true | name: blur-crew
```

`self` and `globalThis` are the same object, so `self.onmessage = …` and plain `onmessage = …` do the same thing. Its type is `DedicatedWorkerGlobalScope`: "dedicated" because it belongs to the one page that created it (a shared worker, in [lesson 11](11-shared-workers.md), has a different scope).

The name came from an option Kabir passed when creating it:

```js
const worker = new Worker('scope-worker.js', { name: 'blur-crew' });
```

The worker can read it as `self.name`, but the real use is debugging: DevTools lists workers by name, which beats a list of identical file names once there are several of them.

## 3. Relative URLs start from the worker's file

The worker's `location` is its own script, not the page:

```
location: http://localhost:5299/e03/scope-worker.js | cores: 10
```

So `importScripts('blur.js')` and `fetch('data.json')` inside the worker resolve relative to the *worker file's* folder. If Kabir keeps the page at `/index.html` and the worker at `/workers/blur-worker.js`, then `importScripts('blur.js')` looks for `/workers/blur.js`. That trips people up when they move a worker into a subfolder.

`navigator.hardwareConcurrency` (the `cores: 10`) is how many threads the machine can run at once. It matters in [lesson 8](08-worker-pools.md).

## 4. The kitchen has its own clock

Each worker has its own event loop, completely separate from the page's. Its timers, promises and message handlers take turns on its own thread, and nothing the page does can pause them.

Kabir showed this with a worker that posts a message every 100 ms, while the page blocks itself for half a second in the middle:

```js
// ticker.js
let n = 0;
const id = setInterval(() => {
  n++;
  self.postMessage({ n, sentAt: /* ms since start */ });
  if (n === 8) clearInterval(id);
}, 100);
```

```js
// on the page, 250 ms in: a busy loop for 500 ms
setTimeout(() => {
  const end = performance.now() + 500;
  while (performance.now() < end) {}
}, 250);
```

```
tick 1: worker sent at ~105 ms, main received at 112 ms
tick 2: worker sent at ~203 ms, main received at 209 ms
main thread was busy from ~250 to ~750 ms
tick 3: worker sent at ~306 ms, main received at 752 ms
tick 4: worker sent at ~406 ms, main received at 752 ms
tick 5: worker sent at ~506 ms, main received at 752 ms
tick 6: worker sent at ~602 ms, main received at 752 ms
tick 7: worker sent at ~702 ms, main received at 752 ms
tick 8: worker sent at ~806 ms, main received at 813 ms
```

The worker kept to its schedule the whole time: 306, 406, 506, 602, 702. Its messages piled up on the page's side of the hatch, and the moment the page was free (752 ms) it handled all five in a row. Nothing was lost, only delayed.

This is the flip side of lesson 1. A worker protects the page from slow work, but it cannot protect a worker's *replies* from a slow page. If the main thread is busy, results just wait at the hatch.

## 5. The cook prepares, the waiter serves

Because the worker can't touch the page, every feature that uses one splits into two halves: the worker computes, and the page applies the result. For Kabir's blur, the worker returns pixels and the page puts them on the canvas:

```js
worker.onmessage = (event) => {
  const blurred = new ImageData(event.data, width, height);
  ctx.putImageData(blurred, 0, 0);
};
```

Keep the page half small. If most of the time is spent turning the worker's answer into DOM (building ten thousand table rows, for example), the worker hasn't helped much, because that part still runs on the main thread. Have the worker do as much of the preparation as it can, so the page only has to serve.

Before going further, Kabir needs to know what happens when the kitchen goes wrong, which is [lesson 4](04-errors-and-shutting-down.md).
