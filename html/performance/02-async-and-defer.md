# `async` and `defer`

Back on Priya's building site, some lines in the plans say *get the electrician in*. The electrician lives across town, so the question is what the builder does while waiting.

A plain `<script src>` is the old arrangement: **stop, send for the electrician, wait, let them do their work, then carry on reading.** Nothing else gets built in the meantime. [01-render-blocking-and-first-paint.md](01-render-blocking-and-first-paint.md) §3 explains why the browser has to work that way.

`async` and `defer` both say *send for the electrician now and keep building*. They differ in when the electrician is allowed to start:

- `async`: **the moment they turn up.** The builder stops reading the plans and waits while the electrician works. That could be halfway down the plans or after the last line, depending on when the electrician arrives.
- `defer`: **once the builder has read the last line of the plans**, in the order they were listed, before the structure is signed off.

"Signed off" is DOMContentLoaded, the event that fires when the HTML has been read to the end. The rest of this note is the detail behind those two sentences.

---

## 1. Four scripts racing

All four scripts are in `<head>`, and the test server holds each one back for the time in the comment. Each script logs when it ran, what `document.readyState` said, and whether the `<footer>` at the bottom of the page existed yet. The page also logs `DOMContentLoaded` and `load`.

`document.readyState` is a property that tells you how far the browser has got with loading the page. It always holds one of three strings, and it only moves forward:

- `"loading"`: the browser is still reading the HTML. Elements lower down the page may not exist yet.
- `"interactive"`: the browser has read the last line of the HTML, so every element is in the DOM. Things the page asked for, like images and deferred scripts, may still be on their way.
- `"complete"`: everything has arrived, including images, stylesheets and scripts. The `load` event fires straight after.

On Priya's building site: `"loading"` means the builder is still reading the plans, `"interactive"` means the builder has read the last line, and `"complete"` means every delivery has arrived as well.

```html
<script defer src="/vendor.js"></script>    <!-- 300 ms -->
<script defer src="/app.js"></script>       <!-- 100 ms -->
<script async src="/analytics.js"></script> <!-- 300 ms -->
<script async src="/chat.js"></script>      <!-- 100 ms -->
```

```
  117ms  interactive chat.js ran, footer exists
  318ms  interactive vendor.js ran, footer exists
  318ms  interactive app.js ran, footer exists
  318ms  interactive DOMContentLoaded
  319ms  interactive analytics.js ran, footer exists
  319ms  complete    load
```

**chat.js ran first.** It's `async` and arrived at about 100 ms, so it ran straight away. It comes last in the markup, and that made no difference.

**app.js arrived at 100 ms too, and waited.** It's `defer`, and deferred scripts run in the order they appear. `vendor.js` is above it and took 300 ms, so `app.js` sat ready for 200 ms until `vendor.js` had run. That ordering is the reason to use `defer` for code that depends on other code, such as a library and then the app built on it.

**DOMContentLoaded waited for both deferred scripts.** The HTML had been read within a few milliseconds, but the browser doesn't fire DOMContentLoaded until the deferred scripts have run.

**analytics.js ran after DOMContentLoaded.** `async` scripts aren't tied to that event at all. On a faster network the same script would have run before it, so an `async` script that listens for DOMContentLoaded will sometimes miss it.

**`load` waited for everything.** Both kinds of script hold up the `load` event. Only `defer` holds up DOMContentLoaded.

---

## 2. When the HTML itself is slow

In §1 the whole page arrived at once, so the parser had finished before any script arrived. Real pages often stream: the server sends the `<head>` early and keeps working on the rest. Here the second half of the HTML is held back for a second, with one `defer` script and one `async` script in the head, each taking 100 ms:

```
  111ms  loading     chat.js ran, footer missing
 1011ms  interactive app.js ran, footer exists
 1011ms  interactive DOMContentLoaded
```

`chat.js` (async) ran while `readyState` was still `"loading"`, with the parser halfway down the page. It found no footer, because the footer hadn't arrived. `app.js` (defer) arrived at the same time but held off until the parser had finished.

That's the real difference between them. A deferred script can count on the whole document being there. An `async` script can't count on anything: it might run before the element it's looking for exists, or after, depending on the network that day. So `async` suits scripts that stand on their own, like analytics, an ad tag, or a chat widget that builds its own DOM. It's the wrong choice for anything that looks up elements in the page or needs another script to have run first.

