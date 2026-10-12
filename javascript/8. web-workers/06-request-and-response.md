# Lesson 6 — Asking and answering

Level: intermediate. Turning `postMessage` into calls that return promises, handling errors, dealing with answers nobody wants any more, and giving each request its own channel.

## 1. One hatch, many orders

Kabir's worker now does two jobs: `blur`, and `histogram` (counting how many pixels there are of each brightness, for the chart under the photo). Both answers come back through the same `worker.onmessage`. When the page asks for a blur and a histogram at the same time, and two messages come back, which is which?

In the restaurant, the waiter solves this by numbering the order slips. Table 4's order is slip 17, and when a plate comes through the hatch with "17" on it, the waiter knows where it goes. Kabir does the same.

## 2. Numbered slips

The worker gets a table of handlers, and echoes each request's `id` back with the answer. It also catches errors and sends them back, as in [lesson 4](04-errors-and-shutting-down.md) §4:

```js
// editor-worker.js
importScripts('blur.js');

const handlers = {
  blur({ pixels, width, height, radius }) {
    return blur(pixels, width, height, radius);
  },
  histogram({ pixels }) {
    const counts = new Array(256).fill(0);
    for (let i = 0; i < pixels.length; i += 4) counts[pixels[i]]++;
    return counts;
  },
};

self.onmessage = (event) => {
  const { id, type, payload } = event.data;
  try {
    const handler = handlers[type];
    if (!handler) throw new Error(`unknown request type: ${type}`);
    self.postMessage({ id, result: handler(payload) });
  } catch (error) {
    self.postMessage({ id, error });
  }
};
```

On the page, each request gets a promise. The promise's `resolve` and `reject` are kept in a `Map` under the request's id until the answer arrives:

```js
const worker = new Worker('editor-worker.js');
let nextId = 1;
const pending = new Map();

worker.onmessage = (event) => {
  const { id, result, error } = event.data;
  const { resolve, reject } = pending.get(id);
  pending.delete(id);
  if (error) reject(error); else resolve(result);
};

function ask(type, payload) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, type, payload });
  });
}
```

Now talking to the worker reads like calling an `async` function:

```js
const [blurred, counts] = await Promise.all([
  ask('blur', { pixels, width: 1000, height: 800, radius: 2 }),
  ask('histogram', { pixels }),
]);
console.log('blurred:', blurred.length, 'bytes | histogram buckets:', counts.length, '| pending left:', pending.size);
```

```
blurred: 3200000 bytes | histogram buckets: 256 | pending left: 0
```

Each answer found its own promise, and the `Map` is empty again, so nothing is leaking.

## 3. Errors become rejections

Because the worker sends errors back with the id, a failed request rejects its promise, and ordinary `try`/`catch` works:

```js
try { await ask('sharpen', { pixels }); }
catch (e) { console.log('rejected with', e.name + ':', e.message); }
```

```
rejected with Error: unknown request type: sharpen
```

This is the main reason to build `ask`. Once the worker is behind a promise, the rest of the app doesn't need to know a worker is involved.

## 4. Answers nobody wants

Kabir's blur has a slider. When the user drags it from 1 to 6, the slider fires six times in quick succession, and each one asks for a blur. Only the last one matters, the one where the slider stopped. So Kabir remembers which request is the latest and ignores the rest:

```js
let latest = 0;
const outcomes = [];
for (let radius = 1; radius <= 6; radius++) {
  const mine = ++latest;
  ask('blur', { pixels, width: 1000, height: 800, radius }).then(() => {
    outcomes.push(`${radius} ${mine === latest ? '(shown)' : '(thrown away)'}`);
  });
}
// …once the last one has arrived:
console.log(outcomes.join(', '));
```

```
1 (thrown away), 2 (thrown away), 3 (thrown away), 4 (thrown away), 5 (thrown away), 6 (shown)
time until the last blur arrived: 1376 ms
```

The right picture is shown, but look at the time. A worker is one cook, and it works through orders one at a time. Before it could start on radius 6, it had to finish radius 1, 2, 3, 4 and 5, which were all going in the bin. Ignoring a stale answer doesn't stop the work that produces it.

A cook in the middle of a dish can't read a new slip either. The worker is inside `blur()`, and its `onmessage` won't run again until `blur()` returns, so there's no way to send it a "never mind" message that it would see in time.

## 5. Cancelling by sending the cook home

What you *can* do is [lesson 4](04-errors-and-shutting-down.md) §5: terminate the worker and start a fresh one. The old cook, and every slip queued up for them, is gone:

```js
let worker = new Worker('editor-worker.js');

function blurLatest(radius) {
  worker.terminate();                       // throw away whatever it was doing
  worker = new Worker('editor-worker.js');  // fresh cook, empty queue
  return new Promise((resolve) => {
    worker.onmessage = (e) => resolve(e.data.result);
    worker.postMessage({ id: 1, type: 'blur', payload: { pixels, width: 1000, height: 800, radius } });
  });
}
```

```
terminate-and-restart: last blur arrived after 530 ms
```

530 ms instead of 1376 ms, because only the radius 6 blur was actually computed. Starting a worker takes a few milliseconds ([lesson 8](08-worker-pools.md) §5 measures it), which is nothing next to a blur. The price is that the new worker starts empty: anything the old one had loaded or cached is lost. For a worker that holds no state between requests, like this one, that's fine. For one that has spent two seconds loading a dictionary, it isn't, and you're better off making the work itself smaller.

## 6. A private line per request: `MessageChannel`

There's a second way to match answers to questions, built into the browser. A `MessageChannel` is a pair of connected **ports**. Whatever goes into one comes out of the other, like a private speaking tube. Kabir keeps one end and sends the other into the worker with the request:

```js
const channel = new MessageChannel();
channel.port1.onmessage = (e) => console.log('reply came through its own port:', e.data);
worker.postMessage({ radius: 2, reply: channel.port2 }, [channel.port2]);
```

```js
// channel-worker.js
self.onmessage = (event) => {
  const { radius, reply } = event.data;
  reply.postMessage(`blurred with radius ${radius}`);
};
```

```
reply came through its own port: blurred with radius 2
```

The worker answers on the port it was given, so the reply can only go to the code that asked. No ids, no `Map`. The second argument, `[channel.port2]`, is a **transfer list**: a port can't be copied, only handed over. [Lesson 7](07-transferring-instead-of-copying.md) explains transfer lists properly, and they turn out to matter far more for Kabir's pixels than for ports.

Ports are also how you let two workers talk to each other directly: create a channel on the page and send one port to each.

The numbered-slip `ask` from §2 is small enough to write yourself, and writing it once is the best way to understand what's going on. In a real project, the **Comlink** library (from the Chrome team) does the same job more completely: it wraps a worker so you can call its functions as if they were local `async` functions.
