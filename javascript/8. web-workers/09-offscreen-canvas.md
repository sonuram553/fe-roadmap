# Lesson 9 — Drawing from a worker with OffscreenCanvas

Level: intermediate. Handing a page's canvas to a worker so the worker draws on it directly, and keeping an animation smooth while the main thread is busy.

## 1. The cook plates at the counter

Until now, every result has come back through the hatch for the waiter to serve. The worker computes the pixels, and the page puts them on the canvas. That last step, `putImageData` or `drawImage`, happens on the main thread.

An `OffscreenCanvas` lets the worker skip the waiter entirely. The page takes its `<canvas>` element and hands control of it to the worker. From then on, the worker draws, and what it draws appears on the page. It's as if the cook could set the plate straight down on a counter facing the dining room.

## 2. Kabir's live preview

Kabir's editor has a small preview that animates while filters are being chosen. On the main thread, it froze whenever anything heavy ran. He moved it into a worker:

```html
<canvas id="preview" width="400" height="300"></canvas>
```

```js
const canvas = document.getElementById('preview');
const offscreen = canvas.transferControlToOffscreen();
const worker = new Worker('render-worker.js');
worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);
```

`transferControlToOffscreen()` gives back an `OffscreenCanvas` linked to the element on the page. It goes to the worker in the transfer list ([lesson 7](07-transferring-instead-of-copying.md)), because a canvas can be handed over but not copied. The worker gets a normal 2D context from it and draws with the usual canvas calls:

```js
// render-worker.js
let ctx, frames = 0, angle = 0;

self.onmessage = (event) => {
  if (event.data.type === 'init') {
    ctx = event.data.canvas.getContext('2d');
    requestAnimationFrame(draw);
  }
  if (event.data.type === 'count') {
    self.postMessage({ frames });
  }
};

function draw() {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(angle += 0.05);
  ctx.fillStyle = 'orange';
  ctx.fillRect(-40, -40, 80, 80);
  ctx.restore();
  frames++;
  requestAnimationFrame(draw);
}
```

This is where the `requestAnimationFrame` from [lesson 3](03-inside-a-worker.md) §1 comes in. `requestAnimationFrame(fn)` asks the browser to call `fn` once, just before it draws the next frame on the screen. A screen redraws at a fixed rate, usually 60 times a second (about every 16.7 ms), and faster on 120 Hz displays. `requestAnimationFrame` lines your drawing up with those redraws. You draw once per frame, right before the frame is shown, so nothing is drawn too early, too late or twice.

It only calls `fn` once. That's why `draw` ends with `requestAnimationFrame(draw)`: each run asks for the next one, so `draw` runs once per frame, about 60 times a second, for as long as the animation lasts.

A timer such as `setInterval(draw, 16)` might look like it does the same thing, but it isn't tied to the screen. It drifts out of step with the refreshes, so some frames get drawn twice and others get skipped, which looks like stutter. It also keeps running in a hidden tab. `requestAnimationFrame` follows the screen exactly, and the browser pauses it when the tab isn't visible.

One side effect of this code: the square turns by a fixed `0.05` each frame, so on a 120 Hz screen it would spin twice as fast. `requestAnimationFrame` passes a timestamp to the callback (`draw(time)`), so for a speed that's the same on every screen, work out the angle from the time instead of the frame count.

To test it, Kabir froze the main thread for a full second and asked the worker how many frames it drew in that time. Then he ran the same animation on the main thread, with a normal canvas, and froze it the same way:

```
worker drew 60 frames while the main thread was frozen for 1 s
main thread drew 0 frames while frozen for 1 s
```

Sixty frames, a full second of smooth animation, while the page couldn't do anything at all. On the main thread, the animation stopped dead for the whole second. Normally `requestAnimationFrame` belongs to the page, and its callbacks run on the main thread, so a frozen main thread runs none of them. A worker that owns an `OffscreenCanvas` gets its own, on the worker's own event loop ([lesson 3](03-inside-a-worker.md) §4). The browser still ties it to the screen's refreshes, but a busy page can't stop it, and the worker's drawing reaches the screen without going through the page's JavaScript. To see it happen, run the demo in [practice/offscreen-canvas-freeze](practice/offscreen-canvas-freeze/README.md).

## 3. The canvas belongs to the worker now

Handing over control is a one-way trip. After the transfer, the page can't draw on that canvas any more, and can't hand it over again:

```
getContext after transfer: InvalidStateError: Failed to execute 'getContext' on 'HTMLCanvasElement': Cannot get context from a canvas that has transferred its control to offscreen.
transferring twice: InvalidStateError: Failed to execute 'transferControlToOffscreen' on 'HTMLCanvasElement': Cannot transfer control from a canvas for more than one time.
```

The page still owns the *element*. It can move it, style it and resize it with CSS. But the drawing size, the canvas's `width` and `height` in pixels, is now set by the worker, through `ctx.canvas.width` and `ctx.canvas.height`. If the preview panel is resizable, the page measures the new size and sends it to the worker in a message.

## 4. Clicks still arrive on the page

The worker has no DOM, so it can't hear clicks or mouse moves on the canvas ([lesson 3](03-inside-a-worker.md) §1). The page listens and forwards what the worker needs:

```js
canvas.addEventListener('pointermove', (e) => {
  worker.postMessage({ type: 'pointer', x: e.offsetX, y: e.offsetY });
});
```

Send the plain numbers, not the event object. An event can't be cloned, and the worker only needs the coordinates anyway. A pointer can fire more than once per frame, so for something like a brush tool, the worker can keep only the latest position and use it on its next frame.

## 5. Exporting, and canvases with no page at all

When the user clicks Export, the worker can encode the image itself, instead of sending pixels back for the page to encode:

```js
// in render-worker.js
if (event.data.type === 'export') {
  ctx.canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 })
    .then((blob) => self.postMessage({ blob }));
}
```

```
export: image/jpeg 3471 bytes
```

`convertToBlob` is the `OffscreenCanvas` version of `canvas.toBlob`, and it returns a promise. The page receives a ready-made `Blob` it can offer as a download.

A worker can also create an `OffscreenCanvas` of its own with `new OffscreenCanvas(width, height)`, with no element on the page behind it. Kabir uses one for image work nobody needs to see: draw a transferred `ImageBitmap` onto it, read the pixels back with `getImageData`, filter them, and `convertToBlob` the result. The whole path from a decoded photo to an exported JPEG never touches the main thread.

Every worker so far has belonged to one page. [Lesson 10](10-shared-workers.md) looks at a worker that several tabs share.
