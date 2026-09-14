# What a `<form>` actually is

Priya needs a new passport. At the office she's given a paper form, fills it in at a side desk, and takes it to the counter. The clerk turns it round, glances over it, pulls the pages she actually needs out of the pile, staples them together, seals them in an envelope, writes the department's address on the front, and drops it in the tray behind him.

Almost everything in that sentence is done by the counter, not by Priya. She supplies the answers. The counter decides *which* answers travel, how they're packed, and where they go.

`<form>` is the counter. It is not a layout wrapper, and it is not just the box the inputs sit in — it's a piece of machinery the browser gives you for free, and most of the questions in this group are about one part of that machinery. Wrap your inputs in a `<div>` instead and every bit of it is yours to rebuild.

---

## 1. What you get for the price of one tag

Put a real `<form>` around your controls and you inherit, without writing any JavaScript:

- **Submission.** Gathering values, encoding them, and either navigating or firing a `submit` event you can intercept.
- **The Enter key.** Typing in a field and pressing Enter submits — §6. Users expect this and notice its absence immediately.
- **The right mobile keyboard.** Combined with `type` and `autocomplete`, the phone's on-screen keyboard grows a **Go** or **Next** key instead of a newline key.
- **Autofill and password managers.** These look for a `<form>` with recognisable fields. A `<div>` full of inputs is where "why won't 1Password offer to save this?" comes from.
- **Native validation.** `required`, `pattern`, `min` — [02-native-validation.md](02-native-validation.md).
- **Reset.** Restoring every control to its starting state — [03-button-types.md](03-button-types.md) §3.

This holds in a single-page app too. You still want `<form onsubmit={...}>` rather than a click handler on a button, because the list above is the difference between a form that behaves like a form and one that merely looks like it.

---

## 2. Which answers go in the envelope

Not every control gets submitted. The spec calls the ones that do **successful controls**, and the rules catch people out often enough to be worth seeing rather than reciting. Here's a form with one of each awkward case:

```html
<form id="signup" action="submitted.html" method="get">
  <input name="email" value="priya@example.com">
  <input value="no name attribute">
  <input name="cancelled" value="x" disabled>
  <input name="reference" value="AB-9921" readonly>
  <input type="checkbox" name="newsletter">
  <input type="checkbox" name="terms" checked>
  <select name="plan">
    <option>free</option>
    <option selected>pro</option>
  </select>
  <button type="submit" name="action" value="save">Save</button>
  <button type="submit" name="action" value="publish" id="publish">Publish</button>
  <button type="button" name="toggle" value="nope">Show more</button>
</form>
<input name="coupon" value="LAUNCH10" form="signup">
```

Clicking **Publish** in Chrome produces:

```
email=priya@example.com
reference=AB-9921
terms=on
plan=pro
action=publish
coupon=LAUNCH10
```

Six pairs out of eleven controls. Reading off what happened:

**No `name`, no submission.** The second input has a value and is perfectly visible, and it simply isn't there. `name` is what makes a control a participant; `id` has nothing to do with it.

**`disabled` is excluded, `readonly` is included.** This is the pair people mix up. Both refuse to be typed in, but `disabled` means "this control is not part of this form right now" — it's skipped by the tab order, barred from validation, and left out of the envelope. `readonly` means "you may look and copy but not change", and the value still travels. If you grey out a field and then wonder why the server sees nothing for it, this is why.

**An unchecked checkbox sends nothing at all.** Not `false`, not an empty string — `newsletter` is absent while `terms=on` is present. So on the server, a checkbox is tested by presence, not by value. And `on` is the default value a checkbox sends when you don't give it a `value` attribute, which is rarely what you want; set `value="yes"` or similar if the server cares.

**Only the button you pressed is counted.** Both submit buttons are called `action`, but the envelope contains `action=publish` and not a word about `save`. That's the mechanism behind "Save draft" and "Publish" posting to the same endpoint — [03-button-types.md](03-button-types.md) §4. The `type="button"` button has a `name` and a `value` and is still ignored, because it isn't a submit button.

**`coupon` is in there, and it's outside the `<form>` tag entirely.** That's §3.

---

## 3. Form owner, and escaping the wrapper

A control's **form owner** is normally the nearest ancestor `<form>`. But the `form="signup"` attribute lets you point a control at a form by `id` from anywhere in the document, which is how `coupon` above got submitted while sitting outside the form element.

