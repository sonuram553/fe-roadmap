# The accessibility tree, and how it differs from the DOM

Priya is the curator of a small city museum, and Arun visits it most Saturdays. Arun is blind. The museum reaches him through its audio guide: a handset that describes whatever he asks about, and lets him skip to the next room or the next painting.

Nobody at the museum writes that guide by hand. Every morning a writer walks through the building and makes one entry for each thing worth describing. An entry says what the thing is, what it's called, and anything about its state a visitor would need to know, such as "this case is open" or "this room is closed today". Pillars, skirting boards and the backs of display cases get no entry, because there's nothing to say about them.

That is how the DOM and the accessibility tree relate. The DOM is the museum: every element on the page, including all the wrappers that exist only for layout. The accessibility tree is the guide: a second tree the browser writes from the DOM, holding only what a person might need to hear about. Arun's screen reader reads the guide. It never walks the museum.

[semantics/04](../semantics/04-semantics-for-a11y-and-seo.md) §1 introduced the tree and the three things in every entry: a role, a name, and state. This note is about the places where the guide and the museum don't match.

---

## 1. Thirteen elements, eight entries

Here is an ordinary card component, the kind a CSS framework produces:

```html
<div class="card">
  <div class="card-media">
    <img src="vase.jpg" alt="Blue and white porcelain vase">
  </div>
  <div class="card-body">
    <div class="card-header">
      <h3 class="card-title">Ming vase</h3>
      <span class="badge">New</span>
    </div>
    <p class="card-text">Porcelain, about 1430.</p>
    <div class="card-actions">
      <button class="btn">
        <svg aria-hidden="true" width="16" height="16"><path d="M0 0h16v16z"/></svg>
        <span>Save</span>
      </button>
    </div>
  </div>
</div>
```

That's 13 elements. Chrome's accessibility tree for it has 8 entries:

```
generic
  image "Blue and white porcelain vase"
heading "Ming vase" (level=3)
StaticText "New"
paragraph
  StaticText "Porcelain, about 1430."
generic
  button "Save"
```

Five wrapper `<div>`s went in, and two came out as `generic`. Chrome dropped the other three. Which wrappers survive is Chrome's own choice, and it makes no difference to Arun, because screen readers say nothing for a `generic` entry.

The `<span>` inside the button is gone too. Its text didn't disappear, though. It became the button's name, "Save". The `<svg>` icon is gone completely, because `aria-hidden="true"` told the browser to leave it out.

`aria-hidden` is an ARIA attribute. ARIA is short for Accessible Rich Internet Applications. It's a W3C specification, written when sites began building widgets in JavaScript that HTML had no elements for, such as tabs and sliders. Its attributes, `role` and everything starting with `aria-`, change what the tree says about an element. [02-aria-and-native-semantics.md](02-aria-and-native-semantics.md) covers them.

The badge is the one to look at. On screen, "New" sits in a coloured pill and nobody misreads it. In the guide it's a bare word after the heading, so Arun hears "Ming vase, heading level 3", then "New", with nothing to say the two belong together or what "New" means. The pill was drawn by CSS, and CSS gave the browser nothing to write in the guide.

---

## 2. On screen but not in the tree, and the reverse

The two trees disagree most about what's hidden. Here is a `<button>` hidden twelve different ways, and what Chrome 156 does with each:

```
                              on screen  in tree  Tab reaches
display: none                 no         no       no
visibility: hidden            no         no       no
hidden attribute              no         no       no
hidden="until-found"          no         no       no
content-visibility: hidden    no         no       no
closed <details>              no         no       no
inert                         yes        no       no
aria-hidden="true"            yes        no       yes
visually-hidden clip          no         yes      yes
opacity: 0                    no         yes      yes
off-screen left:-9999px       no         yes      yes
height:0;overflow:hidden      no         yes      yes
```

"Tab reaches" means pressing Tab from the element before it lands on the button. The "visually-hidden clip" row is the usual helper class: a 1-pixel box with `clip-path: inset(50%)` and `overflow: hidden`.

