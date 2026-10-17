# Lesson 7 — Handing data over instead of copying it

Level: intermediate. Transfer lists: how to move a big buffer into a worker in almost no time, and what's left behind on your side when you do.

## 1. Passing the pan through the hatch

[Lesson 2](02-messages-are-copies.md) §4 showed that copying Kabir's 24 MB photo costs several milliseconds each way. For an order slip, a photocopy is fine. For a heavy pan of food, the kitchen doesn't make a copy of the pan. The waiter passes *the pan itself* through the hatch, and after that the waiter isn't holding it any more.

That is a **transfer**. Some kinds of objects can be moved from one thread to another instead of copied. The most important is `ArrayBuffer`, the raw block of memory behind every typed array. You ask for a transfer by listing the objects in the second argument of `postMessage`:

```js
worker.postMessage({ pixels }, [pixels.buffer]);
```

The first argument is the message, cloned as usual. The second is the **transfer list**: things inside the message that should be moved, not copied. `pixels` is a `Uint8ClampedArray`, and `pixels.buffer` is the `ArrayBuffer` holding its bytes, so that's what goes in the list.

The worker hands its result back the same way:

```js
// bounce.js
self.onmessage = (event) => {
  const { pixels, transfer } = event.data;
  pixels[0] = 42; // the worker "edits" the photo
  if (transfer) self.postMessage({ pixels }, [pixels.buffer]);
  else self.postMessage({ pixels });
};
```

## 2. How much faster

Kabir sent a 3000 × 2000 photo (24 MB) to that worker and back, alternating between copying and transferring:

```
copy    : postMessage call 4.3 ms, round trip 20.2 ms
transfer: postMessage call 0.1 ms, round trip 3.5 ms
copy    : postMessage call 4.2 ms, round trip 14.1 ms
transfer: postMessage call 0.1 ms, round trip 0.4 ms
```

Copying cost about 4 ms of main-thread time just for the `postMessage` call, and 14–20 ms for the full trip there and back. Transferring cost a tenth of a millisecond to send and well under a few milliseconds for the round trip. A transfer doesn't touch the bytes at all; it only changes which thread owns the memory. So its cost barely grows with size:

```
transfer 2048 bytes: postMessage 0.00 ms
transfer 209715200 bytes: postMessage 0.30 ms
```

A 200 MB buffer went across in a third of a millisecond. Copying it would have taken well over 100 ms, going by the numbers in lesson 2.

For Kabir's editor, where every filter sends a whole photo each way, this is the difference between a slider that keeps up and one that stutters.

## 3. What's left in your hand

After a transfer, the page's buffer is **detached**: empty, and permanently so.

```js
console.log('before transfer: length', pixels.length, '| byteLength', pixels.buffer.byteLength);
worker.postMessage({ pixels, transfer: true }, [pixels.buffer]);
console.log('after transfer:  length', pixels.length, '| byteLength', pixels.buffer.byteLength,
            '| detached', pixels.buffer.detached, '| pixels[0] =', pixels[0]);
```

```
before transfer: length 24000000 | byteLength 24000000
after transfer:  length 0 | byteLength 0 | detached true | pixels[0] = undefined
came back: length 24000000 | pixels[0] = 42
```

Straight after `postMessage`, `pixels` has length 0. Reading from it gives `undefined`, and writing to it does nothing, with no error to warn you. That's the dangerous part: code that keeps using the old array after a transfer doesn't crash, it just silently sees nothing. The data now lives only in the worker, and when the worker transferred it back, the page got a new, full array, with the worker's edit (`42`) in it.

Trying to send the detached buffer a second time does throw:

```
DataCloneError: Failed to execute 'postMessage' on 'Worker': An ArrayBuffer is detached and could not be cloned.
```

So only transfer what you're done with. If Kabir still needs the original photo on the page (for an "undo" or a before/after view), he has to keep a copy: `worker.postMessage({ pixels: original.slice() }, …)` transfers a fresh copy and keeps the original. That's a copy again, but a deliberate one, made only where he needs it.

## 4. The whole buffer goes, not just your view

A transfer moves an `ArrayBuffer`, and several typed arrays can be views onto the same buffer. (If views are new to you, [Buffers and typed arrays](buffers-and-typed-arrays.md) explains them.) Kabir's editor stored a photo and a selection mask side by side in one buffer:

```js
const buffer = new ArrayBuffer(16);
const photo = new Uint8ClampedArray(buffer, 0, 8);
const mask  = new Uint8ClampedArray(buffer, 8, 8);

worker.postMessage({ pixels: photo }, [photo.buffer]);
console.log('mask after sending only the photo view:', mask.length);
```

```
mask after sending only the photo view: 0
```

He only meant to send the photo, but `photo.buffer` is the *whole* buffer, so the mask went too. Views made with `subarray()` share their parent's buffer in the same way. If you want to transfer part of a buffer, `slice()` that part into its own buffer first.

## 5. Other things that can be handed over

`ArrayBuffer` is the one you'll use most, but not the only one. The ones that matter for Kabir's editor:

- **`MessagePort`**, from [lesson 6](06-request-and-response.md) §6. A port can *only* be transferred, never copied.
- **`ImageBitmap`**, a decoded image ready to draw. Kabir created one from a canvas and transferred it:

  ```
  bitmap after transfer: 0 x 0
  worker got bitmap 300x200
  ```

  Same pattern: the page's copy is emptied to 0 × 0, and the worker has the real thing. `createImageBitmap(file)` decodes a JPEG off the main thread, and transferring the result is a cheap way to get a photo into a worker without ever touching its pixels on the page.

- **`OffscreenCanvas`**, which lets a worker draw straight onto a canvas on the page. That gets its own lesson, [lesson 9](09-offscreen-canvas.md).

`structuredClone` takes a transfer list too, `structuredClone(value, { transfer: [buffer] })`, which moves a buffer to a new owner on the same thread. It's occasionally handy for making sure no other code still has access to some data.

Transfers make one worker cheap to feed. The next step is feeding several at once, in [lesson 8](08-worker-pools.md).