Neither attribute makes the script itself any cheaper. They stop the *download* from holding up the parser. When an `async` script runs, it runs on the main thread, and the parser pauses until it's done.

---

## 3. Stylesheets

[01 §3](01-render-blocking-and-first-paint.md) showed that a plain script waits for the stylesheets above it before it runs. The two attributes differ here too:

```html
<link rel="stylesheet" href="/style.css">  <!-- 1 s -->
<script defer src="/app.js"></script>      <!-- instant -->
<script async src="/chat.js"></script>     <!-- instant -->
```

```
   11ms  interactive chat.js ran, footer exists
 1013ms  interactive app.js ran, footer exists
 1014ms  interactive DOMContentLoaded
```

The `async` script ran at 11 ms without waiting for the stylesheet. The deferred script waited the full second, and DOMContentLoaded waited with it. So a slow stylesheet delays your deferred app code, and everything that waits on DOMContentLoaded.

---

## 4. Inline scripts and modules

Both attributes are about the download, so they only mean something on a script with a `src`. Module scripts follow slightly different rules:

```html
<script defer>log('inline classic with defer ran, footer ' + (document.querySelector('footer') ? 'exists' : 'missing'))</script>
<script type="module">log('inline module ran, footer ' + (document.querySelector('footer') ? 'exists' : 'missing'))</script>
<script type="module" src="/mod.js"></script>              <!-- 100 ms -->
<script type="module" async src="/mod-async.js"></script>  <!-- 50 ms -->
```

```
    7ms  loading     inline classic with defer ran, footer missing
    8ms  interactive inline module ran, footer exists
   58ms  interactive mod-async.js ran, footer exists
  109ms  interactive mod.js ran, footer exists
  109ms  interactive DOMContentLoaded
```

**`defer` on an inline classic script is ignored.** It ran at 7 ms, partway through parsing, like any inline script. There's nothing to download, so there's nothing to defer.

**Module scripts are deferred by default, inline or not.** The inline module waited for parsing to finish even though it had nothing to fetch, and `mod.js` behaved exactly like a `defer` script. Writing `defer` on a module changes nothing.

**`async` does work on modules**, and means the same thing: run as soon as it's ready. For a module, "ready" means the file and everything it imports have arrived. `mod-async.js` ran before `mod.js`.

---

## 5. Scripts added from JavaScript

A script created with `document.createElement('script')` and added to the page never blocks parsing. It also behaves as `async` unless you say otherwise:

```js
for (const [name, ms] of [['dyn-a', 300], ['dyn-b', 100]]) {
  const s = document.createElement('script');
  s.src = `/${name}.js`;                       // held back for ms
  log(`${name}.js inserted, s.async = ${s.async}`);
  document.head.append(s);
}
```

```
    7ms  loading     dyn-a.js inserted, s.async = true
    7ms  loading     dyn-b.js inserted, s.async = true
    7ms  interactive DOMContentLoaded
  111ms  interactive dyn-b.js ran, footer exists
  312ms  interactive dyn-a.js ran, footer exists
  312ms  complete    load
```

`s.async` was already `true` without being set, and the two scripts ran in the order they arrived, `dyn-b` first. Adding `s.async = false` before `append`, with one `log('inserted both with async = false')` after the loop instead of the one inside it:

```
    7ms  loading     inserted both with async = false
    7ms  interactive DOMContentLoaded
  312ms  interactive dyn-a.js ran, footer exists
  312ms  interactive dyn-b.js ran, footer exists
  312ms  complete    load
```

`dyn-b` arrived at 100 ms and waited for `dyn-a`. That's how a script loader downloads a chain of dependencies in parallel and still runs them in order.

`async = false` changes only that order. It doesn't make the script block the parser like a plain `<script src>` in the HTML. The builder stops only at scripts written in the plans, and an injected script was never in them.

Neither version held up DOMContentLoaded, because the browser doesn't count injected scripts for it, but both held up `load`.

---

## 6. Both attributes at once

`<script async defer src>` is allowed, and `async` wins. The same slow-streaming page as §2, with `x.js` (100 ms) carrying both attributes and `app.js` a plain `defer` for comparison:

```
  121ms  loading     x.js ran, footer missing
 1027ms  interactive app.js ran, footer exists
 1027ms  interactive DOMContentLoaded
```

`x.js` ran mid-parse with the footer still missing, which is `async` behaviour. The `defer` on it was a fallback for browsers so old that they didn't understand `async`. Today it does nothing.
