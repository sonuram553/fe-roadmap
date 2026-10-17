# Lesson 8 — Several cooks: worker pools

Level: intermediate. Splitting one big job across several workers, a small pool that hands out work, and how many workers is too many.

## 1. One cook is not faster

[Lesson 1](01-why-workers.md) §4 ended with a promise. Moving the blur into a worker kept the page responsive, but the blur itself still took as long: 1839 ms on the main thread, 1868 ms in the worker. One cook chops at the same speed as one waiter.

Kabir's laptop can run 10 threads at once, and the worker had one of them. The other nine sat idle. The way to use them is to hire more cooks and split the dish.

## 2. Cutting the photo into strips

A blur is easy to split, because each output pixel only depends on the pixels near it. Kabir cuts the photo into horizontal strips and gives each strip to a different worker. There's one catch. A pixel on the edge of a strip needs neighbours from the strip above or below. So each worker gets its strip plus `radius` extra rows on each side, and when the results come back, those extra rows are thrown away:

```js
const W = 3000, H = 2000, R = 4;

async function blurInStrips(pool, strips) {
  const rowsPerStrip = Math.ceil(H / strips);
  const jobs = [];
  for (let top = 0; top < H; top += rowsPerStrip) {
    const bottom = Math.min(top + rowsPerStrip, H);
    // take R extra rows above and below so the edges blur correctly
    const from = Math.max(0, top - R), to = Math.min(H, bottom + R);
    const slice = pixels.slice(from * W * 4, to * W * 4);
    jobs.push(pool.run({ pixels: slice, width: W, height: to - from, radius: R }, [slice.buffer])
      .then(({ out }) => ({ out, skip: top - from, rows: bottom - top, top })));
  }
  const result = new Uint8ClampedArray(pixels.length);
  for (const { out, skip, rows, top } of await Promise.all(jobs)) {
    result.set(out.subarray(skip * W * 4, (skip + rows) * W * 4), top * W * 4);
  }
  return result;
}
```

`pixels.slice()` makes each strip its own buffer, so it can be transferred without taking the whole photo with it ([lesson 7](07-transferring-instead-of-copying.md) §4). Each worker blurs its strip with the same `blur()` as always, and transfers the result back:

```js
// strip-worker.js
importScripts('blur.js');
self.onmessage = (event) => {
  const { id, pixels, width, height, radius } = event.data;
  const out = blur(pixels, width, height, radius);
  self.postMessage({ id, out }, [out.buffer]);
};
```

## 3. A small pool

A **worker pool** is a fixed set of workers plus a queue of jobs. When a job arrives, it goes to an idle worker if there is one, or waits in the queue. When a worker finishes, it takes the next job. It is the numbered-slip idea from [lesson 6](06-request-and-response.md) §2, spread across several cooks:

```js
class WorkerPool {
  constructor(url, size) {
    this.workers = [];
    this.idle = [];
    this.queue = [];
    this.pending = new Map();
    this.nextId = 1;
    for (let i = 0; i < size; i++) {
      const worker = new Worker(url);
      worker.onmessage = (event) => {
        const { id } = event.data;
        this.pending.get(id)(event.data);
        this.pending.delete(id);
        this.idle.push(worker);
        this.#pump();
      };
      this.workers.push(worker);
      this.idle.push(worker);
    }
  }

  run(message, transfer = []) {
    return new Promise((resolve) => {
      this.queue.push({ message, transfer, resolve });
      this.#pump();
    });
  }

  #pump() {
    while (this.idle.length && this.queue.length) {
      const worker = this.idle.pop();
      const { message, transfer, resolve } = this.queue.shift();
      const id = this.nextId++;
      this.pending.set(id, resolve);
      worker.postMessage({ ...message, id }, transfer);
    }
  }

  terminate() {
    for (const worker of this.workers) worker.terminate();
  }
}
```

Error handling is left out to keep it short; in a real pool, each job would carry the `{ id, error }` shape from lesson 6 and reject. [How the worker pool works](worker-pool.md) goes through the class piece by piece.

The queue means you can give the pool more jobs than it has workers. Cutting the photo into 40 strips for a pool of 8 works fine: the first 8 start at once, and the rest follow as workers free up. Smaller jobs also balance better, since no worker is left sitting idle while one slow strip finishes.

## 4. Kabir's measurements

Kabir blurred the same 3000 × 2000 photo with pools of different sizes, one strip per worker, after one warm-up run each. He also compared every result, pixel by pixel, with a blur done in one piece, to check the strip edges were right:

```
cores reported: 10
 1 workers: 1843 ms, matches single-thread result: true
 2 workers: 932 ms, matches single-thread result: true
 4 workers: 482 ms, matches single-thread result: true
 8 workers: 254 ms, matches single-thread result: true
10 workers: 242 ms, matches single-thread result: true
16 workers: 277 ms, matches single-thread result: true
```

Up to 8 workers, doubling the cooks nearly halved the time: 1843, 932, 482, 254. From 1.8 seconds to a quarter of a second. Going to 10 barely helped, and 16 was *slower* than 10. Past the number of cores, extra workers can't run at the same time; they take turns on the same cores, and switching between them costs a little. There's also work the pool can't split: slicing the photo, sending the strips and stitching the results together all happen on the main thread.

So `navigator.hardwareConcurrency` (the 10 above) is a ceiling, not a target. A common choice is `navigator.hardwareConcurrency - 1`, leaving a core for the main thread, and capping it at something like 8, because the gains flatten out and each worker costs memory: every one has its own copy of its code and its own heap.

## 5. Hiring cooks takes time

Creating a worker isn't free either. Kabir timed `new Worker()` until the worker's first reply:

```
new Worker() to first reply: 9.7 ms
new Worker() to first reply: 5.7 ms
```

The browser has to start a thread, fetch the script (from the cache after the first time), and run it. A few milliseconds is fine once, and it was fine for cancelling a blur in [lesson 6](06-request-and-response.md) §5. It is not fine per job: a pool that started 8 workers for every blur would add tens of milliseconds each time. Create the pool once, when the editor opens, and keep it. That's the whole point of a pool.

So far, every result has come back through the hatch for the page to put on the canvas. [Lesson 9](09-offscreen-canvas.md) lets a worker draw on the canvas itself.
