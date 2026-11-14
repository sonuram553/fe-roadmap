# ARIA and native HTML semantics

The writer who produces Priya's audio guide ([01-the-accessibility-tree.md](01-the-accessibility-tree.md)) works from what's in the building. But Priya can also leave notes for the writer. A card pinned to an exhibit can say "describe this as a lift", or "call this the East Gallery", or "this case is locked". The writer copies each card into the guide word for word, and never checks it against the thing it's pinned to.

ARIA is those cards. Attributes like `role`, `aria-label` and `aria-expanded` change what the accessibility tree says about an element. They never change the element itself. Pin a card saying "lift" to a broom cupboard door, and the guide will tell Arun there's a lift. He'll find the door, look for the button for the second floor, and nothing will be there.

---

## 1. A role changes the guide, not the exhibit

Here is a real `<button>`, a `<div>` with `role="button"`, and the same `<div>` with `tabindex="0"` added. Each has a click handler that counts clicks. Chrome 156:

```
                                   in the tree      Tab reaches  Enter clicks  Space clicks
<button>                           button "Save"    yes          yes           yes
<div role="button">                button "Save"    no           no            no
<div role="button" tabindex="0">   button "Save"    yes          no            no
```

All three are identical in the tree. Arun's screen reader announces each one as "Save, button", and that's all `role` did. A `<div>` can't take keyboard focus, so Tab skips it, and Arun has to find it with the screen reader's own cursor instead. `tabindex="0"` fixes the focus. It doesn't make the keys work. The browser gives Enter and Space their meaning on a `<button>` only, so on the `<div>` those keys do nothing at all.

The ARIA Authoring Practices Guide puts it plainly:

> Unlike HTML input elements, ARIA roles do not cause browsers to provide keyboard behaviors or styling.

To finish the `<div>`, you write the keyboard behaviour yourself, and the details matter. A native button clicks on Enter as soon as the key goes down, and on Space only when the key comes back up. Space also scrolls the page unless you stop it:

```js
save.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') save.click();
  if (e.key === ' ') e.preventDefault();
});
save.addEventListener('keyup', (e) => {
  if (e.key === ' ') save.click();
});
```

```
Enter       -> clicks 1
Space down  -> clicks 1  scrollY 0
Space up    -> clicks 2  scrollY 0
```

Without the `preventDefault()` line, that same Space press scrolls the page down by 560 pixels while it clicks.

And it's still not a button. It doesn't submit a form. It has no `disabled` attribute, so you'd have to block clicks and change the styling yourself. It doesn't take part in the default button behaviour from [forms/01](../forms/01-forms-and-submission.md) §6, or the `form*` overrides from [forms/03](../forms/03-button-types.md) §5. Every one of those is something the browser already does for `<button>`, and you'd be rebuilding it by hand.

That's the first rule in the W3C's *Using ARIA*:

> If you can use a native HTML element or attribute with the semantics and behavior you require already built in, instead of re-purposing an element and adding an ARIA role, state or property to make it accessible, then do so.

---

## 2. When ARIA and HTML disagree, ARIA wins

Every HTML element already has a role. ARIA doesn't add a role next to it. It replaces it.

```html
<h2 role="button" tabindex="0">Opening hours</h2>
```

```
button "Opening hours"
```

The heading is gone. It won't appear in the screen reader's list of headings, and Arun can't jump to it with the heading key. This is the usual way accordions get built wrong. The right structure is a real button inside a real heading, so the tree keeps both:

```html
<h2><button aria-expanded="false">Opening hours</button></h2>
```

```
heading "Opening hours" (level=2)
  button "Opening hours" (expanded=false)
```

A role also changes the name without changing the behaviour. A link styled as a button and given `role="button"` is announced as a button, so Arun presses Space, which is how you press a button:

```html
<a href="#tickets" role="button">Book tickets</a>
```

```
button "Book tickets"
Space -> clicks: 0  location.hash: ""
Enter -> clicks: 1  location.hash: "#tickets"
```

Space did nothing, because it's still a link underneath, and links only respond to Enter.

ARIA wins even when it's plainly wrong. An image with good alt text, given `role="presentation"`, vanishes from the tree completely:

```html
<h2>Getting around</h2>
<img src="map.png" alt="Gallery map" role="presentation">
<p>The café is on the ground floor.</p>
```

```
heading "Getting around" (level=2)
paragraph
  StaticText "The café is on the ground floor."
```