This is the escape hatch for the case where your markup can't nest the way submission wants it to — a field inside a sticky sidebar, a submit button in a modal footer that is a different subtree, or a table where the row layout won't let a `<form>` sit between `<tr>` and `<td>`. Reach for it rather than reimplementing submission by hand.

The rule that makes the attribute necessary at all is the one it's easy to forget: **forms cannot be nested.** Write a `<form>` inside a `<form>` and the parser throws the inner one away — you don't get two forms, you get one, with the inner form's controls silently belonging to the outer. If you think you need nested forms, you need one form and `formaction` on the buttons ([03-button-types.md](03-button-types.md) §5), or two sibling forms joined by the `form` attribute.

---

## 4. Where the envelope goes, and how it's packed

Three attributes decide this.

`action` is the URL. Omit it and the form posts to the current page, which is a sensible default, not a bug.

`method` has two values that actually send something, `get` and `post` — there's a third, `dialog`, which sends nothing at all, and it gets §5 to itself. `get` puts the pairs in the query string — that's the output in §2, and it's right for anything that only reads, because the result is a URL you can bookmark, share and go Back to. `post` puts them in the request body, and is right for anything that changes something, because a `get` that mutates state will eventually be re-run by a Back button or a crawler.

`enctype` only matters for `post` and has three values in practice. `application/x-www-form-urlencoded` is the default, the same `a=1&b=2` shape as the query string. `multipart/form-data` is the one you must set to upload files — an `<input type="file">` in a urlencoded form sends the filename and not the file, which is a genuinely confusing half-hour if you haven't hit it before. `text/plain` exists and is for debugging.

---

## 5. `method="dialog"`: the form that never leaves the room

Not everything Priya fills in at the counter goes to the back office. Some of it is a slip the clerk hands her to settle a question he's asking right now — *are you sure you want to cancel the old passport?* She ticks a box, hands it straight back, and it goes in the bin. Nothing is posted anywhere. The only thing that survives is his knowing what she answered.

That's the third value of `method`. A form inside a `<dialog>`, submitted with `method="dialog"`, **closes the dialog and sends nothing**:

```html
<dialog id="confirm">
  <form method="dialog">
    <p>Delete this invoice?</p>
    <button value="cancel">Cancel</button>
    <button value="delete">Delete</button>
  </form>
</dialog>
```

```js
confirm.showModal();
confirm.addEventListener('close', () => {
  if (confirm.returnValue === 'delete') actuallyDelete();
});
```

The answer comes back on `dialog.returnValue`, which is set to the `value` of whichever button was pressed. Chrome, on the dialog above:

```
click Confirm      -> [ 'submit', 'returnValue:"confirm"' ]
click Cancel       -> [ 'submit', 'returnValue:"cancel"' ]
button with novalue-> [ 'submit', 'returnValue:""' ]
press Escape       -> [ 'cancel', 'returnValue:""' ]
```

Zero navigations and zero network requests in all four cases.

**Why bother, when a click handler calling `dialog.close()` is two lines?** Because of the list in §1. Inside that `<form>` you keep Enter-to-confirm, the default button, and native validation — a `required` field in a `method="dialog"` form blocks the close exactly as it would block a submission, with the browser's bubble, and the dialog stays open. Wire the same dialog up with click handlers and you've opted out of all of it, so Enter does nothing and your validation is yours to write.

Outside a `<dialog>`, `method="dialog"` is inert: the `submit` event still fires, and nothing else happens.

---

## 6. The Enter key

In the §2 run, focusing the email field and pressing Enter instead of clicking gave:

```
email=priya@example.com
reference=AB-9921
terms=on
plan=pro
action=save
coupon=LAUNCH10
```

Same envelope, except `action=save` — because Enter didn't submit the form directly, it **clicked a button**. Specifically the form's **default button**, which is the first submit button in tree order. Any `click` handler on that button runs, and so does its `formaction`.

Two consequences worth carrying into a code review. The order of your submit buttons is a behavioural decision, not a visual one: if "Delete" comes first in the markup and "Save" second, Enter deletes. And if you reorder buttons with CSS `order` or `flex-direction: row-reverse`, the default button is still the first one *in the markup*, so what Enter does no longer matches what the user sees on the left.

If a form has no submit button at all, Enter still submits it — but only if there's exactly one text field. That's why a search box with no button submits on Enter, and why adding a second text field silently stops it working.
