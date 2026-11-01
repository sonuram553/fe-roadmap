# The preload scanner, and `preload`, `preconnect` and `prefetch`

When the builder on Priya's site stops to wait for the electrician ([02-async-and-defer.md](02-async-and-defer.md)), the building stops for a while. The time isn't wasted, though. An apprentice keeps reading the plans ahead of the builder. Every time the plans mention a material, like timber or tiles, the apprentice orders it straight away. By the time the builder gets to that part of the plans, the delivery is already on its way.

In the browser, the apprentice is the **preload scanner**. While the main parser is stopped, the scanner reads on through the HTML and starts downloading every file it finds there, such as images, stylesheets and scripts.

The apprentice only reads the plans, though. Some files aren't in the HTML at all. A background image or a font is usually named inside a CSS file, and some images are added by JavaScript. The scanner can't see those, so they only start downloading later, once the browser reads that CSS or runs that script.

That's where the three `<link rel>` hints come in. Each one is a note Priya writes at the top of the plans:

- `preload`, *order this now*: this page will need this file, so start downloading it straight away.
- `preconnect`, *ring the supplier first*: files will come from this other server, so start connecting to it now.
- `prefetch`, *order for the next job*: the next page will need this file, so download it while you're not busy.

---

## 1. What the preload scanner does

When the main HTML parser is stopped, by a plain `<script src>` for instance ([01-render-blocking-and-first-paint.md](01-render-blocking-and-first-paint.md) §3), the browser doesn't sit idle. A second, much simpler parser runs on through the rest of the HTML. It doesn't build the DOM and it doesn't run anything. It looks for URLs in tags, such as `<img src>`, `<link href>` and `<script src>`, and starts fetching them.

That second parser is the preload scanner, and it's always on. Every modern browser runs it on every page, and there's nothing to switch on. The name makes it easy to mix up with `<link rel="preload">`, but that's a different thing. `rel="preload"` is a tag you write yourself, for files the scanner can't find on its own (§2).

Here's a page where `vendor.js` at the top is held back for a second, which stops the parser there:

```html
<head>
  <style>.banner { background-image: url(/img/banner.png) }</style>
  <script src="/vendor.js"></script>                <!-- 1 s -->
</head>
<body>
  <h1>Priya's Plants</h1>
  <img src="/img/hero.png" width="800" height="400">
  <link rel="stylesheet" href="/late.css">
  <div class="banner">Free delivery</div>
  <img data-src="/img/lazy-lib.png" class="js-lazy">
  <script src="/app.js"></script>
  <script>
    const i = new Image(); i.src = '/img/from-js.png'; document.body.append(i);
    document.querySelectorAll('.js-lazy').forEach((el) => (el.src = el.dataset.src));
  </script>
</body>
```

The test server's log of when each request reached it, with the query strings it uses for timing left off:

```
     5ms  /scan.html
    18ms  /vendor.js
    21ms  /img/hero.png
    24ms  /late.css
    26ms  /app.js
  1025ms  /img/from-js.png
  1028ms  /img/lazy-lib.png
  1030ms  /img/banner.png
```

**Everything written in a tag was requested within 26 ms**, while the parser itself was still stuck at `vendor.js`. Without the scanner, `hero.png`, `late.css` and `app.js` would each have waited a second before starting.

**Three requests waited the full second.** Each one is a URL the scanner had no way to find:

- `from-js.png` is created by a script, and the scanner doesn't run scripts.
- `lazy-lib.png` sits in a `data-src` attribute, the pattern that JavaScript lazy-loading libraries use. To the scanner, `data-src` is just text.
- `banner.png` is named in CSS. The scanner doesn't fetch images from stylesheets, and it couldn't know whether any element uses `.banner` until the page has been styled anyway.

---

## 2. `preload`: order this now

`<link rel="preload">` tells the browser about a file early. You put the tag near the top of the page, with the file's URL and what kind of file it is. The preload scanner sees the tag and starts downloading the file straight away, before anything on the page has asked for it.

Fonts are where this helps most, because the browser finds out about a font late. It has to go through three steps first:

1. Download the stylesheet.
2. Read the `@font-face` rule in it, which gives the font file's URL.
3. Work out that some text on the page uses that font.

Only then does it start downloading the font. On Priya's page, the `<h1>` uses a font from `fonts.css`. The test server holds `fonts.css` back for 200 ms and the font file for 300 ms:

```
no preload
     7ms  /fonts.css
   216ms  /georgia.ttf
  h1 painted at 524 ms

<link rel="preload" href="/georgia.ttf" as="font" type="font/ttf" crossorigin>
     7ms  /georgia.ttf
     7ms  /fonts.css
  h1 painted at 348 ms
```

**Without preload, the font was requested at 216 ms.** The browser asked for `fonts.css` at 7 ms and got it 200 ms later. Only then could it read the `@font-face` rule and ask for the font. The heading was painted at 524 ms.

**With preload, the font was requested at 7 ms.** The tag gave the browser the font's URL straight away, so it asked for both files at the same time. The heading was painted at 348 ms, about 180 ms sooner.

