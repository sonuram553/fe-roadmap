# Storage in the browser

Level: beginner to intermediate. The places a web page can keep data on the user's machine (cookies, `localStorage`, `sessionStorage`, IndexedDB and the Cache API), what each one is for, and how they behave when you actually use them. Every output quoted here comes from running the code in Chrome 154.

## 1. A hotel with one room per guest

Think of the browser as a hotel. Every website that visits gets its own room, and the room comes with several pieces of furniture for keeping things: a slip of paper the doorman reads, a small safe, a notepad by the bed, a big storeroom downstairs, and a pantry. Each one is suited to a different kind of thing, and the whole lesson is about which piece of furniture to reach for.

Meera is building a notes app that should keep working when the train goes into a tunnel. The app needs to remember the user's theme, the half-typed draft, the notes themselves, the app's files for offline use, and who is logged in. Each of those ends up in a different place.

The first rule of the hotel is that guests can't open each other's rooms. The room number is the page's **origin**: the scheme, host and port together, like `http://localhost:5401`. Meera saved a draft on one port and looked for it on another:

```js
// on http://localhost:5401
localStorage.setItem('draft', 'Buy milk');
localStorage.getItem('draft');   // on :5401

// on http://localhost:5402
localStorage.getItem('draft');   // on :5402
```

```
A: Buy milk
B: null
```

Same machine, same host name, different port, so a different room and an empty safe. The same wall stands between `http://` and `https://`, and between `app.example.com` and `example.com`. Everything in this lesson is per origin, with one notable exception, which is the next section.

## 2. Cookies: the slip the doorman reads

A **cookie** is a small piece of text, like `theme=dark`, that a website asks the browser to keep. From then on, whenever the browser sends a request to that website, it adds the cookie to the request by itself. Your code doesn't have to do anything.

In the hotel, a cookie is a note pinned to the guest's coat. The guest never takes it out. The doorman just reads it every time they walk in.

That is the main reason to use a cookie: the server gets it on every request, without being asked. To see this happen, Meera's server prints the cookies that arrive with each request, and the page prints the cookies JavaScript can read:

```js
await fetch('/api/notes');
await fetch('/api/login');          // server replies with two Set-Cookie headers
console.log(document.cookie);
document.cookie = 'lang=en; path=/';
document.cookie = 'fontSize=16; path=/';
console.log(document.cookie);
await fetch('/api/notes');
```

The login response set two cookies:

```
Set-Cookie: sid=abc123; HttpOnly; Path=/; SameSite=Lax
Set-Cookie: theme=dark; Path=/; Max-Age=31536000
```

And this is what happened:

```
[server :5401] /api/notes Cookie: (none)
[server :5401] /api/login Cookie: (none)
[tab A] document.cookie after login: "theme=dark"
[tab A] document.cookie now: "theme=dark; lang=en; fontSize=16"
[server :5401] /api/notes Cookie: sid=abc123; theme=dark; lang=en; fontSize=16
```

The server got every cookie on the last request, including the two the page set itself. Nobody wrote code to send them. That is lovely for a login session and wasteful for everything else: every cookie rides along on every request to that site, images and scripts included. So cookies should stay small (browsers cap each one at about 4 KB) and should only hold things the server needs to see.

`sid` never showed up in `document.cookie`. It was marked `HttpOnly`, which means the browser keeps it and sends it but refuses to hand it to JavaScript. The guest can't read the slip; only the doorman can. If an attacker manages to run a script on the page ([xss.md](../../node/web-security/xss.md)), they still can't steal the session id. That is why session cookies should always be `HttpOnly`, and why [jwt-auth.md](../../node/jwt-auth.md) argues for keeping tokens in one rather than in `localStorage`.

`document.cookie` is an odd API. Reading it gives one long string of `name=value` pairs that you have to split yourself. Writing to it doesn't replace that string; it sets or updates *one* cookie, with its options after semicolons. To delete a cookie you set it again with an expiry in the past:

```js
document.cookie = 'fontSize=; path=/; max-age=0';
```

```
after deleting fontSize: "theme=dark; lang=en"
```

The options control when the slip is shown. `Max-Age` (or `Expires`) decides how long it lasts; without one, it is a *session cookie* that goes when the browser closes. `Secure` means only send it over HTTPS. `SameSite` decides whether it goes along on requests that start from *other* sites, which is the heart of CSRF protection ([csrf.md](../../node/web-security/csrf.md)).

Then there is the exception promised in §1. Meera opened a tab on port 5402:

```
[tab on :5402] document.cookie: "theme=dark; lang=en"
[server :5402] /api/notes Cookie: sid=abc123; theme=dark; lang=en
```

Cookies are older than the origin rule and are filed by host name, not by port. The slips from port 5401 were read out at port 5402 as well. They can even be shared across subdomains on purpose, with `Domain=example.com`. So "per origin" is true of everything in this lesson except cookies.

## 3. localStorage: the small safe in the room

