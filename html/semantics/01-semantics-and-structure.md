# Semantics & Structure

Priya is moving flats. She packs thirty identical boxes, writes **STUFF** on every one, and stacks them by the door. Everything she owns is in there — nothing is missing, nothing is broken. But the movers have to open each box to know where it goes, her flatmate can't find the kettle, and the fragile ones get put at the bottom.

Second time around she writes **KITCHEN — GLASSES, FRAGILE** instead. The contents didn't change. The label did. And now everybody downstream can act without opening anything.

That's the whole of HTML semantics. `<div>` is a box marked STUFF. `<article>`, `<nav>`, `<strong>` are labels. The pixels can come out identical either way — the difference is what the people and programs handling your page can do without guessing.

---

## 1. What "semantic" actually means

A **semantic** element is one whose name tells you what the content *is*, not what it should look like. `<h1>` says "this is the top-level heading of the page". `<nav>` says "this is a set of navigation links". Neither says anything about font size or colour — you can restyle them to look like anything, and the meaning survives.

The opposite is a **presentational** element, named after its appearance. HTML used to be full of them: `<center>`, `<font>`, `<big>`. They're gone, because appearance belongs to CSS, and because a name like `<center>` tells a program nothing useful.

`<div>` and `<span>` are neither. They're the deliberately meaningless ones — the STUFF boxes — and they exist precisely so you have something to reach for when the content genuinely has no meaning beyond "these things need to sit in a row". That's a real need. The mistake isn't using `<div>`; it's using `<div>` for something that already has a name.

The practical test is a question: **if I stripped all the CSS, would this still make sense?** A page built from `<div class="header">` and `<div class="title">` collapses into an undifferentiated wall of text. A page built from `<header>` and `<h1>` still reads as a document.

---

## 2. Who reads the labels

Three different readers, wanting three different things.

**The browser** uses the label to pick default behaviour. `<button>` is focusable, fires on Enter *and* Space, and submits its form. `<a href>` is focusable, fires on Enter only, and navigates. A `<div onclick>` does none of that — you get to reimplement all of it, and you will forget some of it.

**Assistive technology** — screen readers, [voice control](../glossary.md#voice-control), [switch devices](../glossary.md#switch-device) — doesn't read your HTML at all. It reads a second tree the browser builds from your HTML, called the **accessibility tree**, where each node carries a *role* ("this is a button"), a *name* ("Submit"), and a *state* ("pressed"). Semantic elements get real roles for free. `<div>` gets the role `generic`, which is the accessibility tree's way of saying STUFF. See [04-semantics-for-a11y-and-seo.md](04-semantics-for-a11y-and-seo.md) §1.

**Machines that aren't browsers** — crawlers, reader modes, the thing that generates a link preview in Slack — read the markup and guess at structure.

---

## 3. The vocabulary, and where each piece is covered

The labels split into two families by size. Some wrap *regions* of a page — the chapters and sidebars. Some wrap *runs of text* inside a sentence — the emphasis and the jargon.

| Family | Elements | Answers | Note |
| --- | --- | --- | --- |
| Sectioning & structure | `main`, `article`, `section`, `aside`, `nav`, `header`, `footer`, `h1`–`h6` | "what part of the document is this?" | [02-sectioning-elements.md](02-sectioning-elements.md) |
| Text-level | `em`, `strong`, `i`, `b`, `mark`, `small`, `cite`, `abbr`, `code`, `time`, … | "what kind of phrase is this?" | [03-text-level-semantics.md](03-text-level-semantics.md) |
| Generic | `div`, `span` | nothing, on purpose | [02-sectioning-elements.md](02-sectioning-elements.md) §1 |

There is one more family this note doesn't cover — forms, tables, media, `<details>` — which are semantic too, and are where the browser gives you the most free behaviour. They have their own entries in [index.md](../index.md).

---

## 4. The three questions this leads to

Everything else in this cluster is one of these:

1. **Which box do I reach for?** `<section>` or `<div>`, `<article>` or `<section>`, and how they nest — [02-sectioning-elements.md](02-sectioning-elements.md).
2. **`<b>` or `<strong>`, `<i>` or `<em>`?** They look identical and are not the same thing — [03-text-level-semantics.md](03-text-level-semantics.md).
3. **Why does any of it matter?** Beyond "it's best practice" — [04-semantics-for-a11y-and-seo.md](04-semantics-for-a11y-and-seo.md).
