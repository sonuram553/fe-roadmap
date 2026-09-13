# Sectioning elements: `article`, `section`, `aside` and friends

Priya's uncle still gets a printed newspaper. Look at how it's put together, because HTML's sectioning elements are the same furniture with angle brackets.

The **masthead** across the top — the paper's name, the date, the price. A **contents strip** on page one telling you sport is on page 14. The **news itself**, which is the reason the paper exists. Inside it, each **story** is a self-contained thing: Priya can cut one out with scissors, post it to her uncle, and it still makes sense on his kitchen table. Stories are grouped into **parts** — Sport, Business, Obituaries — each with its own banner across the top of the page. Beside a match report there's a **tinted box** with the player's career stats: related, but you can skip it and lose nothing. And at the very bottom, the **small print** — printer, copyright, complaints address.

That's `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`. Every one of them exists because a reader holding a newspaper can tell those parts apart at a glance, and a person who can't see the page needs the same information from somewhere.

---

## 1. `div` and `span`: the boxes with no label

`<div>` is a block-level container that means nothing. `<span>` is the inline version. They have no default styling beyond `display`, and nothing in the browser or in assistive technology treats them specially.

That's their job. When Priya's layout needs a wrapper purely so flexbox has something to work with, `<div>` is the correct and honest answer. The HTML spec says so directly about the alternative:

> The `section` element is not a generic container element. When an element is needed only for styling purposes or as a convenience for scripting, authors are encouraged to use the `div` element instead.

So the rule is not "avoid `<div>`". It's **use `<div>` when there is nothing truer to say**. Reaching for `<section>` because it sounds more professional is worse than a `<div>`, because it makes a claim about the document's structure that isn't backed by anything.

---

## 2. `article`: the scissors test

> The `article` element represents a complete, or self-contained, composition in a document, page, application, or site and that is, in principle, independently distributable or reusable, e.g. in syndication.

"Independently distributable" is the scissors. **Could you cut this out, hand it to someone with no other context, and would it still stand up?** If yes, it's an `<article>`.

Things that pass: a blog post, a news story, a product card in a listing, a forum post, a single user's review, a tweet in a timeline, a widget on a dashboard that would make sense on its own dashboard.

Things that fail: the "Related articles" strip (meaningless without the article it relates to), a page's introduction paragraph, the third step of a checkout flow.

Two things people get wrong. First, `<article>` is not only for prose — a comment on a blog post is an `<article>`, nested inside the `<article>` for the post itself, and that nesting is exactly how the spec intends you to express "these comments belong to this post". Second, a page can have many `<article>`s; a feed of ten posts is ten of them.

---

## 3. `section`: needs a heading, and needs a name

`<section>` is the Sport pages: a **thematic group** of content that belongs together under a banner, but that doesn't stand alone if you cut it out.

The test is a heading. **If you can't write a sensible heading for it, it isn't a `<section>`** — it's a `<div>`. And that heading should actually be in the markup, not implied:

```html
<!-- yes: thematic, and it has a real heading -->
<section>
  <h2>Sport</h2>
  <article><h3>City win at home</h3>…</article>
  <article><h3>Rain stops play</h3>…</article>
</section>

<!-- no: this is a layout wrapper wearing a costume -->
<section class="flex-row">
  <img src="hero.jpg" alt="">
</section>
```

There's a second, sharper reason to give it a heading, and this is the part interviewers are usually fishing for. **A `<section>` with no accessible name is invisible to assistive technology.** The mapping spec is explicit: `<section>` gets the role `region` *"if the section element has an accessible name"*, and otherwise gets `generic` — the same role as a `<div>`.

Here's Chrome's own accessibility tree for two sections, one named and one not:

```
region "Scores"
  heading "Scores" (level 2)
generic
  heading "Unnamed" (level 2)
```

The second one might as well be a `<div>`. To name it, either point at the heading you already have, or label it directly:

```html
<section aria-labelledby="scores-h">
  <h2 id="scores-h">Scores</h2>
  …
</section>
```

`aria-labelledby` is the better of the two, because the name comes from text that's on screen and gets translated along with everything else.

---

## 4. `article` vs `section`, and whether they nest

They answer different questions, which is why "which one?" so often has the answer "both".