`localStorage` is a small key/value store that stays put. Close the tab, restart the browser, come back next week: it's still there. It is the little safe in the hotel room, and it is the easiest storage there is:

```js
localStorage.setItem('theme', 'dark');
localStorage.getItem('theme');     // 'dark'
localStorage.removeItem('theme');
localStorage.clear();              // empties the whole safe for this origin
```

It never goes to the server. That makes it the natural home for things only the page cares about: the theme, the sidebar width, the last opened note.

The catch is that the safe only holds paper. Every key and every value is a string, and anything else is turned into a string on the way in. Meera tried saving the settings the app actually had:

```js
localStorage.setItem('fontSize', 16);
localStorage.setItem('settings', { theme: 'dark' });
localStorage.setItem('wordWrap', false);
```

```
fontSize: "16" (string)
settings: "[object Object]"
wordWrap: "false", truthy? true
missing: null
```

The number came back as a string. The object was squashed into the useless text `"[object Object]"`, and the original is gone. The worst one is `false`: it came back as the string `"false"`, which is truthy, so `if (localStorage.getItem('wordWrap'))` would turn word wrap *on*. And a key that was never set gives `null`, not `undefined`.

The fix is to convert to text yourself with JSON, both ways:

```js
localStorage.setItem('settings', JSON.stringify({ theme: 'dark', fontSize: 16 }));
const settings = JSON.parse(localStorage.getItem('settings'));
settings.fontSize + 1;
```

```
parsed: 17
```

The safe is also small. Meera filled it in 100,000-character chunks until it refused:

```
QuotaExceededError after 52 chunks of 100,000 chars: Failed to execute 'setItem' on 'Storage': Setting the value of 'k52' exceeded the quota.
```

About five million characters per origin, and `setItem` throws once you hit it, so a write that might be large belongs in a `try`/`catch`.

The last catch is the one that matters most for big data: `localStorage` is **synchronous**. When you call `getItem`, the page stops and waits for the answer. Opening the safe is quick, but nothing else happens while you do it. Writing a 4-million-character value took a measurable slice of a frame:

```
write 4M chars: 5.6 ms, read: 0.4 ms
```

For a theme name that is nothing. For a few megabytes on every keystroke, it is a janky editor.

And like everything else a script can read, the safe is open to any script running on the page, including one an attacker injected. Tokens and other secrets don't belong in it; that is what the `HttpOnly` cookie in §2 is for. Being synchronous is also why `localStorage` doesn't exist inside web workers at all ([web workers lesson 3](../8.%20web-workers/03-inside-a-worker.md) §1): letting several threads block on the same safe would bring back the exact problems workers avoid.

## 4. Hearing about changes from other tabs

If Meera's app is open in two tabs and the user switches to dark mode in one, the other tab should follow. `localStorage` helps here: when one tab changes it, every *other* tab of the same origin gets a `storage` event. Meera listened in both tabs, then changed the theme from tab A three times, the last time to the value it already had:

```js
addEventListener('storage', (e) => {
  console.log(`storage event: key=${e.key} old=${e.oldValue} new=${e.newValue} url=${e.url}`);
});

// in tab A
localStorage.setItem('theme', 'dark');
localStorage.setItem('theme', 'light');
localStorage.setItem('theme', 'light');
```

```
[tab B] storage event: key=theme old=null new=dark url=http://localhost:5401/
[tab B] storage event: key=theme old=dark new=light url=http://localhost:5401/
```

Only tab B heard anything. The tab that made the change never gets its own event, so it has to update itself directly. And setting a value to what it already was fires nothing. With those two rules in mind, syncing a setting across tabs is a few lines:

```js
addEventListener('storage', (e) => {
  if (e.key === 'theme') applyTheme(e.newValue);
});
```

## 5. sessionStorage: the notepad by the bed

`sessionStorage` has exactly the same methods as `localStorage` and the same strings-only rule. The difference is how long it lives and who can see it. It is the notepad on the bedside table: it belongs to one stay, and it's thrown out at checkout. Here, a stay is a tab.

```js
// tab A
sessionStorage.setItem('scrollY', '840');
```

```
tab A: 840
tab B (same origin): null
tab A after reload: 840
```

Tab B is the same origin, the same room in hotel terms, and it still sees nothing, because each tab has its own notepad. Reloading tab A kept the value, since a reload is the same stay. Closing the tab ends the stay and the notepad goes with it.

There is one exception. If tab A opens a new tab itself, with `window.open`, the new tab starts with a photocopy of A's notepad.

```js
// in tab A
const newTab = window.open('/', '_blank');

// in the new tab
sessionStorage.getItem('scrollY');        // '840', copied from A
sessionStorage.setItem('scrollY', '0');   // change the copy

// back in tab A
sessionStorage.getItem('scrollY');        // still '840'
```

```
tab opened by A with window.open: 840
after popup changes its copy, tab A still has: 840
```

The new tab saw `840` without anyone saving it there. That came from the copy. Then the new tab changed its value to `0`, and tab A still had `840`. It is a photocopy, not a shared pad: from the moment the tab opens, the two sides are separate, and changes on one side never reach the other.

