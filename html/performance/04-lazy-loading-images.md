# Native lazy loading with `loading="lazy"`

Priya's shop is finished, and it's long: room after room of plants, with the last rooms far from the door. Customers don't have to wait for the plants. The shop opens straight away, and each shelf fills up when its delivery arrives. But if every room's plants were ordered at once, the vans for the front room would share the road with the vans for every other room. And most of those deliveries would be for rooms that most customers never reach.

So the builder holds back the deliveries for the far rooms. When a customer gets within a certain distance of one of those rooms, the van is sent for. The aim is for the plants to be on the shelves by the time the customer gets there, as long as they walk at a normal pace.

That's `loading="lazy"`. An `<img>` with it isn't fetched until it's within a certain distance of the screen, and the browser decides what that distance is. Two things follow from that. The browser has to know where the image is on the page before it can tell how far away it is (§2). And it's betting that you won't scroll faster than it can fetch (§3).

---

## 1. How far ahead

Here's a column of forty 300 px images with `loading="lazy"`, `width` and `height`, in an 800 × 600 window. The output shows which ones Chrome requested as the page loaded, then as it scrolled. The connection speed was set with Chrome's `--force-effective-connection-type` flag, and `navigator.connection.effectiveType` reported it back:

```
== column of 40 lazy 300px images, viewport 600px tall, effective connection 4G (navigator says 4g)
  on load: 7 requested (p1..p7) -> last one starts at 1800px, i.e. 1200px below the fold
  scrolled to 1000: newly requested p8 p9 p10
  scrolled to 2000: newly requested p11 p12 p13
== column of 40 lazy 300px images, viewport 600px tall, effective connection 3G (navigator says 3g)
  on load: 11 requested (p1..p11) -> last one starts at 3000px, i.e. 2400px below the fold
  scrolled to 1000: newly requested p12 p13 p14
  scrolled to 2000: newly requested p15 p16 p17
```

On a 4G connection Chrome fetched images up to somewhere between 1,200 and 1,500 px below the bottom of the window: `p7` started 1,200 px below and was fetched, `p8` started 1,500 px below and wasn't. On 3G the distance doubled, with `p11` at 2,400 px fetched and `p12` at 2,700 px not. That fits Chrome's published distances of 1,250 px and 2,500 px. A slower connection needs a longer run-up, so the van is sent for earlier.

You can't change that distance from HTML. There's no attribute for it, and other browsers choose their own numbers. If you need a particular margin, say three screens ahead, that's a job for `IntersectionObserver` with a `rootMargin`, in JavaScript.

---

## 2. It has to be placed before it can be fetched

The browser can't tell how far an image is from the screen until the page has been laid out. That has two consequences.

**The preload scanner can't fetch it.** A lazy image waits for layout, and layout waits for the CSS ([03-preload-scanner-and-resource-hints.md](03-preload-scanner-and-resource-hints.md) §1 and [01-render-blocking-and-first-paint.md](01-render-blocking-and-first-paint.md) §2). So a lazy image at the top of the page starts later than an eager one would, even though it's on screen the whole time.

Here's Priya's hero image, the largest thing on the first screen, behind a stylesheet held back for 300 ms, with the image itself taking 400 ms:

```
== hero image loading="eager": requested 8ms, arrived 454ms, load event 454ms, LCP entries: 340ms H1 then 472ms img
== hero image loading="lazy": requested 320ms, arrived 758ms, load event 320ms, LCP entries: 328ms H1 then 764ms img
```

**Largest Contentful Paint** (LCP) records when the biggest thing on the first screen was painted: the heading first here, then the image once it arrived. Making the hero lazy cost about 300 ms of LCP, which is the time the request sat waiting for the stylesheet and layout. So **never put `loading="lazy"` on an image that's visible when the page opens.** That image wants the opposite, `fetchpriority="high"` ([03 §4](03-preload-scanner-and-resource-hints.md)). This is the most common misuse of the attribute, usually from a component or CMS that adds it to every image.

**It needs a size before it loads.** An image with no `width` and `height` is zero pixels tall until it arrives. Here's a grid of thirty products, three to a row, where each card gets its height from the photo:

```
== grid of 30 lazy images, no width/height: 30 requested on load
== grid of 30 lazy images, width/height set: 18 requested on load
```

