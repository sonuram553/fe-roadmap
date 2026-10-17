# Freeze the main thread

A runnable version of [lesson 9](../../09-offscreen-canvas.md) §2: the same spinning square drawn twice, side by side. The left one is drawn by the main thread on a normal canvas. The right one is drawn by a worker on a canvas handed over with `transferControlToOffscreen()`.

There's nothing to install, but a worker can't be started from a page opened as a file ([lesson 1](../../01-why-workers.md) §5), so serve the folder:

```bash
cd "javascript/8. web-workers/practice/offscreen-canvas-freeze"
python3 -m http.server 8765
```

Open http://localhost:8765 and click **Freeze the main thread for 2 seconds**. The button runs a busy loop on the main thread, so for those two seconds the page can't do anything at all.

While it's frozen, the left square stops dead and its frame counter stops climbing. The right square keeps spinning, and its counter keeps going. Try hovering over the button or selecting text during the freeze, too: none of it responds, because those are main-thread jobs as well.

When the freeze ends, the page prints how many frames each side drew during it. In Chrome 155 on a 60 Hz screen:

```
worker drew 120 frames while the main thread was frozen for 2 s
main thread drew 0 frames while frozen for 2 s
```

120 frames is 2 seconds at 60 frames a second, so the worker didn't miss a single one. On a 120 Hz screen, expect about 240, and the squares spin twice as fast, because each frame turns them by a fixed amount (§2 of the lesson explains why).

`index.html` holds the page and the main-thread animation. `render-worker.js` is the worker from the lesson, plus a line that writes the frame count onto its canvas. The worker has to draw that number itself, since the page can't update anything while it's frozen.
