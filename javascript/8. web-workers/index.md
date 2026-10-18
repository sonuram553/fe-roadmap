# Web worker lessons

A beginner-to-intermediate course on web workers: running JavaScript on a second thread so the page stays responsive.

The lessons follow Kabir building a photo editor that runs in the browser, starting with a Blur button that freezes the page. They build on each other, so read them in order.

**Beginner**

1. [Why web workers exist](01-why-workers.md): the main thread, a first worker, responsiveness versus speed, serving over HTTP
   - Aside: [How Kabir's blur works](box-blur.md): the box blur used as the example throughout, line by line
2. [Messages are copies](02-messages-are-copies.md): structured clone, what survives, what can't be sent, what copying costs
3. [Inside a worker](03-inside-a-worker.md): the global scope, `self`, relative URLs, the worker's own event loop
4. [Errors, and shutting a worker down](04-errors-and-shutting-down.md): `onerror` and what it misses, sending errors back, `terminate()` vs `close()`

**Intermediate**

5. [Module workers and bundlers](05-module-workers-and-bundlers.md): `type: 'module'`, the `new URL(…, import.meta.url)` pattern, Vite's `?worker`, inline Blob workers
6. [Asking and answering](06-request-and-response.md): request ids and promises, stale answers, cancelling, `MessageChannel`
7. [Handing data over instead of copying it](07-transferring-instead-of-copying.md): transfer lists, detached buffers, `ImageBitmap`
   - Aside: [Buffers and typed arrays](buffers-and-typed-arrays.md): views, offsets, clamping, `subarray()` vs `slice()`, and what a transfer actually moves
8. [Several cooks: worker pools](08-worker-pools.md): splitting work into strips, a small pool, real timings, how many workers
   - Aside: [How the worker pool works](worker-pool.md): the `WorkerPool` class piece by piece, and how `#pump()` moves jobs along
9. [Drawing from a worker with OffscreenCanvas](09-offscreen-canvas.md): animating while the main thread is frozen, forwarding input, exporting
10. [Shared workers, and where service workers fit](10-shared-workers.md): one worker for many tabs, ports that never say goodbye
11. [Workers inside React](11-workers-in-react.md): where to create the worker, StrictMode, a `useBlur` hook