The first six rows agree with themselves: the button is gone for everybody. The other six are where the guide and the museum disagree.

**`inert`** is on screen but out of the tree and out of the Tab order. It's for content that should be seen but not used, like the page behind an open drawer. [04-modal-dialogs.md](04-modal-dialogs.md) §5 uses it.

**`aria-hidden="true"`** is out of the tree but still reachable by Tab. That combination is a trap. Focus can land on something the guide has no entry for, and [02-aria-and-native-semantics.md](02-aria-and-native-semantics.md) §5 shows what Arun hears when it does.

**The visually-hidden class** is the deliberate reverse: nothing on screen, but a full entry in the tree. It's how you give Arun words that sighted visitors don't need, like the hidden label on an icon-only search box in [forms/04](../forms/04-labelling-form-controls.md) §3.

**The last three rows are accidents.** `opacity: 0`, positioning off-screen, and collapsing a box to zero height all hide content from sight and leave it in the tree and in the Tab order. The common case is an accordion that closes by animating its height to 0. Its links are still there. A keyboard user tabs into a panel they can't see, and Arun hears links read out from a section that looks closed. Once a closing animation finishes, set `hidden` on the panel, or make it `inert`.

`hidden="until-found"` is worth knowing about. The content is out of the tree and the Tab order like plain `hidden`, but the browser's find-in-page can still find it, and opens it when it does.

---

## 3. In the tree but not in the DOM

The guide also has entries the museum doesn't. Text that CSS adds with `content` goes into the tree as if it were in the HTML:

```html
<style>
  .fav::before { content: "★ "; }
  .fav2::before { content: "★ " / ""; }
  .new::after { content: " (new)"; }
  .ext::after { content: "↗" / " (opens in a new tab)"; }
</style>
<button class="fav">Save</button>
<button class="fav2">Save</button>
<a href="/x" class="new">Ming vase</a>
<a href="/y" class="ext">Catalogue</a>
```

```
generic
  button "★ Save"
  button "Save"
  link "Ming vase (new)"
  StaticText " "
  link "Catalogue (opens in a new tab)"
```

The first button's name is "★ Save", so a screen reader reads the star out before "Save". The star was decoration, but CSS put it in the name. Icon fonts are worse. Their glyphs are characters with no meaning of their own, so a screen reader either skips them or reads out something meaningless.

The part after the `/` is alternative text for generated content:

```css
content: <what the screen shows> / <what goes in the accessibility tree>;
```

`"★ " / ""` means "draw a star, put nothing in the tree", which is what the second button got. The fourth line goes the other way. The screen shows a small arrow, and the tree gets the words the arrow stands for.

List markers are generated content too, and they're in the tree:

```
list
  listitem (level=1)
    ListMarker "1. "
    StaticText "Ticket desk"
  listitem (level=1)
    ListMarker "2. "
    StaticText "Cloakroom"
```

So are the insides of native controls. An `<input type="date">` is one element in the DOM. In the tree it's three spin buttons for day, month and year, plus a button that opens the calendar. They come from the control's own shadow DOM, which the browser builds and your page never sees.

---

## 4. Order and parents

The guide lists things in DOM order, not in the order they appear on screen. This flex container puts "Delete" on the left:

```html
<div style="display:flex; flex-direction:row-reverse; justify-content:flex-end">
  <button>Cancel</button>
  <button>Delete</button>
</div>
```

```
on screen, left to right:  Delete, Cancel
accessibility tree:        button "Cancel", button "Delete"
Tab order:                 Cancel, Delete
```

Grid placement and the `order` property do the same thing. A sighted keyboard user sees focus jump from right to left, and Arun hears the buttons in a different order from the one a sighted colleague would describe. Chrome now has a fix in CSS. Adding `reading-flow: flex-visual` to that container gives:

```
-- with reading-flow: flex-visual
accessibility tree:        button "Delete", button "Cancel"
Tab order:                 Delete, Cancel
```