Without dimensions, the grid collapsed to a short stack of captions near the top, so every image counted as close to the screen and every image was fetched. Lazy loading did nothing. With `width` and `height`, the browser knew each card's size before any image arrived, and fetched only the first six rows. The same two attributes also stop the page jumping about as images arrive. For a responsive image, set both anyway and add `height: auto` in CSS. The browser uses the pair for the image's shape.

---

## 3. Faster than the van

The distance in §1 is a bet that you won't outrun it. Anything that moves the view further than that in one go wins the bet: a "jump to reviews" link, the End key, a hard flick on a phone.

```
== jump to #reviews at 524ms: review image requested at 525ms, loaded at 935ms
```

The image was 6,000 px down, so nothing had been fetched for it. The request went out a millisecond after the jump, and for the 400 ms the image took to arrive, the customer was looking at an empty box. That box is why lazy images want a placeholder, even if it's only a background colour on the `<img>`, so the gap looks intentional rather than broken.

---

## 4. What else changes

**The `load` event doesn't wait for lazy images.** Normally `load` fires once every image on the page has arrived. You can see the difference in §2. With the eager hero image, `load` fired at 454 ms, when the image arrived. With the lazy one, `load` fired at 320 ms, and the image didn't arrive until 758 ms.

That happens even when the lazy image is on screen. Here's a page with nothing on it but two lazy images, each held back for a second, one at the top and one 6,000 px further down:

```
    10ms  load event
    28ms  on-screen image requested
  1037ms  on-screen image arrived
          far-below image never requested
```

`load` fired at 10 ms. The on-screen image wasn't requested until 28 ms, after `load` had already fired. `load` only waits for files that are already downloading, and a lazy image doesn't start downloading until the browser has checked where it is on the page (§2).

So anything that treats `load` as "the page is finished" will see lazy images missing. A common example is an end-to-end test that takes a screenshot on `load`. Another is a monitoring script that measures how long the page took to load.

**Hidden images aren't fetched.** An image with `display: none` has no position on the page, so a lazy one isn't fetched until it's shown. An eager one is fetched anyway:

```
== hidden images: requested hidden-eager, invisible-lazy
   after showing the display:none lazy one: hidden-eager, invisible-lazy, hidden-lazy
```

`visibility: hidden` is different. The element still takes up space, so `invisible-lazy` was fetched as normal. For images inside a closed tab panel or accordion that uses `display: none`, `loading="lazy"` means "fetch when opened", which is usually what you want.

**Carousels work, with a shorter run-up.** Lazy images inside a horizontal scroller are fetched as the scroller moves, not all at once. In an 800 px-wide carousel of 50 px slides:

```
== carousel of 50px-wide lazy slides in an 800px scroller: on load, slides starting at 0..1400px
   after scrolling the carousel to 1600px: new slides 1450..3000px
```

Chrome fetched slides starting up to about 600 px past the scroller's right-hand edge, roughly half the 1,250 px it uses down the page.

---

## 5. Where it works, and where it doesn't

The `loading` attribute works on `<img>` and `<iframe>`, and nothing else.

On an iframe it often saves more than on an image. An iframe loads a whole page, not one file, and an embedded map or video player can bring a megabyte of JavaScript with it.

Here's a test page with three things 6,000 px down, far past the distance Chrome looks ahead (§1):

- an iframe with `loading="lazy"`, showing `map.html`
- an ordinary iframe right next to it, showing `eager-map.html`
- a `.promo` banner with a CSS background image, `promo-bg.png`

The test server's log of what was requested while the page loaded:

```
  16ms /page.html
  32ms /img/promo-bg.png
  35ms /eager-map.html
```

**The lazy iframe works like a lazy image.** `map.html` isn't in the log. It was too far down the page, so Chrome waited for the reader to scroll closer. The ordinary iframe next to it was requested at 35 ms, even though nobody could see it.

**CSS background images have no lazy option.** `promo-bg.png` was requested at 32 ms, even though the banner was just as far down as the lazy iframe. The browser fetches a background image as soon as an element on the page uses it, wherever that element is. To lazy-load one, you need JavaScript. The usual way is an `IntersectionObserver` that adds the class with the background image when the element comes near the screen.