- `<article>` — **can this stand alone?**
- `<section>` — **is this a themed part of something bigger?**

They nest in both directions, and both directions are normal:

```html
<!-- sections of articles: the Sport pages, full of stories -->
<section>
  <h2>Sport</h2>
  <article>…</article>
  <article>…</article>
</section>

<!-- sections inside an article: one long story, chaptered -->
<article>
  <h1>The rise and fall of the county game</h1>
  <section><h2>Beginnings</h2>…</section>
  <section><h2>The television money</h2>…</section>
  <section><h2>What's left</h2>…</section>
</article>
```

`<article>` inside `<article>` is legal too, and means "this inner thing belongs to the outer thing" — the comment-on-a-post case from §2.

---

## 5. `nav`, `main`, `aside`, `header`, `footer`

`<nav>` is for **major** navigation blocks — the primary menu, a table of contents, pagination, breadcrumbs. Not every group of links. The footer's twenty legal links don't need it; marking every link cluster as `<nav>` just gives a screen reader user six identical "navigation" entries to pick between. If you do have more than one, name them (`<nav aria-label="Breadcrumb">`).

`<main>` is the paper minus the masthead and the small print: the content unique to *this* page. **One per page**, and it must not be nested inside `<article>`, `<aside>`, `<header>`, `<footer>` or `<nav>`. It's also the target of the "skip to content" link, which is the single cheapest accessibility win on any site.

`<aside>` is the tinted stats box: tangentially related, skippable. A pull quote, a "you might also like" rail, a glossary sidebar. Not a layout sidebar that happens to contain the main navigation — that's `<nav>`. `<aside>` maps to the role `complementary` unconditionally.

`<header>` and `<footer>` are the ones with a catch. At the top level of the page they become the landmarks `banner` and `contentinfo`. Inside a sectioning element they don't — the spec gives them `banner`/`contentinfo` only *"if not a descendant of an `article`, `aside`, `main`, `nav` or `section` element"*. Chrome's tree shows the difference:

```html
<header><p>Site header</p></header>
<article>
  <header><p>Article header</p></header>
  <footer><p>Article footer</p></footer>
</article>
<footer><p>Site footer</p></footer>
```

```
banner
  paragraph "Site header"
article
  sectionheader
    paragraph "Article header"
  sectionfooter
    paragraph "Article footer"
contentinfo
  paragraph "Site footer"
```

This is the behaviour you want — you don't want twelve "banner" landmarks on a feed of twelve posts — but it catches people who assume `<header>` always means "the site header". The names `sectionheader` and `sectionfooter` are newer ARIA roles; older mapping tables and older browsers say `generic` here. Either way: not a landmark.

---

## 6. Headings, and the outline algorithm that never was

This is the question that separates people who read the spec from people who read a blog post about the spec in 2014.

For years the advice was: nest `<h1>`s inside sectioning elements, and the browser will work out the real level from the nesting depth. A `<h1>` inside two `<section>`s is really a level-3 heading. This was called the **document outline algorithm**, and it was genuinely in the HTML standard.

**No browser ever implemented it, and it has been removed.** Nesting `<h1>`s this way is now explicitly non-conforming. The only thing that ever shipped was a cosmetic hack in the browser's default stylesheet — an `<h1>` inside a `<section>` was *drawn* at `<h2>` size — and even that was removed in 2025, so the visual hint that something clever was happening is gone too.

What actually determines a heading's level is the number in the tag, and nothing else. The mapping spec puts it plainly: `h1`–`h6` get the role `heading` with `aria-level` set to *the number in the element's tag name*. Chrome, on `<section><h1>Inner h1</h1></section>`:

```
article
  heading "Outer h1" (level 1)
  generic
    heading "Inner h1" (level 1)
```

Two level-1 headings. Not an outline — a flat list with a duplicate.

So write heading levels by hand, the way you would in a Word document: one `<h1>` describing the page, `<h2>` for its major parts, `<h3>` beneath those, and **don't skip levels** on the way down. Screen reader users navigate by this list constantly — see [04-semantics-for-a11y-and-seo.md](04-semantics-for-a11y-and-seo.md) §2 — and a jump from `<h2>` to `<h4>` reads as "something is missing here".

Going back up is fine: `<h4>` followed by `<h2>` just means a new major part started.

---