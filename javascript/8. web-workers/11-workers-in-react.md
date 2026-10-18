# Lesson 11 — Workers inside React

Level: intermediate. Where to create a worker in a component so it's made once and cleaned up, what StrictMode does to it, and a small hook for Kabir's blur. Written against React 19 with Vite 8.

## 1. Where the worker is created decides how many you get

A React component is a function that runs again on every render. Kabir's first attempt created the worker at the top of it:

```jsx
function Editor() {
  const worker = new Worker(new URL('./blur.worker.js', import.meta.url), { type: 'module' });
  // …
}
```

Every render ran that line again, and every render hired a new cook. Kabir counted workers created and terminated (by wrapping the `Worker` class) while rendering three versions of a component five times each, then unmounting it:

```
worker in component body       : 5 renders -> created 5, terminated 0, still alive 5
worker in component body       : after unmount -> still alive 5
worker in useMemo, StrictMode  : 5 renders -> created 2, terminated 0, still alive 2
worker in useMemo, StrictMode  : after unmount -> still alive 2
worker in useEffect, StrictMode: 5 renders -> created 2, terminated 1, still alive 1
worker in useEffect, StrictMode: after unmount -> still alive 0
```

In the component body: five renders, five workers, all still running after the component was gone. Nothing ever stops them ([lesson 4](04-errors-and-shutting-down.md) §6), so in a real editor with a render on every slider move, that's hundreds of idle threads, each with its own memory.

`useMemo(() => new Worker(…), [])` looks like the fix, since it's meant to compute something once. It did stop the per-render workers, but two were created (the next section explains why) and both were still alive after unmount. `useMemo` has no cleanup step, so there's nowhere to call `terminate()`.

`useEffect` is the right place. An effect runs after the component appears on the page, and the function it returns runs when the component goes away:

```jsx
useEffect(() => {
  const worker = new Worker(new URL('./blur.worker.js', import.meta.url), { type: 'module' });
  return () => worker.terminate();
}, []);
```

One worker alive while the component is on screen, zero after it's gone. The cook is hired when the restaurant opens and sent home when it closes.

## 2. Why StrictMode made two

In development, `<StrictMode>` deliberately runs each effect twice when a component first appears: set up, clean up, set up again. It's a test. If your cleanup doesn't properly undo your setup, you'll see the bug straight away in development instead of weeks later in production.

For the `useEffect` version, the test passes: worker 1 was created and terminated, and worker 2 is the one in use (`created 2, terminated 1`). For `useMemo`, StrictMode also calls the function twice, and since there's no cleanup, it left an extra worker behind. That's StrictMode doing its job: it surfaced a leak that would otherwise have happened quietly whenever React threw a memo away. In a production build, effects run once and only one worker is created.

## 3. A hook for the blur

Kabir wraps it all in a hook. It combines the effect from §1 with the "latest answer wins" rule from [lesson 6](06-request-and-response.md) §4 and a transfer from [lesson 7](07-transferring-instead-of-copying.md):

```js
// useBlur.js
import { useEffect, useRef, useState } from 'react';

export function useBlur(image, radius) {
  const workerRef = useRef(null);
  const latestId = useRef(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const worker = new Worker(new URL('./blur.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => {
      if (event.data.id !== latestId.current) return; // an old answer: ignore it
      setResult(event.data);
    };
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    if (!image) return;
    const id = ++latestId.current;
    const pixels = image.data.slice();
    workerRef.current.postMessage(
      { id, pixels, width: image.width, height: image.height, radius },
      [pixels.buffer],
    );
  }, [image, radius]);

  return result;
}
```

```js
// blur.worker.js
import { blur } from './blur.js';

self.onmessage = (event) => {
  const { id, pixels, width, height, radius } = event.data;
  const out = blur(pixels, width, height, radius);
  self.postMessage({ id, radius, out }, [out.buffer]);
};
```

A few choices worth spelling out.

The worker lives in a **ref**, not in state. Changing a ref doesn't cause a re-render, and nothing on screen depends on which worker object it is.

The first effect has an empty dependency list, so it runs once per mount. The second runs whenever the image or radius changes and just sends a request. Keeping them apart means a new radius sends a message to the existing worker instead of tearing it down and starting a new one.

`image.data.slice()` makes a copy to transfer. The `ImageData` belongs to the component and is used again on the next render, so transferring its own buffer would leave it empty ([lesson 7](07-transferring-instead-of-copying.md) §3). The copy is the price of keeping the original.

`latestId` is a ref too, so the `onmessage` handler, created once, always reads the current value. If it were a plain variable captured in that first effect, the handler would compare against the value from the first render forever.

## 4. The slider, in React

Kabir rendered an editor using the hook under StrictMode, and changed the radius from 1 to 5, 30 ms apart, the way a dragged slider would:

```jsx
function Editor({ radius }) {
  const result = useBlur(image, radius);
  useEffect(() => { if (result) console.log(`showing blur with radius ${result.radius}`); }, [result]);
  return <p>radius {radius}</p>;
}
```

```
showing blur with radius 5
useBlur under StrictMode: created 2, terminated 1
```

Only the final blur reached the screen. The earlier answers arrived and were dropped by the id check, so the component never flashed through radius 1, 2, 3 and 4. And there was one worker in use, with StrictMode's test copy properly cleaned up.

The worker still *computed* the stale blurs, as in lesson 6 §4. If that wasted time matters, the terminate-and-restart trick from lesson 6 §5 fits inside the second effect.

## 5. One worker per component, or one for the app

This hook gives each component its own worker. That's the right default: its lifetime matches the component, and StrictMode can check the cleanup. But if ten thumbnails on a page each call `useBlur`, that's ten workers, and a pool ([lesson 8](08-worker-pools.md)) would do the job with fewer.

For that, create the pool once, in a module of its own, outside any component. The pool from lesson 8 takes a URL and calls `new Worker(url)` itself, which hides the `new Worker(new URL(…, import.meta.url))` shape the bundler looks for ([lesson 5](05-module-workers-and-bundlers.md) §2), so Kabir changes it to take a function that creates one worker:

```js
// blurPool.js
const createWorker = () =>
  new Worker(new URL('./blur.worker.js', import.meta.url), { type: 'module' });

export const blurPool = new WorkerPool(createWorker, 4);   // the constructor calls createWorker() 4 times
```

Every component that imports `blurPool` shares the same workers, and it's created once however many times components render or StrictMode re-runs effects. The trade-off is that nothing ever terminates it; it lives as long as the page. For something the whole app uses, that's what you want. Components then just call `blurPool.run(…)` in an effect and ignore answers that arrive after they've unmounted or moved on.
