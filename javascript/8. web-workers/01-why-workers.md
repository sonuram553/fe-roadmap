# Lesson 1 — Why web workers exist

Level: beginner. Every output quoted in these lessons comes from running the code in Chrome 154 on a 10-core laptop. Your millisecond numbers will differ; the shape of them will not.

## 1. One waiter for the whole restaurant

A web page runs its JavaScript on one thread, the **main thread**. That same thread also handles clicks and key presses, runs your event listeners, works out layout and paints the screen. The [event loop note](../4.%20async/event-loop.md) explains how it takes turns between these jobs: it can only ever do one of them at a time.

Think of the main thread as **the only waiter in a restaurant**. The waiter takes orders, pours water, brings the bill and answers every guest who waves. As long as each job is quick, the room feels well looked after. But if the waiter goes into the back and spends two minutes chopping onions, nobody gets served. Guests wave and nothing happens. That is what a frozen page is: the waiter is busy with something slow, and the clicks pile up unanswered.

A **web worker** is a second thread you start yourself. In the restaurant, it is **a cook in the kitchen**. The cook does the slow work behind a wall, and the waiter stays out front with the guests. The two never share a room; they talk through a hatch in the wall by passing order slips. The rest of these lessons are about that hatch: what you can pass through it, how fast, and how to keep track of what you asked for.

Our running example is Kabir. He is building a small photo editor that runs entirely in the browser. His first feature is a **Blur** button, and it has a problem.

## 2. Kabir's frozen Blur button

A photo on a canvas is a long list of numbers: four per pixel (red, green, blue, alpha), each from 0 to 255. Kabir's blur replaces every pixel with the average of the pixels in a small square around it:

```js
// blur.js
function blur(pixels, width, height, radius) {
  const out = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const px = x + dx, py = y + dy;
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          const i = (py * width + px) * 4;
          r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; n++;
        }
      }
      const o = (y * width + x) * 4;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = pixels[o + 3];
    }
  }
  return out;
}
```

`Uint8ClampedArray` is the array type canvases use for pixels. It holds whole numbers from 0 to 255 and rounds anything you put in it into that range. You don't need to follow the blur to follow these lessons; if you're curious, [How Kabir's blur works](box-blur.md) goes through it line by line.

A phone photo is easily 3000 × 2000 pixels, which is 24 million numbers. With a radius of 4, each pixel looks at 81 neighbours. That is a lot of arithmetic. To see what it does to the page, Kabir started a timer that ticks every 16 ms, like a loading spinner would, then ran the blur and counted the ticks:

```js
let ticks = 0;
setInterval(() => ticks++, 16);

const start = performance.now();
blur(pixels, 3000, 2000, 4);
console.log(`main thread: blur took ${Math.round(performance.now() - start)} ms, spinner ticked ${ticks} times`);
```

```
main thread: blur took 1839 ms, spinner ticked 0 times
```

Almost two seconds, and the spinner did not move once. Neither would a button hover, a scroll or a text field. The waiter was chopping onions.

## 3. The first worker

A worker lives in its own file. Kabir writes one that loads the blur function and waits for orders:

```js
// blur-worker.js
importScripts('blur.js');

self.onmessage = (event) => {
  const { pixels, width, height } = event.data;
  const result = blur(pixels, width, height, 4);
  self.postMessage(result);
};
```

Three things are new here. `importScripts('blur.js')` loads another script into the worker, the way a `<script>` tag would on a page. `self` is the worker's global object, the thing `window` is on a page. And `onmessage` / `postMessage` are the two ends of the hatch: the worker waits for a slip to arrive, does the work, and passes the result back.

On the page, Kabir starts the worker and sends it the photo:

```js
const worker = new Worker('blur-worker.js');

worker.onmessage = (event) => {
  console.log(`worker: blur took ${Math.round(performance.now() - start)} ms, spinner ticked ${ticks} times`);
  console.log('result is', event.data.constructor.name, event.data.length);
};

const start = performance.now();
worker.postMessage({ pixels, width: 3000, height: 2000 });
console.log('message posted, main thread carries on');
```

`new Worker(url)` downloads that file and runs it on a new thread. From then on, `worker.postMessage(x)` sends `x` into the worker, where it arrives as `event.data` in the worker's `onmessage`. When the worker calls `self.postMessage(y)`, `y` arrives as `event.data` in the page's `worker.onmessage`. It is the same pair of calls on both sides of the hatch.

```
message posted, main thread carries on
worker: blur took 1868 ms, spinner ticked 117 times
result is Uint8ClampedArray 24000000
```

The first line printed straight away: `postMessage` doesn't wait for an answer, it drops the slip through the hatch and returns. The spinner ticked 117 times during the blur, which is about one tick every 16 ms, exactly what it should do on an idle page. The waiter stayed with the guests.

## 4. Faster? No. Responsive? Yes.

Look at the two times again: 1839 ms on the main thread, 1868 ms in the worker. The worker did not make the blur any quicker. It is the same code on a CPU core of the same speed, plus a little time for passing the photo through the hatch.

What changed is *who waited*. Before, the whole page waited. After, only the result waited, and everything else on the page kept working. That is what one worker buys you: responsiveness, not speed. Kabir can show a spinner that actually spins, let the user cancel, or let them keep adjusting other settings while the blur runs.

Speed comes later. A laptop with 10 cores can run 10 cooks at once, and splitting the photo between them does make the blur faster. That is [lesson 8](08-worker-pools.md).

## 5. The page has to be served, not opened as a file

Kabir's first attempt was to double-click `index.html` and open it straight from disk. The worker refused to start:

```
SecurityError: Failed to construct 'Worker': Script at 'file:///…/blur-worker.js' cannot be accessed from origin 'null'.
```

A page opened from `file://` has no real origin (Chrome calls it `null`), and a worker script must come from the same origin as the page that starts it. Any local server fixes this: `npx vite`, `npx serve`, or `python3 -m http.server`. The same rule means you can't start a worker directly from a script on another domain, such as a CDN. [Lesson 5](05-module-workers-and-bundlers.md) shows the ways around that.

## 6. What belongs in a worker

The browser treats any piece of work that holds the main thread for more than 50 ms as a **long task**, and that is a good rough line. Below it, users rarely notice. Above it, clicks start to feel sticky, and at a few hundred milliseconds the page feels broken.

Good jobs for a worker are the ones that are slow *and* only need data: image filters, parsing a big CSV or JSON file, searching or sorting tens of thousands of rows, compressing a file before upload, syntax highlighting, running a physics simulation, anything compiled to WebAssembly.

Waiting is not the same as working. `fetch` and timers already happen outside your JavaScript; the main thread is free while a request is in flight. Moving a `fetch` into a worker on its own gains nothing. It is the heavy work you do *with* the response that is worth moving.

And the worker cannot touch the page. It has no `document`, so it cannot read an input's value or change an element. The cook can't walk into the dining room. [Lesson 3](03-inside-a-worker.md) goes through exactly what the kitchen does and doesn't have. First, though, the hatch itself: what actually happens to the photo when Kabir passes it through, in [lesson 2](02-messages-are-copies.md).
