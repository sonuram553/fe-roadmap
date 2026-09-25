# Native validation, and how much of it to keep

The clerk at Priya's passport counter is not the person who decides whether she gets a passport. He can't be — he's never seen her birth certificate and he isn't allowed to check the records. What he can do is stop the obvious things at the window: you've not signed page four, you've left the date blank, you've written a phone number where the postcode goes. He hands it straight back, she fixes it there and then, and nobody waits three weeks to be told.

The back office still checks everything he checked, and everything he couldn't. It has to, because Priya's uncle mails his form in and never goes near the counter at all.

That is the whole relationship between native form validation and your server. **The browser is the clerk.** It is fast, free, and standing right next to the user. It is also completely optional from the attacker's point of view — `curl` posts straight to your endpoint and never sees a single `required` attribute.

---

## 1. The attributes

Constraints are declared on the control, not in code:

| Attribute | Constrains | Notes |
| --- | --- | --- |
| `required` | emptiness | on a radio group, any one checked satisfies all of them |
| `type` | the shape of the value | `email`, `url`, `number`, `date`, `tel` (`tel` validates nothing — it's for the keyboard) |
| `min` / `max` | range | numbers *and* dates: `min="2026-01-01"` works |
| `step` | granularity | `step="0.01"` for money, `step="any"` to switch it off |
| `pattern` | a regex | text-ish inputs only; ignored on `number`, `date`, `checkbox` |
| `minlength` / `maxlength` | length in characters | asymmetric in practice — §3 |

Two attributes turn it off. `novalidate` on the `<form>` disables the whole thing, and `formnovalidate` on a single submit button disables it for that button — which is exactly what "Save draft" needs, so a half-finished form can be stored without fighting `required`.

---

## 2. What the browser does at submit time

When the form is submitted, the browser walks the controls in tree order and checks each one. If they all pass, submission proceeds. If any fails, it **cancels the submission entirely**, focuses and scrolls to the first invalid control, and shows a small bubble next to it.

Three things about that bubble matter more than they look.

It shows **one at a time**. A form with six empty required fields reports the first, and the user fixes it, resubmits, and is told about the second. There's no list, no summary, no indication that five more are waiting.

It is **not stylable**. No CSS reaches it. Its wording comes from the browser and its language follows the *browser's* locale, not your page's — so a user running a German Chrome on your English site gets "Bitte füllen Sie dieses Feld aus" in the middle of your English form, in your competitor's visual style.

It is **transient**. It disappears on a timeout or the next click, which makes it a poor fit for anyone who needs time to read, and historically it has been unreliable with screen readers.

None of that makes the constraints wrong. It makes the *default presentation* wrong for most products — which is why §6 keeps the attributes and takes over the messages.

---

## 3. Where the constraints surprise you

Every row below is real Chrome output, typed into the field by keyboard rather than set from script — the distinction matters, and §4 explains why.

```
markup                                           typed      .value     validity
-----------------------------------------------  ---------  ---------  --------
<input required>                                 ""         ""         valueMissing
<input type="email">                             "priya@"   "priya@"   typeMismatch
<input type="email">                             "priya@b"  "priya@b"  valid
<input type="number" min="1" max="10">           "25"       "25"       rangeOverflow
<input type="number" min="1" max="10" step="2">  "4"        "4"        stepMismatch
<input type="number">                            "12e"      ""         badInput
<input pattern="[0-9]{6}">                       "4110"     "4110"     patternMismatch
<input pattern="\d{3}">                          "x123x"    "x123x"    patternMismatch
<input maxlength="3">                            "abcdefg"  "abc"      valid
<input minlength="5">                            "abc"      "abc"      tooShort
```

**`priya@b` is a valid email address.** Not a bug — `type="email"` deliberately implements a narrower grammar than real email, because `b` could be an intranet hostname and because a stricter regex would reject valid addresses. Treat it as a typo-catcher, not as proof the address exists. Only a confirmation mail proves that.

**`type="number"` throws away what it can't parse.** Typing `12e` leaves `badInput` set and `.value` as the empty string. You cannot read what the user typed, cannot echo it back in an error message, and cannot tell "they typed nonsense" apart from "they typed nothing" without checking `validity.badInput` explicitly. This is also why `type="number"` is the wrong choice for things that merely look numeric — card numbers, phone numbers, postcodes, OTP codes. Those want `inputmode="numeric"` and `pattern`, which give you the numeric keypad without the value-mangling.

**`pattern` is anchored for you.** `\d{3}` rejected `x123x`; the browser wraps your expression so it must match the whole value. No `^` or `$`, no slashes, no flags. Since the message for a failed pattern is the useless "Please match the format requested", add a `title` — the browser appends it to the bubble.

**`maxlength` and `minlength` are not symmetric.** `maxlength` is an *input filter*: Chrome truncated `abcdefg` to `abc` as it was typed, so the value was never too long and `tooLong` never fired. `minlength` is a real constraint and set `tooShort`. So `maxlength` protects the field but never produces an error a user must fix, while `minlength` does.

---

## 4. Reading the result from JavaScript

Every control carries a `validity` object — the flags in the table above are its properties — plus:

- `checkValidity()` — returns a boolean, fires an `invalid` event on each failing control, shows nothing.
- `reportValidity()` — the same, but also displays the native bubble.
- `validationMessage` — the browser's message string for the current failure.
- `setCustomValidity(msg)` — forces the control invalid with your message; **call it with `''` to clear**, or the control stays invalid forever. This is the hook for constraints HTML can't express, like "passwords must match".
- `willValidate` — false for controls that are barred from validation: `disabled`, `readonly`, `type="hidden"`, and anything inside a `<fieldset disabled>`.

One caution about reading `disabled` yourself: a control inside a `<fieldset disabled>` is genuinely disabled — it isn't submitted and `willValidate` is false — but its own `.disabled` property still reports `false`, because that property reflects the attribute on the element rather than the state it inherits. Filter by `willValidate`, not by `.disabled`.

There's a trap hiding in that list. Constraints only apply to controls that are *validated*, so hiding a step of a wizard with `display: none` does **not** exempt its required fields — the form becomes unsubmittable with no visible reason and no reachable bubble, because the browser tries to focus a control nobody can see. Disable the fieldset, or remove the fields from the DOM.

The other trap is the one the table was careful about: several constraints depend on the value having been edited by the user (the spec's *dirty value flag*). Setting `.value` from script and then reading `.validity` can report valid where real typing reports `tooShort`. Test with real input, not assignments.

---

## 5. Styling, and the pseudo-class worth knowing

`:required`, `:optional`, `:valid` and `:invalid` have been around for years, and `:invalid` is the reason so many forms greet you in red: **an empty `required` field is invalid from the moment the page loads**, before the user has done anything wrong.

`:user-invalid` and `:user-valid` fix exactly this. They match only after the user has actually interacted with the control and left it — which is the behaviour everyone was hand-rolling with `.touched` classes. They're in every current browser, so the default choice today is:

```css
input:user-invalid {
  border-color: #b3261e;
}
input:user-invalid + .error { display: block; }
```

---

## 6. The arrangement worth actually shipping

Keep the attributes. Replace the presentation.

```html
<form novalidate>
  …
</form>
```

`novalidate` switches off the bubbles and the submit-blocking, but **it does not switch off the constraints** — `validity`, `checkValidity()` and `:user-invalid` all keep working. So you keep the declarative constraints as the single source of truth and render the errors yourself:

```js
form.addEventListener('submit', (e) => {
  const invalid = [...form.elements].filter((el) => el.willValidate && !el.checkValidity());
  if (!invalid.length) return;
  e.preventDefault();
  invalid.forEach(showError);   // your markup, your wording, your language
  invalid[0].focus();           // the browser was right about this part
});
```

`showError` has an accessibility contract, and it's short. Mark the control `aria-invalid="true"`. Point `aria-describedby` at the element holding the message, so a screen reader reads the error straight after the field's name. Put the message in text next to the field, not only in colour. And move focus to the first failing control, exactly as the native behaviour did.

```html
<label for="email">Email address</label>
<input id="email" name="email" type="email" required
       aria-invalid="true" aria-describedby="email-err">
<p id="email-err">Enter an email address like priya@example.com</p>
```

Don't add `aria-required="true"` alongside `required` — the HTML attribute already puts `required` in the accessibility tree, as the dump in [04-labelling-form-controls.md](04-labelling-form-controls.md) §1 shows.

---

## 7. The answer to "pros and cons"

For native validation: it's declarative and impossible to get out of sync with the markup, it works before your JavaScript has loaded or if it fails to load at all, it costs nothing in bundle size, it drives `:user-invalid` and the mobile keyboard, and it puts `required` into the accessibility tree for free.

Against: the messages are the browser's, in the browser's language, styled the browser's way, shown one at a time and only at submit; the vocabulary is limited to what the attributes can express; and the behaviour has real edge cases — §3 is a list of them.

The position to argue is that this isn't a choice between two options but a split of one job across three places. **The attributes declare the constraints, your JavaScript presents the failures, and the server decides.** The last one is the part that isn't negotiable: everything in this note happens on a machine the user controls, so a client-side check is a courtesy to honest users and an obstacle to nobody else. Any validation that protects your data has to run again on the server.
