# Why semantic HTML matters, beyond "best practice"

Arun does his shopping at the big supermarket on the ring road. He's blind, and the way he shops is the way anyone shops: he doesn't read the whole store. He walks to the sign that says **DAIRY**, then finds the shelf, then finds the yoghurt. Signs, shelves, product. Three jumps.

Take the signs down and nothing has been removed from the shop. Every item is still there, in the same place, at the same price. But now the only way to find yoghurt is to walk every aisle from one end to the other, and that store is no longer usable by anybody who isn't already willing to spend an hour in it.

A page built entirely from `<div>`s is that shop. The content is all there. The signs aren't.

This is the honest answer to "why does semantic HTML matter beyond best practice", and it's worth noticing that the answer is *accessibility* — not SEO. §3 gets to why the SEO half of the usual answer doesn't hold up.

---

## 1. The accessibility tree

A screen reader never touches your HTML, and it doesn't read the DOM either. The browser builds a **second tree** from the DOM, called the accessibility tree, and exposes it to assistive technology through the operating system's accessibility API. That tree is what gets spoken.

Each node in it carries, roughly:

- a **role** — what kind of thing this is (`button`, `heading`, `navigation`)
- an **accessible name** — what it's called ("Submit", "Sport")
- **state and properties** — `checked`, `expanded`, `level`, `disabled`

It's derived from the DOM but it isn't the same shape. Nodes that carry no meaning get dropped or flattened. Nodes that are hidden (`display: none`, `aria-hidden`) disappear entirely. A single `<input type="date">` explodes into several nodes from the shadow DOM. And the *name* is computed from a chain of sources — `aria-labelledby`, then `aria-label`, then a `<label>`, then the element's own text — which is why two visually identical buttons can be "Delete invoice" and "button" to Arun.

Here's the same page written twice. First as `<div>`s:

```html
<div class="header"><div class="title">Daily Post</div></div>
<div class="nav"><a href="/a">Home</a></div>
<div class="main">
  <div class="post"><div class="post-title">Cricket</div><p>Body text.</p></div>
</div>
```

```
generic
  StaticText "Daily Post"
generic
  link "Home"
generic
  StaticText "Cricket"
paragraph
  StaticText "Body text."
```

Four `generic` wrappers and some loose text. "Daily Post" and "Cricket" are not headings — they're sentences that happen to be short. There is no navigation, no main content, no article, and nothing to jump to.

Now the same content, same appearance available from CSS, different tags:

```html
<header><h1>Daily Post</h1></header>
<nav><a href="/a">Home</a></nav>
<main>
  <article><h2>Cricket</h2><p>Body text.</p></article>
</main>
```

```
banner
  heading "Daily Post" (level 1)
navigation
  link "Home"
main
  article
    heading "Cricket" (level 2)
    paragraph
      StaticText "Body text."
```

Same words, same pixels. The second one has signs.

---

## 2. What the signs are actually used for

The reason roles matter is that screen readers are **navigation tools**, not readers. Nobody listens to a page top to bottom any more than a sighted reader reads every word before deciding the page is useless.

Arun's jumps, and what each one needs from your markup:

- **Landmarks.** `banner`, `navigation`, `main`, `complementary`, `contentinfo`, `search`, `form`, `region`. One keystroke moves between them; a "skip to main content" link is the same idea for keyboard users. This is the aisle sign, and it comes from `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` — see [02-sectioning-elements.md](02-sectioning-elements.md) §5 for the ones with conditions attached.
- **The headings list.** Every screen reader can pull up all the headings on a page as a list, or jump to the next `<h2>`. This is the single most-used navigation feature, and it's the one that breaks when you fake headings with `<div class="title">` or skip from `<h2>` to `<h4>`.
- **Elements of a type.** Next link, next form field, next table, next button. `<div onclick>` is not in the list of buttons.
- **Reading the current thing.** Only after the first three.

The first three are all structure. That's why "it looks the same, so what's the harm" misses: the harm isn't in how it reads, it's that *there's nothing to navigate by*, so everything becomes the fourth mode.

The same structure quietly serves other people too. [Voice control](../glossary.md#voice-control) users say "click Submit" — which works because the button has an accessible name. Keyboard users get focus order and Enter/Space handling from real `<button>`s and `<a href>`s. Someone with a cognitive disability using a reading tool gets a usable outline.

---

## 3. The SEO half of the answer is mostly a myth

The received wisdom is that semantic HTML helps your search ranking. It would be nice. Google's own documentation doesn't support it.

On heading structure — the thing semantic markup is supposed to help most:

> Having your headings in semantic order is fantastic for screen readers, but from Google Search perspective, it doesn't matter if you're using them out of order.

And on the broader idea that the crawler reads meaning out of your tags:

> the web in general is not valid HTML, so Google Search can rarely depend on semantic meanings hidden in the HTML specification.

Which makes sense from their side: a crawler that trusted `<article>` to mean "article" would be trivially gamed and would break on the majority of the web that doesn't use it correctly anyway.

So what *does* actually depend on your markup, where search is concerned:

- `<title>` and `<meta name="description">` — these are used, and they become the search result you're asking someone to click.
- Structured data (JSON-LD / schema.org) — this is the real "tell the machine what this is" mechanism, and it's a separate vocabulary from HTML semantics. Rich results come from here, not from `<article>`.
- Real `<a href>` links — a crawler follows those. A `<div onclick>` that routes client-side is a dead end.
- Text being in the HTML at all, and `alt` on images.

The defensible version of the claim, for an interview: **semantic HTML doesn't rank you higher, but it correlates with the things that do** — clear headings, real links, content that isn't buried in script. Say that, then say the real reason is §1.
