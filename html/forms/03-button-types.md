# `submit`, `button`, `reset` — and the one you forgot to write

There are three levers at the passport counter. The big one hands your form in. The second tears it up and gives you a fresh blank. The third just calls a colleague over to answer a question, and doesn't touch your form at all.

The levers are identical to look at, which is already a bad design. What makes it worse is the rule about the unmarked one: **a lever with no label is wired to HAND IT IN.** Priya reaches for what she thinks is the help lever, and her half-finished form disappears into the tray.

That is `<button>` with no `type` attribute, and it is the most common HTML bug that survives code review, because the markup looks harmless and the failure only shows up when someone clicks it.

---

## 1. The three types, and the default

`type="submit"` submits the form it belongs to: it runs validation, fires the `submit` event, and if nothing cancels it, sends the request. **This is the default** — omit `type` inside a form and you get this one.

`type="button"` does nothing at all on its own. No submission, no reset, no default behaviour beyond being focusable and firing `click`. It exists purely to be scripted.

`type="reset"` restores every control in the form to its starting state. §3.

Chrome, asked directly about a button written with no type inside a form:

```
default type of <button>      : submit
does it submit its form?      : true
```

So this, which reads like an inert bit of UI, reloads the page:

```html
<form action="/search">
  <input name="q">
  <button onclick="showAdvanced()">Show more options</button>
</form>
```

`showAdvanced()` runs, then the form submits, then the page navigates away and everything it did is gone. The fix is one attribute — `type="button"` — and the habit worth building is to **write `type` on every single button**, including the submit ones, so that the absence of it is never something a reader has to reason about.

(`<input type="submit">` and `<input type="button">` don't have this problem, because `<input>` has no default type of its own. But see §6 for why `<button>` is still the better element.)

---

## 2. Which button belongs to which form

A button's form is its nearest ancestor `<form>`, or whatever `form="some-id"` points at — the same form-owner rule as any other control ([01-forms-and-submission.md](01-forms-and-submission.md) §3). A `<button type="submit">` outside any form, with no `form` attribute, submits nothing and is inert.

That's the escape hatch for the layout that keeps coming up: a form in a dialog whose submit button lives in the dialog's footer, outside the `<form>` element. Give the form an `id` and the button `form="that-id"` rather than calling `form.submit()` from a click handler — and note that `form.submit()` is not the same thing at all, because **it skips validation and fires no `submit` event**. `form.requestSubmit()` is the scriptable equivalent that behaves like a real click.

---

## 3. What `reset` actually does

It does not clear the form. It restores the values that were in the markup when the page loaded — `value` attributes, `checked` attributes, `selected` options. For a form that was pre-filled with the user's saved details, "Reset" puts all of them back, and for a checkbox that started checked, it re-checks it.

Chrome, on a form whose input starts at `Priya` and whose checkbox starts checked:

```
on load             text="Priya"  checkbox=true
after user edits    text="Priya Sharma"  checkbox=false
after Reset clicked text="Priya"  checkbox=true
```

Which is exactly what the spec promises, and almost never what anyone wants. The usability case against it has been settled for twenty years: it sits next to the button the user actually wants, it's the same size and shape, it destroys work, there's no undo, and the number of people who genuinely want to empty a form they've been filling in is close to zero. If you need it — a search filter panel is the one honest case — call it "Clear filters", put it somewhere the thumb won't find by accident, and consider making it a `type="button"` that clears the fields you mean rather than every control in the form.

---

## 4. Several submit buttons, one winner

A form can have as many submit buttons as you like, and they can carry their own `name` and `value`. Only **the button that was activated** contributes a pair to the submission. From the run in [01-forms-and-submission.md](01-forms-and-submission.md) §2, where two submit buttons are both named `action`:

```
clicked Publish:  … action=publish …
pressed Enter in email:  … action=save …
```

Clicking Publish sent `action=publish` and no mention of `save`. That's how one endpoint distinguishes "Save draft" from "Publish" with no JavaScript.

The second line is the part worth remembering. Pressing Enter in a text field doesn't submit the form directly — it clicks the form's **default button**, which is the first submit button *in tree order*, and here that was Save. So the order of your buttons in the markup is behaviour, not styling: put a destructive button first and Enter will trigger it, and reordering buttons visually with flexbox `order` or `row-reverse` leaves the default button unchanged while moving what the user sees.

---

## 5. Per-button overrides

Five attributes on a submit button override the form's own for that submission:

| On the button | Overrides |
| --- | --- |
| `formaction` | `action` — send this button's submission somewhere else |
| `formmethod` | `method` |
| `formenctype` | `enctype` |
| `formtarget` | `target` |
| `formnovalidate` | turns validation off for this button only |

`formaction` is the reason you almost never need two forms for what looks like two forms: one set of fields, one `<form>`, and buttons that post it to `/save` and `/publish`. `formnovalidate` is the "Save draft" pairing — store a half-filled form without `required` fighting you ([02-native-validation.md](02-native-validation.md) §1).

---

## 6. `<button>` or `<input type="submit">`

`<button>` wins on almost everything. It has an open and close tag, so its label can contain markup — an icon `<svg>`, a `<span>` for a line of smaller text, a spinner you swap in while the request is in flight. `<input type="submit">` has only a `value` attribute, which is a plain string and nothing else.

`<button>` also separates the two jobs that `<input>` conflates: the text between the tags is what the user reads, and the `value` attribute is what gets submitted. With `<input type="submit">` they are the same attribute, so renaming the button changes your request payload.

The one genuine advantage of `<input type="image">` — a submit button that also sends the click coordinates as `name.x` and `name.y` — is a relic of server-side image maps.

---

## 7. `disabled`, and why a disabled submit button is often the wrong call

The familiar pattern is to disable the submit button until the form is valid. It has a cost that isn't obvious, and Chrome shows it:

```
disabled button focusable     : false
aria-disabled button focusable: true
```

A `disabled` button is removed from the tab order and, in most screen readers, is skipped or unannounced. So a user who tabs to the end of the form finds **no submit button at all**, and nothing tells them why — the reason it's disabled lives in whichever field they got wrong, which may be off-screen. For someone using a [switch device](../glossary.md#switch-device), who reaches controls only by cycling through focusable ones, the control simply isn't there.

The friendlier arrangement is to leave the button enabled and let the submit attempt do the explaining: run your validation, show the errors, focus the first bad field — the flow in [02-native-validation.md](02-native-validation.md) §6. If you want the button to *look* unavailable, use `aria-disabled="true"` with your own styling, which keeps it focusable and announced as dimmed-but-present, and have the click handler show the errors instead of submitting.

Real `disabled` is still right when nothing the user does on this page could enable the control, and for the moment after submission while a request is in flight — though even there, moving focus to a status message is better than letting focus fall off a button that just vanished from the tab order.
