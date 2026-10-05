# Lesson 2 — Messages are copies

Level: beginner. What happens to a value when you pass it through `postMessage`, what can and can't go through, and what it costs.

## 1. The cook gets a photocopy

When the waiter passes an order slip through the hatch, the cook doesn't get the waiter's pad. The cook gets a **photocopy**. Whatever the waiter scribbles on the pad afterwards, the cook never sees, and whatever the cook scribbles on the copy, the waiter never sees.

That is how `postMessage` works. The value is copied, and the worker receives the copy. Kabir checked this with a settings object:

```js
const settings = { radius: 4 };
worker.postMessage(settings);
settings.radius = 99;
console.log('main changed radius to', settings.radius);
```

The worker just reported what it received:

```
main changed radius to 99
worker got radius 4
```

The copy was taken the moment `postMessage` was called, so the change on the next line never reached the worker. He then had the worker send the object straight back and compared it with the original: `back.tags === edit.tags` printed `false`. Two separate objects with the same contents.

This is the whole reason workers are safe to use. Two threads never touch the same object, so there is nothing to lock and nothing for one thread to change under the other's feet. ([Lesson 9](09-shared-memory-and-atomics.md) covers the one exception, and why it needs special care.)

## 2. What survives the copy

The copying is done by an algorithm called **structured clone**. You can call it yourself as `structuredClone(value)`, and it is also what `postMessage`, IndexedDB and `history.pushState` use under the hood. It is much more capable than `JSON.stringify`. Kabir sent this object into a worker, which reported the type of each field it received:

```js
class Layer { constructor(name) { this.name = name } rename(n) { this.name = n } }

worker.postMessage({
  name: 'beach.jpg',
  when: new Date('2026-09-26T10:00:00Z'),
  tags: new Set(['holiday', 'sea']),
  sizes: new Map([['thumb', 200], ['full', 3000]]),
  pixels: new Uint8ClampedArray([255, 0, 0, 255]),
  pattern: /sea/i,
  layer: new Layer('background'),
  big: 10n,
  missing: undefined,
});
```

```
worker saw: {"name":"string","when":"Date","tags":"Set","sizes":"Map","pixels":"Uint8ClampedArray","pattern":"RegExp","layer":"Object","big":"bigint","missing":"undefined"}
```

Dates stay dates, Sets stay Sets, Maps stay Maps, typed arrays stay typed arrays, and `undefined` survives, none of which JSON can do. Circular references survive too: an object whose `self` property pointed back at itself arrived with `d.self === d` still `true`. Errors survive as well, which [lesson 4](04-errors-and-shutting-down.md) puts to good use.

Look at `layer`, though. It went in as a `Layer` and came out as a plain `Object`. Sent back to the page:

```
layer.rename is undefined | layer is Layer? false
```

Structured clone copies an object's own data (its fields), not its class. The methods live on the class's prototype, and the prototype stays behind. The cook gets the numbers written on the slip, not the waiter's training.

## 3. What cannot go through at all

Some values can't be copied, and `postMessage` throws straight away rather than sending something broken. Kabir tried a few:

```
a function: DataCloneError: Failed to execute 'postMessage' on 'Worker': () => {} could not be cloned.
a DOM node: DataCloneError: Failed to execute 'postMessage' on 'Worker': HTMLBodyElement object could not be cloned.
a Symbol: DataCloneError: Failed to execute 'postMessage' on 'Worker': Symbol(x) could not be cloned.
```

A function can't go because it carries its surrounding scope with it (its closure), and the worker has a completely separate set of variables. A DOM node can't go because the worker has no DOM to put it in. The error is thrown on the page, at the `postMessage` call, so a `try`/`catch` around that line catches it.

The most common way to hit this by accident is sending an object that has a callback tucked inside it, like `{ radius: 4, onDone: () => {…} }`. The fix is to leave the callback on the page and let the reply trigger it, which is what [lesson 6](06-request-and-response.md) builds.

## 4. Copying isn't free

A photocopy of a slip is quick. A photocopy of a phone book is not. Kabir timed `structuredClone` on pixel arrays of three sizes:

```
copying 1 MB takes 0.4 ms
copying 24 MB takes 6.9 ms
copying 96 MB takes 72.1 ms
```

24 MB is his 3000 × 2000 photo. The copy is made on the main thread, when `postMessage` is called, so those milliseconds come straight out of the page's time. And the result comes back through the hatch as another copy, so the photo is copied twice per blur. For small messages this doesn't matter at all. For big binary data there is a way to hand it over without copying, and that is [lesson 7](07-transferring-instead-of-copying.md).

## 5. Keep messages plain

Given all of this, the messages that work best are plain data: strings, numbers, arrays, plain objects, typed arrays. A common habit is to give each message a `type` field so the other side knows what it is looking at:

```js
worker.postMessage({ type: 'blur', radius: 4, pixels, width, height });
```

If the worker needs a class instance, send the fields and rebuild it on arrival:

```js
self.onmessage = (event) => {
  const layer = new Layer(event.data.layer.name);   // methods are back
};
```

What the worker can *do* with those messages once they arrive is the subject of [lesson 3](03-inside-a-worker.md).
