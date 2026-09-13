# Text-level semantics: `b` vs `strong`, `i` vs `em`

Priya reads a bedtime story to her nephew. The page in front of her is flat black ink, but what comes out of her mouth isn't flat at all.

She leans on a word to change what the sentence means — *Priya* didn't take the last biscuit (someone else did) versus Priya didn't take the *last* biscuit (she took an earlier one). She drops her voice and speeds up for the small print at the bottom of the page. She does a silly voice for the wolf, and a careful one for the French words she isn't sure how to pronounce. And when the pan on the stove is hot, she stops doing voices altogether and says **don't touch that** in her own.

Four different things are happening to her voice, and HTML has a different element for each. The reason `<b>` and `<strong>` both come out bold on screen is a historical accident. They are not the same claim.

---

## 1. `em` is where you lean

> The `em` element represents stress emphasis of its contents.

**Stress emphasis** is the linguistics term for leaning on a word, and the giveaway is that moving it changes the meaning of the sentence:

```html
<p><em>Priya</em> didn't take the last biscuit.</p>  <!-- someone else did -->
<p>Priya didn't take the <em>last</em> biscuit.</p>  <!-- she took an earlier one -->
<p>Priya didn't <em>take</em> the last biscuit.</p>  <!-- it was given to her -->
```

Three different sentences, same words. That's `<em>`. If you can move your markup to another word and the sentence means something else, you have stress emphasis and `<em>` is right.

`<em>` nests, and nesting increases the stress. That's the only case where `<em><em>` isn't a mistake.

---

## 2. `i` is a different voice

> The `i` element represents text in an alternate voice or mood, or otherwise offset from the normal prose in a manner indicating a different quality of text.

Not louder — *different*. The spec's own examples are the useful list: a phrase from another language, a technical term being used as a term, a taxonomic name, a transliteration, a thought, a ship's name.

```html
<p>The whole thing was, as the French say, <i lang="fr">un peu bizarre</i>.</p>
<p>We spotted a <i>Turdus merula</i> in the garden.</p>
<p>She smiled. <i>Not this again</i>, she thought.</p>
```

Note `lang="fr"` on the first one. That's the part that actually does something: it tells a screen reader to switch pronunciation rules, so the phrase is read with a French accent instead of being mangled as English. `<i>` gets you the italics; `lang` gets you the different voice.

The distinction against `<em>`, in one line: **`<em>` changes what the sentence means, `<i>` changes what kind of text this is.** A ship's name isn't emphasised, it's just set apart from prose.

---

## 3. `strong` is importance, `b` is neither

> The `strong` element represents strong importance, seriousness, or urgency for its contents.

Three flavours, all "this bit matters more than what surrounds it": importance (the key clause in a paragraph), seriousness (a warning), urgency (read this first).

```html
<p><strong>Don't touch the pan.</strong> It's just come off the hob.</p>
<p>Refunds are available <strong>within 14 days</strong> of delivery.</p>
```

Unlike `<em>`, `<strong>` doesn't change the meaning of the sentence — it ranks part of it. Nesting works the same way: inner `<strong>`s are more important than outer ones.

And then `<b>`:

> The `b` element represents text which is stylistically offset from the normal prose without conveying any extra importance.

Read that twice, because it's doing something unusual: it defines an element by explicitly disclaiming meaning. `<b>` is for text that is *visually* set apart by convention, where nothing is more important and nobody's voice would change. Keywords in a document summary. Product names in a review. The lead sentence of an article. Priya reading aloud would not do anything different for a `<b>` — it only looks different on the page.

Both `<b>` and `<i>` come with the same warning attached, near enough word for word:

> The `b` element should be used as a last resort when no other element is more appropriate; in particular, headings should use the `h1` to `h6` elements, stress emphasis should use the `em` element, importance should use the `strong` element, and text marked or highlighted should use the `mark` element.

So they are not banned, and they are not "the old presentational elements" — HTML5 gave them real definitions. They're just the bottom of the list. If you're reaching for `<b>` to make a heading look like a heading, you wanted `<h3>`.

---

## 4. What the browser actually does with them

All four render the same two ways — `em`/`i` italic, `strong`/`b` bold — and that's a default stylesheet rule you can override in one line. The real difference shows up in the accessibility tree, the parallel tree the browser builds for screen readers.

Given this paragraph:

```html
<p><b>b</b> <i>i</i> <em>em</em> <strong>strong</strong> <mark>mark</mark></p>
```

Chrome builds this:

```
paragraph
  StaticText "b"
  StaticText " "
  StaticText "i"
  StaticText " "
  emphasis
    StaticText "em"
  StaticText " "
  strong
    StaticText "strong"
  StaticText " "
  mark
    StaticText "mark"
```

`<em>`, `<strong>` and `<mark>` survive as nodes with their own roles. `<b>` and `<i>` don't exist at all — their text is flattened into the paragraph, indistinguishable from the spaces around it. Whatever those two elements mean, they mean it only to people looking at the screen.

(The W3C mapping table still lists `em` and `strong` as `generic`; the dedicated `emphasis` and `strong` roles arrived in later ARIA revisions and Chrome now exposes them. That the tables and the browsers disagree about it is itself a fair measure of how much rides on this.)

---

## 5. What screen readers actually announce

Almost nothing, by default.

Having a role in the tree doesn't mean it gets spoken. The major screen readers do not, out of the box, change pitch or say "emphasis" when they hit an `<em>` — it's a setting most users leave off, because a document full of announced emphasis is exhausting to listen to. Some do it in their "reading" modes and not while navigating.

This is worth saying plainly in an interview, because the usual answer ("use `<strong>` so screen readers emphasise it") is mostly wrong. The honest version is: **use `<em>` and `<strong>` because they're true, they cost nothing, they're there for the users who do turn it on, and they survive when your CSS doesn't.** Never rely on emphasis alone to carry information — if a word being bold is the only thing marking a field as required, that information doesn't exist for a large number of your users.

---

## 6. The rest of the vocabulary

`<b>` and `<i>` are a last resort partly because the list of things that are *not* a last resort is long. Most of these render as nothing special and are worth knowing anyway:

| Element | Means | Note |
| --- | --- | --- |
| `<mark>` | relevant in the current context | search hits, the clause you're citing |
| `<small>` | "side comments such as small print" | disclaimers, copyright — short runs only |
| `<cite>` | the title of a work | the title, not the author |
| `<q>` / `<blockquote>` | inline / block quotation | `<q>` adds the quote marks itself |
| `<abbr title>` | an abbreviation, expanded in `title` | `title` is invisible on touch devices |
| `<dfn>` | the defining instance of a term | the one place the term is explained |
| `<code>`, `<kbd>`, `<samp>`, `<var>` | code, keys the user presses, program output, a variable | `<kbd>` for <kbd>Ctrl</kbd>+<kbd>C</kbd> |
| `<time datetime>` | a machine-readable date or time | `<time datetime="2026-09-12">Saturday</time>` |
| `<s>` / `<del>` / `<ins>` | no longer accurate / removed / added | `<del>`+`<ins>` are the edit pair |
| `<u>` | an unarticulated annotation | misspellings, Chinese proper names — rarely what you want |
| `<sub>`, `<sup>` | typographic only | H<sub>2</sub>O, not for styling |

`<s>` versus `<del>` is the pattern in miniature: a struck-through price is `<s>` (no longer accurate), but a struck-through line in a tracked edit is `<del>` (removed from the document). Same pixels, different claim.

---