# Render-blocking resources and First Contentful Paint

Priya has drawn up the plans for a new plant shop and handed them to a builder. The builder works through the plans one line at a time, from the top, putting up whatever each line describes. Round the site there's a fence, and a customer is standing at it, waiting to see the shop.

Most lines say things like "wall here, shelves there", and the builder just gets on with them. A few lines name something that has to come from somewhere else first: the decorator's colour scheme, or an electrician from across town. What the builder does while those are on their way is what this whole group of notes is about.

That's a browser loading a page. The HTML is the plans, the browser is the builder, and the person looking at the screen is the customer at the fence. **First Contentful Paint** (FCP) is the moment the fence comes down and they see something, any text or image at all, instead of a blank white screen. A resource is **render-blocking** if the fence can't come down until it has arrived.

---

## 1. Stopping the builder, or keeping the fence up

A resource can hold up that first glimpse in two different ways.

It can **stop the builder reading.** Nothing further down the plans gets built until it's dealt with. A plain `<script src>` does this, and it's called **parser-blocking**, because the parser is the part of the browser that reads the HTML and builds the page's DOM from it.

Or it can **keep the fence up.** The builder carries on reading and building, but nobody outside is allowed to look. A stylesheet in `<head>` does this.

Here's Priya's page:

```html
<h1>Priya's Plants</h1>
<p>Monstera, fiddle-leaf figs and a great many cacti.</p>
```

Loaded in Chrome 155 three times: with nothing else, with a stylesheet in `<head>`, and with a script in `<head>`. The test server holds the stylesheet or script back for one second before sending it. To run it yourself, see [practice/render-blocking](practice/render-blocking/README.md).

```
extra resource in <head>     FCP       DOMContentLoaded
---------------------------  --------  ----------------
none                         20 ms     9 ms
<link rel="stylesheet">      1028 ms   7 ms
<script src>                 1044 ms   1010 ms
```

**DOMContentLoaded** is the event the browser fires when it has read the last line of the HTML, so it shows when the builder finished reading. Put it next to FCP and the two cases come apart.

**The stylesheet:** DOMContentLoaded fired at 7 ms, so the builder read the whole page straight away. FCP still waited the full second. Everything had been built, and the fence stayed up.

**The script:** both columns waited the full second. The builder stopped at the `<script>` line, and nothing after it existed until the script had arrived and run.

From the customer's side the two look the same: a second of white screen. The difference matters because the fixes are different, and §2 and §3 take each in turn.

---

## 2. Why a stylesheet keeps the fence up

The browser could paint the page before the CSS arrives. It would look broken: default fonts, blue underlined links, everything stacked down the left edge, and then a jump a second later as the real styles land. That jump has a name, the **flash of unstyled content**, and browsers decided long ago that a blank screen is better than a page that rearranges itself in front of you. So a stylesheet that applies to the screen holds back the first paint until it has arrived.

The waiting adds up when stylesheets chain. A stylesheet that `@import`s another can't tell the browser about the second one until the first has arrived:

```
outer.css   requested 5 ms      arrived 1007 ms   blocking
inner.css   requested 1008 ms   arrived 2018 ms   blocking
FCP 2048 ms
```

That's two seconds, because the second request couldn't start until the first had finished. Two `<link>` tags in the HTML would have fetched both files side by side, for one second in total.

The `blocking` there is real output too. Every entry in `performance.getEntriesByType('resource')` has a `renderBlockingStatus` field, either `"blocking"` or `"non-blocking"`, so you can ask a page which of its resources held the fence up.

---

## 3. Why a script stops the builder

A script can change the plans. `document.write()` inserts markup right where the script sits, so until the script has run, the browser doesn't know what the next line of the page will be.

A script can also read whatever has been built so far, and only that. Here `log()` is a small helper that prints its argument:

```html
<head>
  <script>log('body is ' + document.body)</script>
</head>
<body>
  <h1>Priya's Plants</h1>
  <p>Monstera, fiddle-leaf figs and a great many cacti.</p>
  <script>log('elements in body so far: ' + document.body.children.length)</script>
  <footer>bye</footer>
</body>
```

```
body is null
elements in body so far: 3
```

The script in `<head>` ran before `<body>` existed. The second one counted three children, the `<h1>`, the `<p>` and the `<script>` itself. It didn't count the `<footer>`, because the parser hadn't reached it yet. Each script runs at the moment the parser reaches it, and the parser waits for it to finish.

