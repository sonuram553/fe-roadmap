# Lesson 4 — Errors, and shutting a worker down

Level: beginner. What the page sees when a worker throws, which errors it doesn't see, how to report errors properly, and the two ways a worker stops.

## 1. When the worker throws

Kabir's worker checks its input and throws on nonsense:

```js
// throws.js
self.onmessage = (event) => {
  const { radius } = event.data;
  if (radius < 0) throw new RangeError(`radius must be positive, got ${radius}`);
  self.postMessage('ok');
};
```

The page listens with `onerror`, next to `onmessage`:

```js
const worker = new Worker('throws.js');
worker.onerror = (e) => {
  console.log('onerror:', e.constructor.name, '|', e.message, '|', e.filename.split('/').pop() + ':' + e.lineno);
  console.log('e.error is', e.error);
};
worker.onmessage = (e) => console.log('message:', e.data);

worker.postMessage({ radius: -2 });
// a moment later
worker.postMessage({ radius: 3 });
```

```
onerror: ErrorEvent | Uncaught RangeError: radius must be positive, got -2 | throws.js:3
e.error is null
message: ok
```

Three things to notice.

The page got an `ErrorEvent` with a message, a file and a line number, but `e.error` is `null`. The actual `RangeError` object stayed in the worker. All the page has is a string that starts with `Uncaught RangeError:`, so it can't check `instanceof` or read any extra properties you put on the error.

The worker survived. The second message, with a valid radius, got `ok` back. A throw inside a message handler ends that one handler, not the worker. The cook burnt one dish and carried on with the next order.

And the error didn't stop at the worker object. It carried on to the page's own `window` `error` event, where a page-wide error logger would count it as a crash of the page (`window error event: Uncaught RangeError: radius must be positive, got -2`). If `onerror` has dealt with it, call `e.preventDefault()` there. Kabir checked: with `preventDefault()` the page-level error never fired.

## 2. Errors that never reach `onerror`

Kabir's next worker used `async`:

```js
// rejects.js
self.onmessage = async () => {
  await null;
  throw new Error('failed inside an async handler');
};
```

```js
worker.onerror = (e) => console.log('onerror fired:', e.message);
worker.postMessage({});
```

The page waited half a second and `onerror` never fired. Nor did the page's `window` `error` or `unhandledrejection` events. The only trace was an uncaught rejection in DevTools, in the worker's own console. Throwing inside an `async` function doesn't throw, it rejects the promise that function returned, and a rejected promise is not an uncaught error as far as `onerror` is concerned. Since nearly every real worker ends up using `await` somewhere (a `fetch`, an IndexedDB read), relying on `onerror` means silently missing most failures.

## 3. When the worker can't even start

Two more ways it goes wrong, before any message is sent:

```js
new Worker('does-not-exist.js').onerror = (e) =>
  console.log('onerror:', e.constructor.name, '| message:', e.message);

new Worker('syntax.js').onerror = (e) =>            // contains `const x = ;`
  console.log('onerror:', e.constructor.name, '|', e.message);
```

```
onerror: Event | message: undefined
onerror: ErrorEvent | Uncaught SyntaxError: Unexpected token ';'
```

A missing file gives a plain `Event` with no message at all, not even a status code. If a worker "does nothing", open the Network tab and look for a 404 on the worker's URL. A syntax error gives an `ErrorEvent` with the parser's message, as you would expect.

`onerror` is still worth having, for exactly these cases. It just isn't enough on its own.

## 4. Sending errors back as messages

The reliable approach is to catch errors inside the worker and send them back as ordinary messages. Errors are one of the things structured clone knows how to copy ([lesson 2](02-messages-are-copies.md)), so the page gets a real error object:

```js
// caught.js
self.onmessage = (event) => {
  try {
    if (event.data.radius < 0) throw new RangeError('radius must be positive');
    self.postMessage({ ok: true });
  } catch (error) {
    self.postMessage({ ok: false, error });
  }
};
```

```js
worker.onmessage = (e) => {
  const { ok, error } = e.data;
  console.log('ok:', ok, '| error instanceof RangeError:', error instanceof RangeError, '|', error.name + ': ' + error.message);
  console.log('stack starts:', error.stack.split('\n').slice(0, 2).join(' / '));
};
```

```
ok: false | error instanceof RangeError: true | RangeError: radius must be positive
stack starts: RangeError: radius must be positive /     at self.onmessage (http://localhost:5299/e04/caught.js:3:38)
```

A real `RangeError`, with its stack pointing at the line in the worker. For an `async` handler, the same `try`/`catch` around the `await`s catches rejections too. [Lesson 6](06-request-and-response.md) turns this `{ ok, error }` shape into promises that reject.

## 5. `terminate()`: sending the cook home now

A worker keeps running until something stops it. Closing the page stops it. Otherwise, the page can call `terminate()`:

```js
// progress.js posts "progress N" every 50 ms
const worker = new Worker('progress.js');
worker.onmessage = (e) => console.log(e.data);

setTimeout(() => {
  worker.terminate();
  console.log('terminated');
  worker.postMessage('hello?');
  console.log('postMessage after terminate did not throw');
}, 180);
```

```
progress 1
progress 2
progress 3
terminated
postMessage after terminate did not throw
```

The worker is killed on the spot, even in the middle of a loop. No `finally` blocks run and no goodbye message is sent. Nothing arrived afterwards, and sending to a terminated worker fails silently rather than throwing. The cook is sent home mid-dish and the half-cooked food goes in the bin.

That sounds brutal, but it is useful. It is the only way to stop a worker that is stuck in a long calculation, because a busy worker can't read a "please stop" message until its current job ends. Kabir uses exactly this in [lesson 6](06-request-and-response.md) to cancel a blur the user no longer wants.

## 6. `self.close()`: the cook clocks out

A worker can also stop itself:

```js
// closes.js
self.onmessage = () => {
  self.postMessage('before close');
  self.close();
  self.postMessage('after close, same task');
  setTimeout(() => self.postMessage('from a timer after close'), 0);
};
```

```
before close
after close, same task
```

`close()` doesn't stop the code that is running. The rest of the current handler finished, and even its `postMessage` got through. But nothing *scheduled* runs afterwards: the timer never fired. The cook finishes the dish in hand, and anything planned for later never happens.

Use `close()` for a worker that knows it has done its one job. Use `terminate()` when the page decides. Either way, stopping a worker you no longer need matters: each one holds its own copy of its code and data in memory, and a worker nobody stops lives as long as the page does. That becomes a real problem in React, where components come and go ([lesson 12](12-workers-in-react.md)).

So far every worker has been an old-style script with `importScripts`. Real projects use `import` and a bundler, which is [lesson 5](05-module-workers-and-bundlers.md).