Why does the browser copy at all? Because a tab opened with `window.open` stays connected to the tab that opened it. The new tab can reach back to tab A through `window.opener`. The browser treats the two as one piece of work that has split in two, so the new tab is given what tab A knew.

`noopener` cuts that connection. It tells the browser: open this page, but don't link it to me.

```js
// in tab A
window.open('/', '_blank', 'noopener');

// in the new tab
window.opener;                       // null
sessionStorage.getItem('scrollY');   // null
```

```
tab opened with noopener: null
```

With no link to tab A, the new tab is a stranger, so it starts with a blank notepad. `noopener` exists mainly for safety: without it, a page you open (maybe on another site) can use `window.opener` to send your tab somewhere else. Because of that, browsers now apply `noopener` to ordinary `<a target="_blank">` links by default. Meera clicked such a link in tab A and checked the new tab:

```
<a target=_blank>: scrollY = null | opener? null
```

So in practice, only a plain `window.open` call passes the notepad on. A link opened in a new tab, or a tab the user opens themselves, starts empty.

That per-tab lifetime is exactly right for state that describes *this* tab: the scroll position, a half-filled form, which note this tab is editing. Meera keeps the unsaved draft here, so two tabs editing different notes don't overwrite each other's drafts, while a reload doesn't lose the text.

## 6. IndexedDB: the storeroom downstairs

The notes themselves don't fit any of the above. There could be thousands of them, with dates, tags and attached images. For that the browser has **IndexedDB**: a real database built into every browser, with room for hundreds of megabytes. It is the storeroom in the basement. It keeps values with their real types (a `Date` stays a `Date`), finds things through indexes, works inside web workers, and never blocks the page, because every read and write is asynchronous.

It has more moving parts than anything else here, so it has its own lesson: [IndexedDB](indexeddb.md).

## 7. The Cache API: the pantry of ready meals

For offline use, Meera also needs the app's own files: the HTML, the scripts, the CSS, plus a few API answers. The **Cache API** stores exactly that: pairs of an HTTP request and its response, kept whole with status and headers. It is the pantry, full of meals that are already cooked and only need serving.

```js
const cache = await caches.open('notes-shell-v1');
await cache.add('/api/notes');    // fetches it and stores the response
await cache.put('/offline.html', new Response('<h1>You are offline</h1>', {
  headers: { 'Content-Type': 'text/html' },
}));

const hit = await caches.match('/offline.html');
```

```
[server :5401] /api/notes Cookie: (none)
cache keys: /api/notes, /offline.html
match /offline.html: 200 text/html <h1>You are offline</h1>
match /missing: undefined
cache names: notes-shell-v1
```

`add` made a real network request and stored the response. `put` stored a response Meera built by hand. `match` gave back a complete `Response`, status and headers included, and `undefined` for anything not stored.

Despite the name, this has nothing to do with the browser's normal HTTP cache, which the browser manages on its own using `Cache-Control` headers. Nothing goes into the Cache API unless your code puts it there, and nothing leaves until your code deletes it. That is why caches are usually named with a version, like `notes-shell-v1`: a new release opens `-v2` and deletes the old one.

It is usually driven from a **service worker**, a script that sits between the page and the network and can answer requests from the pantry when the network is gone. [Web workers lesson 11](../8.%20web-workers/11-shared-workers.md) §7 places service workers next to the other kinds of worker. The Cache API itself works fine from the page too, as above.

## 8. How much room there is, and who can clear it

Everything except cookies shares one budget per origin, and the browser reports it:

```js
const { usage, quota } = await navigator.storage.estimate();
```

```
estimate: usage 0.0 MB, quota 10240.0 MB
after storing a 50 MB blob: usage 50.0 MB, by type {"indexedDB":"50.0 MB"}
```

The quota is generous in Chrome, a share of the free disk space, so the number above is only what this run happened to get. (`localStorage`'s five million characters is a separate, much smaller limit of its own.) Firefox and Safari set their own limits, so treat `estimate()` as the truth for the current browser, not a number to hard-code.

The more important point is that this storage is **not guaranteed to stay**. By default it is *best-effort*: when the disk runs low, the browser may clear whole origins, least recently used first, without asking. Hotel management empties a storeroom when the building is full. The user can also clear site data any time, and private windows throw everything away when they close. Safari goes further and deletes script-written storage for sites the user hasn't interacted with in seven days.

A page can ask to be left alone:

```js
await navigator.storage.persist();
```

```
persisted? false, persist() -> false
```

It said no here, which is common: Chrome grants it based on how much the user engages with the site (bookmarked, installed as an app, frequently visited), and Firefox asks the user. When it is granted, the browser won't clear that origin on its own to free space.

The practical rule for Meera is that the browser is a cache, not the source of truth. Notes are written to IndexedDB so the app works in the tunnel, and synced to Meera's server when the network is back. If the browser clears the storeroom, the app downloads everything again, and nothing is lost.