The browser does overrule ARIA in a few places, where obeying would break something worse. A focusable element can't be made presentational, because then focus would land on nothing. Neither can an element that has a global ARIA attribute such as `aria-label`. And a role the browser doesn't recognise is ignored, so the element keeps its native one:

```html
<button role="presentation">Save</button>
<h3 role="none" aria-label="X">Café</h3>
<button role="buton">Save</button>
```

```
button "Save"
heading "X" (level=3)
  StaticText "Café"
button "Save"
```

The second line shows a trap on the way out. The browser kept the heading, as the rule says it should, and then used `aria-label` as its name, so a heading that says "Café" on screen is announced as "X".

---

## 3. States are promises you keep by hand

ARIA states such as `aria-expanded`, `aria-checked`, `aria-disabled` and `aria-required` work the same way as roles. They change what the tree says, and nothing else.

Here are five controls on one page. Three are native. The "Filters" button has `aria-expanded="false"` and a click handler that shows its panel, and "Large print" is a `<div role="checkbox" aria-checked="false">`:

```html
<details><summary>Opening hours</summary><p>10:00 to 17:00</p></details>

<button popovertarget="visit-menu">Visit</button>
<div id="visit-menu" popover><a href="/tickets">Tickets</a></div>

<button aria-expanded="false" id="filters">Filters</button>
<div id="filters-panel" hidden>…</div>

<div role="checkbox" aria-checked="false" tabindex="0" id="large">Large print</div>
<label><input type="checkbox" id="audio"> Audio guide</label>
```

```
before:
DisclosureTriangle "Opening hours" (expanded=false)
button "Visit" (expanded=false)
button "Filters" (expanded=false)
checkbox "Large print" (checked=false)
checkbox "Audio guide" (checked=false)

after clicking all five:
DisclosureTriangle "Opening hours" (expanded=true)
button "Visit" (expanded=true)
button "Filters" (expanded=false)
checkbox "Large print" (checked=false)
checkbox "Audio guide" (checked=true)
```

The three native controls updated their own state. The two ARIA ones still say what the HTML said when the page loaded. The Filters panel is open on screen, and Arun is told it's collapsed. "Large print" may well be styled as ticked by now, and Arun is told it isn't. Every ARIA state has to be set again by your code at every point where the real state changes, and nothing will warn you when a code path forgets.

The same goes for the states that sound as if they enforce something. `aria-disabled="true"` doesn't disable, and `aria-required="true"` doesn't require:

```
button "Search" (disabled=true)
after click: clicks = 1 , form submitted = true
aria-required, empty, submit -> submitted = true
required, empty, submit      -> submitted = false
```

The tree reported the button as disabled, and clicking it still ran the click handler and submitted the form. That's sometimes exactly what you want: [forms/03](../forms/03-button-types.md) §7 uses `aria-disabled` on purpose, so the button stays focusable and can explain why it's unavailable. But then the click handler has to check the state itself.

---

## 4. What ARIA is for

ARIA is the right tool where HTML has no element or attribute for what you're building. That's a shorter list than it used to be.

**Widgets HTML doesn't have.** Tabs (`tablist`, `tab`, `tabpanel`), tree views, data grids you can move through cell by cell, toolbars. There's no `<tabs>` element, so the roles are the only way to tell Arun what the thing is. Each of these roles comes with a keyboard pattern you must build, and [03-keyboard-and-focus.md](03-keyboard-and-focus.md) covers how.

**State HTML can't express.** `aria-expanded` on a button that shows and hides something. `aria-pressed` on a toggle button. `aria-current="page"` on the link to the page you're on. `aria-busy` on a region that's loading.

**Relationships.** `aria-describedby` for hints and error messages ([forms/04](../forms/04-labelling-form-controls.md) §7), `aria-labelledby` to name something from text already on screen ([forms/04](../forms/04-labelling-form-controls.md) §5), and `aria-activedescendant` for a list whose highlighted item isn't where keyboard focus is.

**Announcing changes.** A live region, such as `role="status"`, is the only way to tell Arun about something that changed somewhere other than where his focus is. [03-keyboard-and-focus.md](03-keyboard-and-focus.md) §5 covers them.

**Patching a browser.** `<ul role="list">` for WebKit ([01-the-accessibility-tree.md](01-the-accessibility-tree.md) §5).

