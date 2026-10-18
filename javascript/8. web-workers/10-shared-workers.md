# Lesson 10 — Shared workers, and where service workers fit

Level: intermediate. One worker serving several tabs at once, how tabs find the same one, the goodbye that never comes, and how all this differs from a service worker.

## 1. One kitchen, several dining rooms

Every worker so far has been **dedicated**: it belongs to the page that created it, and it dies with that page. Open Kabir's editor in three tabs and you get three separate workers, each knowing nothing about the others.

A `SharedWorker` is one kitchen serving several dining rooms. Every tab from the same site that asks for it gets connected to the *same* running worker. Kabir wants this for two things: when a photo is edited in one tab, the others should hear about it, and he'd rather decode each photo's thumbnail once than once per tab.

## 2. Ports, and a hub

A shared worker talks to each tab through its own port (the same `MessagePort` as in [lesson 6](06-request-and-response.md) §6). Instead of `onmessage`, the worker listens for `connect`, which fires once for each tab that joins:

```js
// hub.js
const ports = [];
let started = new Date().toISOString().slice(11, 19);

self.onconnect = (event) => {
  const port = event.ports[0];
  ports.push(port);
  port.onmessage = (e) => {
    for (const other of ports) other.postMessage(e.data);   // tell every tab
  };
  port.postMessage({ type: 'hello', tabs: ports.length, started });
};
```

On the page, everything goes through `.port`:

```js
const hub = new SharedWorker('hub.js');
hub.port.onmessage = (e) => console.log(JSON.stringify(e.data));

function sendEdit(edit) {
  hub.port.postMessage({ type: 'edit', edit });
}
```

Kabir opened tab A, then tab B, then called `sendEdit('blur radius 4')` in tab A:

```
tab A: {"type":"hello","tabs":1,"started":"18:21:31"}
tab B: {"type":"hello","tabs":2,"started":"18:21:31"}
tab A: {"type":"edit","edit":"blur radius 4"}
tab B: {"type":"edit","edit":"blur radius 4"}
```

Tab B was told it was the second tab, and its `started` time matched tab A's: the same worker, started once. The edit sent from A reached both tabs. One worker, one set of variables, shared by every tab connected to it.

(If all you need is to broadcast messages between tabs, `BroadcastChannel` does that with no worker at all. A shared worker earns its place when there's shared *work* or shared *state*: one WebSocket connection for all tabs instead of one each, one cache, one queue of uploads.)

## 3. It lives as long as someone is using it

A shared worker stays alive while at least one tab is connected to it. Kabir closed tabs A and B, then opened tab C:

```
tab C: {"type":"hello","tabs":1,"started":"18:21:33"}
```

A new start time and a count of 1. When the last tab closed, the worker was shut down, and everything it held went with it. The next tab started a fresh one. So a shared worker is not storage. Anything that must survive every tab closing belongs in IndexedDB.

## 4. The URL and the name pick the kitchen

Tabs share a worker when they ask for the same script URL, from the same origin, with the same name. The name is an option, as with dedicated workers:

```js
const drafts = new SharedWorker('hub.js', { name: 'drafts' });
```

With tab C still open, Kabir opened tab D, which asked for `hub.js` under the name `drafts`:

```
tab D (name "drafts"): {"type":"hello","tabs":1,"started":"18:21:34"}
```

`tabs: 1`, although tab C was connected to `hub.js` at that moment: a brand-new instance of the same script, separate from the unnamed one. Names let one script run as several independent hubs.

## 5. Ports don't say goodbye

The first version of `hub.js` has a leak. Kabir opened tabs A, B and C, closed B and C, and opened D:

```
tab A: {"type":"hello","tabs":1,"started":"18:11:40"}
tab B: {"type":"hello","tabs":2,"started":"18:11:40"}
tab C: {"type":"hello","tabs":3,"started":"18:11:40"}
(closed B and C)
tab D: {"type":"hello","tabs":4,"started":"18:11:40"}
```

Only A and D were open, but the worker counted four. There's no "disconnect" event on a port, so the worker never learnt that B and C had gone. Their dead ports stayed in the list, and every broadcast was still sent to them. In an editor that stays open all day, with tabs opening and closing, that list only grows.

The usual fix is for each tab to say goodbye itself, on `pagehide`, which fires when a tab is closed or navigated away:

```js
// page
window.addEventListener('pagehide', () => hub.port.postMessage({ type: 'bye' }));
```

```js
// hub.js
const ports = new Set();

self.onconnect = (event) => {
  const port = event.ports[0];
  ports.add(port);
  port.onmessage = (e) => {
    if (e.data.type === 'bye') { ports.delete(port); return; }
    for (const other of ports) other.postMessage(e.data);
  };
  port.postMessage({ type: 'hello', tabs: ports.size, started });
};
```

The same experiment again:

```
tab C: {"type":"hello","tabs":3,"started":"18:11:56"}
(closed B and C)
tab D: {"type":"hello","tabs":2,"started":"18:11:56"}
```

Two tabs open, two counted. A goodbye can still be lost if a tab crashes, so a hub that must be exact also pings its ports now and then and drops any that stop answering.

## 6. Finding its console

A shared worker doesn't belong to any one tab, so its `console.log` output doesn't appear in any tab's DevTools console. In Chrome, open `chrome://inspect/#workers`, find the worker under "Shared workers", and click **inspect** to get a DevTools window of its own.

Check support before relying on it, too. Shared workers have had patchier support than dedicated ones, especially on mobile browsers, so look the feature up on caniuse.com for the browsers you need, and have a fallback (one dedicated worker per tab) that still works without one.

## 7. Where service workers fit

A **service worker** shares the word "worker" and the `postMessage` hatch, but it does a different job. It sits between your site and the network: every request the page makes can pass through it, and it can answer from a cache instead. That's what makes a site work offline, and what receives push notifications.

The browser, not your page, decides when a service worker runs. It starts one when a request or a push arrives, and stops it again when it's idle, sometimes after only seconds, so a service worker can't be relied on to hold anything in memory. It's also installed once and keeps controlling your pages across visits, with its own install and update rules.

So the split is by job. Heavy computing, like Kabir's filters, goes in dedicated workers. Work or state that open tabs should share goes in a shared worker. Controlling the network, caching and offline support go in a service worker, which is a topic of its own.

That leaves one place Kabir's editor lives that these lessons haven't covered: React. [Lesson 11](11-workers-in-react.md) puts the workers inside components.