It has to be `rel="preload"`. Whether the browser fetches a `<link>` at all depends on its `rel`, and HTML has no `rel` value that just means "this is a font". Here the parser is stuck behind a script held back for a second, with four `<link>` tags after it:

```html
<script src="/blocker.js"></script>   <!-- 1 s -->
<link rel="stylesheet" href="/style.css">
<link rel="font" href="/rel-font.woff2">
<link href="/no-rel.woff2">
<link rel="preload" href="/preloaded.woff2" as="font" type="font/woff2" crossorigin>
```

```
    75ms  /style.css
    76ms  /blocker.js
    76ms  /preloaded.woff2
  1099ms  /favicon.ico
```

The stylesheet and the preload were both fetched straight away, while the parser was still stuck. The other two were never fetched, not even after the parser got going again at one second. `font` isn't a real `rel` value, and a `<link>` with no `rel` doesn't say what the file is for, so the browser ignored both tags. (`favicon.ico` is Chrome asking for the tab icon on its own.) A font is normally named only inside CSS, so `rel="preload"` is the only way to put its URL in the HTML.

Besides `rel` and `href`, the tag has three attributes, and each one matters:

- `as="font"` says what kind of file it is. The browser uses it to decide how urgently to download the file (§4). It also uses it to match the preloaded file to the real request later, so the file is only downloaded once.
- `type="font/ttf"` says the file format. A browser that can't use that format skips the download.
- `crossorigin` is needed because browsers always fetch fonts in CORS mode, even from your own site. Without it, the font is downloaded twice, as §3 shows.

The browser downloads a preloaded file even if nothing ends up using it, and usually at high priority. So only preload files the page is sure to need, and needs early. Good examples are the font for the main heading, a hero image set as a CSS background, and the script a client-rendered app can't start without. If you preload six files, they compete with each other for the network, and with the stylesheet that the first paint is waiting for.

---

## 3. When a preload goes wrong

The browser only uses a preloaded file if the real request for it matches the preload. If the two don't match, the preloaded copy is wasted, and the browser downloads the file a second time.

The easy way to get this wrong is to leave off `crossorigin`. Here's Priya's page from §2 again, with the same preload but no `crossorigin`:

```
     6ms  /georgia.ttf
     6ms  /fonts.css
   311ms  /georgia.ttf
  h1 painted at 624 ms
```

**The font was downloaded twice.** The request at 6 ms was the preload. The one at 311 ms was the real request from the `@font-face` rule, which couldn't use the preloaded copy.

**The heading was painted later than with no preload at all.** The real request started at 311 ms, compared with 216 ms when there was no preload in §2. So the heading was painted at 624 ms instead of 524 ms. A broken preload is worse than none.

Chrome explains why in the console. (`?d=300` in the URL is how the test server was told to hold the file back.)

```
A preload for 'http://localhost:5501/georgia.ttf?d=300' is found, but is not used because the request credentials mode does not match. Consider taking a look at crossorigin attribute.
```

"Credentials mode does not match" means one request used CORS and the other didn't. Without `crossorigin`, the preload fetched the font without CORS. The `@font-face` rule always fetches fonts with CORS. So the two requests didn't match.

Chrome has a second warning, for a preload that nothing on the page uses. It shows up a few seconds after the page has loaded:

```
The resource http://localhost:5501/img/old-hero.png was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.
```

Look out for this one after a redesign. The old hero image is gone, but its preload tag is often still in the page template. Every visitor then downloads an image the page never shows.

---

## 4. Priorities

Every request gets a priority, and the hints and attributes change it. This is Chrome's own view from the DevTools protocol for one page with a mix of preloads and images. The protocol calls the levels VeryLow to VeryHigh, and the DevTools Network panel shows the same levels as Lowest to Highest.

```html
<link rel="preload" href="/georgia.ttf" as="font" type="font/ttf" crossorigin>
<link rel="preload" href="/late.css" as="style">
<link rel="preload" href="/app.js" as="script">
<link rel="preload" href="/img/p.png" as="image">
<link rel="preload" href="/img/p-high.png" as="image" fetchpriority="high">
<link rel="preload" href="/data.json" as="fetch" crossorigin>
<link rel="modulepreload" href="/vendor.js">
<link rel="prefetch" href="/next.html">
…
<img src="/img/hero.png" fetchpriority="high">
<img src="/img/plain.png">
```

```
/georgia.ttf     Font        High
/late.css        Stylesheet  VeryHigh
/app.js          Script      High
/img/p.png       Image       Low
/img/p-high.png  Image       High
/data.json       Other       High
/vendor.js       Script      High
/img/hero.png    Image       High
/img/plain.png   Image       Medium -> High
/next.html       Other       VeryLow
```

**`as` decides the priority.** A preloaded stylesheet is fetched as urgently as a real one, and a preloaded image as lazily as a real one: `p.png` went at Low. So preloading an image doesn't, on its own, make it urgent.