The list keeps getting shorter because HTML keeps absorbing it. Each of these replaced an ARIA recipe that people used to build by hand:

- `<dialog>` with `showModal()` replaced `role="dialog"`, `aria-modal`, a focus trap and an Escape handler ([04-modal-dialogs.md](04-modal-dialogs.md)).
- `popover` and `popovertarget` replaced keeping `aria-expanded` up to date by hand, as the "Visit" button in §3 shows.
- `<details>` replaced the disclosure widget.
- `inert` replaced putting `aria-hidden` and `tabindex="-1"` on everything behind an overlay.
- `<search>` replaced `role="search"`.
- A `<select>` you can style ([05-dropdowns.md](05-dropdowns.md) §3) can now stand in for most custom listboxes.

---

## 5. No ARIA is better than bad ARIA

The Authoring Practices Guide has a section with that title. It explains why ARIA can do so much damage:

> Functionally, ARIA roles, states, and properties are analogous to a CSS for assistive technologies.

Bad CSS breaks the page for everyone who can see it, and somebody notices. Bad ARIA breaks the page for the people using assistive technology, and nobody else sees anything wrong.

WebAIM tests the home pages of the top million websites every year. In the 2026 run, 82.7% of them used ARIA, and:

> Home pages with ARIA present had significantly more errors (59.1 on average) than pages without ARIA (42 on average).

WebAIM is careful to add that this "does not necessarily mean that ARIA introduced these errors". Pages with lots of ARIA tend to be complex pages. But it does mean ARIA isn't buying the accessibility people add it for.

Here's what bad ARIA sounds like in practice.

**`aria-hidden` on something that can take focus.** A carousel hides its off-screen slides from screen readers, but leaves the links inside them alone:

```html
<h2>Ming vase</h2>
<div class="carousel-slide" aria-hidden="true">
  <h3>Tang horse</h3><a href="/horse">View object</a>
</div>
<button>Next slide</button>
```

```
heading "Ming vase" (level=2)
button "Next slide"
after one Tab, document.activeElement: <a href="/horse">View object</a>
focused node in AX tree: RootWebArea ""
```

Tab took Arun to the hidden link. The tree has no entry for it, so as far as the screen reader can tell, focus is on the page as a whole. He presses Tab and hears nothing useful, or just the page title. The fix is `inert` on the hidden slides, which removes them from the tree and from the Tab order together ([01-the-accessibility-tree.md](01-the-accessibility-tree.md) §2).

**`role="menu"` on site navigation.** "Menu" sounds like the right word for a navigation bar. In ARIA it means an application menu, like the File menu in a desktop program:

```html
<nav aria-label="Main"><ul role="menu">
  <li role="none"><a role="menuitem" href="/visit">Visit</a></li>
  <li role="none"><a role="menuitem" href="/collection">Collection</a></li>
</ul></nav>
```

```
navigation "Main"
  menu (orientation="vertical")
    StaticText "• "
    menuitem "Visit"
    StaticText "• "
    menuitem "Collection"
```

The links aren't links any more, so they're missing from the screen reader's list of links on the page. The list bullets have come loose and are read out as text. And a `menu` promises arrow-key navigation, so many screen readers stop handling the arrow keys themselves when focus enters it ([03-keyboard-and-focus.md](03-keyboard-and-focus.md) §3). If the page doesn't handle arrows, Arun is stuck. The same links in a plain `<ul>` inside `<nav>` give him a navigation landmark, a list with a count, and links, with no ARIA at all. [05-dropdowns.md](05-dropdowns.md) §5 covers when `role="menu"` is right.

**`aria-label` on an element that can't be named.** ARIA forbids naming a plain `<div>`, `<span>` or `<p>`. Chrome passes the name along anyway:

```html
<div aria-label="Museum opening times">Mon–Fri</div>
<div role="region" aria-label="Opening times">Mon–Fri</div>
```

```
generic "Museum opening times"
  StaticText "Mon–Fri"
region "Opening times"
  StaticText "Mon–Fri"
```

Whether Arun hears that name depends on which screen reader he uses. Some read it, and some skip it. If the words matter, put them on screen, or give the element a role that's allowed a name, as the second line does.

**`aria-label` that disagrees with the screen.** A name that overrides the visible text can drift away from it, and then a [voice control](../glossary.md#voice-control) user can't say what they see. [forms/04](../forms/04-labelling-form-controls.md) §5 shows how this happens.