There's a knock-on effect that catches people out. A script might ask what something looks like, with `getComputedStyle(el).color` for example, and the answer depends on CSS that may not have arrived. So **a script won't run until the stylesheets above it have loaded**, and while it waits, it's still stopping the parser. The same one-second stylesheet, followed by an inline script:

```
inline script ran   1013 ms
DOMContentLoaded    1013 ms
FCP                 1044 ms
```

In §1 that stylesheet on its own let DOMContentLoaded fire at 7 ms. The inline script needs no download and takes no time to run, and it still turned a stylesheet that only kept the fence up into one that stopped the builder as well. That's why scripts used to go above stylesheets in `<head>`. Today the better fix is `defer`, which [02-async-and-defer.md](02-async-and-defer.md) §3 covers.

---

## 4. Where in the page it sits

Both rules are about what comes *before* the resource. Move it down the page and the picture changes. These times are per element, from the Element Timing API: an `elementtiming` attribute on the `<h1>` and the `<p>`, and a `PerformanceObserver` watching for `'element'` entries.

```
resource held 1 s                          <h1> painted   <p> painted   DOMContentLoaded
-----------------------------------------  -------------  ------------  ----------------
<script src> at the end of <body>          24 ms          24 ms         1015 ms
<link rel="stylesheet"> between h1 and p   24 ms          1040 ms       1017 ms
```

**A script at the end of `<body>` doesn't hold back the content above it.** The builder still stopped at the script, but everything before it had already been built, so Chrome took the fence down at 24 ms. That's why "put scripts at the bottom" was the standard advice before `defer` could be relied on.

**A stylesheet in `<body>` holds back only what comes after it.** The heading was painted at 24 ms, and the paragraph after the `<link>` waited for the stylesheet. Chrome stops the parser at a stylesheet in `<body>`, which is why DOMContentLoaded waited a second, so the content below it is never shown unstyled. This is what makes a `<link>` per component workable: each section waits for its own styles and nothing above it waits at all.

---

## 5. Taking stylesheets off the critical path

Only a stylesheet that applies right now holds the fence up, and the `media` attribute decides whether it applies:

```
stylesheet held 1 s                           FCP     load event   renderBlockingStatus
--------------------------------------------  ------  -----------  --------------------
media="print"                                 32 ms   1012 ms      non-blocking
media="(min-width: 2000px)" in an 800px tab   24 ms   1013 ms      non-blocking
```

Both files were still downloaded, since the `load` event waited for them, but neither held up the first paint. That makes `media="print"` the usual way to load a whole stylesheet without blocking: start it as print, and switch it to all screens once it has arrived.

```html
<link rel="stylesheet" href="/below-the-fold.css" media="print" onload="this.media='all'">
```

The other half of that pattern is putting the CSS that the first screen needs, the **critical CSS**, straight into a `<style>` block in `<head>`. Then the first paint depends on nothing but the HTML. The price is that inlined CSS can't be cached on its own, so every page pays for it again.

There's a switch for the opposite direction too. `blocking="render"` makes something render-blocking that wouldn't otherwise be. An `async` script with it held FCP to 1028 ms and reported `renderBlockingStatus: "blocking"`. It's for the rare script that has to run before anyone sees the page, such as one that picks the colour theme.

---

## 6. Web fonts, and what FCP doesn't see

Fonts aren't render-blocking in this sense. The fence comes down without them. But text set in a font that hasn't arrived yet is drawn **invisible** for a while, so the customer can be looking at a page with no words on it.

These are screenshots of Priya's page, with the font file held back for four seconds, taken at fixed times after the page was opened:

```
font-display   500 ms     1500 ms    2500 ms    3500 ms    4500 ms
-------------  ---------  ---------  ---------  ---------  ----------
(not set)      blank      blank      fallback   fallback   brand font
block          blank      blank      blank      fallback   brand font
swap           fallback   fallback   fallback   fallback   brand font
```

With `font-display` not set, Chrome 155 hid the text for about two seconds before giving up and drawing it in a fallback font. `block` hid it for about three. `swap` showed the fallback straight away and switched to the brand font when it arrived.

In every one of those runs, FCP was between 24 and 36 ms. Chrome counts the invisible text as painted. So a page can report a fast FCP while the person in front of it stares at a white screen for two seconds. Check the font case with your eyes or with screenshots, not with FCP alone.

For body text, `font-display: swap` is the setting that keeps words on the screen. Getting the font itself to arrive sooner is a job for `preload`, in [03-preload-scanner-and-resource-hints.md](03-preload-scanner-and-resource-hints.md) §2.