**`fetchpriority="high"` does.** It lifted the preloaded image to High, and it does the same on a plain `<img>`. For the one image that's the largest thing on the first screen, `fetchpriority="high"` on its `<img>` tag is usually all it needs, since the scanner can already see it.

**Images change priority once the page has been laid out.** `plain.png` started at Medium and was raised to High when Chrome found it on screen. Images below the visible area stay low.

**`modulepreload`** is the version of `preload` for JavaScript modules. It fetches a module the same way an `import` would, so the later `import` finds it ready.

**`prefetch` was VeryLow**, the bottom of the queue. §6 is about why.

---

## 5. `preconnect`: ring the supplier first

Before the first byte of a request can go to a new origin, the browser has to find the server and set up a connection: a DNS lookup, then a TCP connection, then for HTTPS a TLS handshake. Each one takes at least one round trip across the network. With a 100 ms round trip, that's 300 ms before the request itself has even been sent. It's the builder ringing a new supplier, answering their security questions and opening an account, all before placing the first order.

`<link rel="preconnect">` does all of that early, before the browser knows what it will ask for. It pays off when the URL is only found late, like an image whose address comes back in an API response, from an image CDN on another origin.

To show it, the CDN in this test sits behind a proxy that holds every new connection for 300 ms before the TLS handshake can finish, and the page asks for an image from it 500 ms after loading:

```
                           connection opened   image requested   connect time   image arrived
no hint                    543 ms              529 ms            321 ms         855 ms
<link rel="preconnect">    26 ms               520 ms            0 ms           525 ms
<link rel="dns-prefetch">  529 ms              520 ms            309 ms         833 ms
```

With the hint, the connection was opened at 26 ms and was ready long before the image was wanted. The image request went straight down it, with a connect time of zero, and the image arrived 330 ms sooner.

`dns-prefetch` does only the first of the three steps. In this test the delay was all in the connection, so it didn't help at all. On a real network it saves the DNS lookup and nothing more. It's the cheaper hint, because no connection is held open, so it suits origins the page *might* use.

Fonts trip people up here too. The browser keeps separate connections for requests that send cookies and requests that don't, and a font's CORS fetch doesn't. A `preconnect` without `crossorigin` opens the wrong kind:

```
                                  connections opened   connect time   font arrived
preconnect without crossorigin    15 ms, 520 ms        307 ms         826 ms
preconnect with crossorigin       31 ms                0 ms           522 ms
```

Without the attribute, Chrome opened a connection at 15 ms and then never used it. The font got a second, fresh connection at 520 ms. So a `preconnect` to a font host needs `crossorigin`. An origin that serves both fonts and ordinary images would need two hints, one with the attribute and one without.

Every preconnect holds a connection open and makes the server do a handshake. So keep them for the two or three origins the page is certain to use early on, like the font host, the image CDN or the API. A preconnect to an origin nobody uses is pure cost.

---

## 6. `prefetch`: order for the next job

`preload` is for this page. `prefetch` is for the page the visitor is probably going to next, such as the checkout after a product page. The browser fetches it at the lowest priority, and sends a header so the server can tell it's a prefetch:

```
    10ms  /checkout.html  [Sec-Purpose: prefetch]
```

Whether that download is any use depends on the next page load finding it. In Chrome 155 that came down entirely to the response's cache headers. Here the visitor clicks *Buy* a second after the product page loads:

```
Cache-Control on checkout.html   requests the server saw       checkout page's deliveryType
------------------------------   ---------------------------   ----------------------------
(none)                           25ms [prefetch], 1065ms        ""
no-cache                         10ms [prefetch], 1044ms        ""
max-age=300                      15ms [prefetch]                "cache"
no-store                         13ms [prefetch], 1051ms        ""
```

`<link rel="prefetch">` puts the response in the ordinary HTTP cache, so the click only used it when the cache was allowed to keep it, which here meant `max-age=300`. Without cache headers, which is normal for HTML, the prefetched copy was ignored and the page was fetched again. Older articles describe a five-minute grace period in Chrome that let prefetched files be reused whatever their headers said. That's not what happened here.

The newer tool for this job is the Speculation Rules API, which is designed for whole pages:

```html
<script type="speculationrules">
  { "prefetch": [{ "source": "list", "urls": ["/checkout.html"] }] }
</script>
```

```
Cache-Control on checkout.html   requests the server saw   checkout page's deliveryType
------------------------------   -----------------------   ----------------------------
(none)                           19ms [prefetch]           "navigational-prefetch"
no-cache                         18ms [prefetch]           "navigational-prefetch"
max-age=300                      12ms [prefetch]           "navigational-prefetch"
no-store                         13ms [prefetch]           "navigational-prefetch"
```

One request every time, whatever the headers said. A speculation-rules prefetch is kept for that one page load rather than put in the HTTP cache, so the page doesn't have to be cacheable. Browsers that don't support it ignore the `<script>` block and load the page normally when it's clicked.

So for "the next page", Speculation Rules is the better choice today. `<link rel="prefetch">` still makes sense for a cacheable file the next page will use, like a script chunk or a stylesheet.
