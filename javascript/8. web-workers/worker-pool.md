# How the worker pool works

A worker pool is a fixed team of workers that share a queue of jobs. Instead of starting a new worker for every job, which costs a few milliseconds each time, you start a few once and keep handing them work. In the restaurant, it's a kitchen with several cooks and a rail of order slips: any free cook takes the next slip.

Here's the `WorkerPool` class from [lesson 8](08-worker-pools.md) §3, piece by piece.

### What it keeps track of

```js
this.workers = [];          // every worker, so terminate() can stop them all
this.idle = [];             // workers with nothing to do right now
this.queue = [];            // jobs waiting for a free worker
this.pending = new Map();   // job id → the resolve function of that job's promise
this.nextId = 1;            // the next job number to hand out
```

Every worker is either in `idle` or busy with exactly one job. Every job is either in `queue` (waiting) or in `pending` (being worked on).

### The constructor: start the team

```js
for (let i = 0; i < size; i++) {
  const worker = new Worker(url);
  worker.onmessage = (event) => { … };   // explained below
  this.workers.push(worker);
  this.idle.push(worker);
}
```

This starts `size` workers once and marks them all as free. They then live as long as the pool does.

### `run()`: hand in a job

```js
run(message, transfer = []) {
  return new Promise((resolve) => {
    this.queue.push({ message, transfer, resolve });
    this.#pump();
  });
}
```

`run()` doesn't send anything itself. It puts the job at the back of the queue, along with the `resolve` function of the promise it returns, and asks `#pump()` to hand out work. The caller gets the promise straight away and awaits it like any `async` call.

### `#pump()`: match free workers to waiting jobs

```js
#pump() {
  while (this.idle.length && this.queue.length) {
    const worker = this.idle.pop();
    const { message, transfer, resolve } = this.queue.shift();
    const id = this.nextId++;
    this.pending.set(id, resolve);
    worker.postMessage({ ...message, id }, transfer);
  }
}
```

This is the heart of the pool. As long as there's both a free worker and a waiting job, it:

1. takes a free worker,
2. takes the oldest job,
3. gives the job a number,
4. remembers which promise that number belongs to (`pending`),
5. sends the job to the worker with the number attached.

If there are no free workers, the loop stops and the jobs stay in the queue. If there are no jobs, the workers stay idle. `#pump()` is the only place where jobs are actually sent.

### `onmessage`: a worker finishes

```js
worker.onmessage = (event) => {
  const { id } = event.data;
  this.pending.get(id)(event.data);   // fulfil that job's promise
  this.pending.delete(id);
  this.idle.push(worker);             // this worker is free again
  this.#pump();                       // give it the next job, if any
};
```

The worker sends its result back with the same `id`. The pool uses the `id` to find the right `resolve` and calls it, so the caller's `await` finishes. Then it marks the worker as free and calls `#pump()`, so a waiting job goes out straight away.

### `terminate()`: shut the kitchen

```js
terminate() {
  for (const worker of this.workers) worker.terminate();
}
```

This stops every worker, busy or idle.

### Two jobs, one worker

With a pool of 1 and two jobs:

```
run(A)   → queue [A]  → pump: worker free → A sent as #1, pending {1}
run(B)   → queue [B]  → pump: no free worker → B waits
reply #1 → A's promise fulfilled → worker free → pump: B sent as #2
reply #2 → B's promise fulfilled → worker free → pump: queue empty, nothing to do
```

Nothing ever waits in a loop or polls. Only two things move work along: a new job arriving (`run`) and a worker finishing (`onmessage`). Both call `#pump()`.