Without it, the fix is to put the DOM in the order people read it, and use CSS only to adjust the layout.

`aria-owns` changes parents. It tells the browser "treat this other element as my child", wherever that element is in the DOM. Its main use is a panel that a framework renders through a portal, at the end of `<body>`, far from the button that opened it:

```html
<div class="toolbar" aria-owns="filters-panel">
  <button aria-expanded="true">Filters</button>
</div>
<main><h1>Results</h1></main>

<div id="filters-panel" role="group" aria-label="Filter options">
  <label><input type="checkbox"> On display now</label>
</div>
```

```
generic (owns="filters-panel")
  button "Filters" (expanded=true)
  group "Filter options"
    checkbox "On display now" (checked=false)
main
  heading "Results" (level=1)
```

In the DOM, the panel comes after `<main>`. In the tree, it sits right after the button that opened it. Put `aria-owns` on the button itself, though, and the panel becomes part of the button:

```
generic
  button "Filters Filter options" (expanded=true, owns="filters-panel")
    group "Filter options"
      checkbox "On display now" (checked=false)
```

A button gets its name from the text inside it, and the panel is now inside it, so its name has grown.

---

## 5. Where the browser makes a judgement call

Sometimes the browser has to guess what an element is for. Tables are the clearest case. Here are two:

```html
<table><tr><th>Day</th><th>Opens</th></tr><tr><td>Mon</td><td>10:00</td></tr></table>
<table><tr><td>Logo</td><td>Nav</td></tr></table>
```

```
table
  row
    columnheader "Day"
    columnheader "Opens"
  row
    cell "Mon"
    cell "10:00"
LayoutTable
  LayoutTableRow
    LayoutTableCell "Logo"
    LayoutTableCell "Nav"
```

Both are `<table>` in the DOM. Chrome decided the second one, with no headers, was being used for page layout. Screen readers don't announce a layout table as a table, so Arun isn't told "table with 1 row and 2 columns" every time he passes an old-style page layout. Give a real data table `<th>` cells and a `<caption>`, and Chrome won't mistake it.

CSS can change roles less than it used to. Older articles warn that `display: contents` removes a button's role, and that a table set to `display: grid` stops being a table. Chrome 156 keeps both:

```
<button style="display:contents">   ->  button "Save"
<table style="display:grid">        ->  table, row, columnheader, cell
```

Other browsers make other calls. WebKit has long treated a `<ul>` with `list-style: none` as not really a list, and a WebKit bug filed in December 2025 reports that VoiceOver on iOS still reads one as plain text. That's why you'll sometimes see `<ul role="list">`, which looks redundant but isn't.

---

## 6. How the tree reaches Arun, and how you can read it

The browser doesn't hand the tree to the screen reader as it is. It translates each entry into the operating system's accessibility API: UI Automation and IAccessible2 on Windows, NSAccessibility on macOS, AT-SPI on Linux, and the platform's own API on Android and iOS. The screen reader is a separate program that reads from that API. That's why the same page can sound different in NVDA on Windows and VoiceOver on a Mac. The browser and the screen reader both change.

The tree also changes while the page is open. When the DOM changes, the browser updates the tree and tells the operating system what happened: focus moved, a button's `expanded` state changed, some text appeared. That notification is the only way a screen reader learns that something changed. If your change doesn't reach the tree, such as a style change that makes a card look selected, the screen reader never finds out.

Building the tree takes time and memory, and most people never use anything that reads it, so Chrome only builds it when something asks for it. That might be a screen reader, a voice control program, or DevTools.

There's no web API to read the tree. JavaScript can see the DOM and nothing else. To look at it yourself:

- **DevTools.** The Elements panel has an Accessibility pane showing the selected element's role, name and where the name came from. A "full-page accessibility tree" toggle replaces the DOM view with the tree.
- **Tests.** WebDriver has *Get Computed Role* and *Get Computed Label* for a single element. Playwright's `toMatchAriaSnapshot()` compares a whole region of the tree against a saved text snapshot, so a change that silently renames a button fails the test.