# Labelling form controls

## 1. Six ways to name one input, and what each gives you

Here is a form with the same control labelled six different ways, and Chrome's accessibility tree for it.

```html
<form>
  <label for="a">Email address</label><input id="a" name="a" />
  <label>Phone number <input name="b" /></label>
  <input name="c" aria-label="Postcode" />
  <input name="d" placeholder="Date of birth" />
  <input name="e" />
  <label for="f">Password</label>
  <input id="f" name="f" aria-describedby="f-hint" required />
  <p id="f-hint">At least 12 characters.</p>
</form>
```

```
form
  LabelText
    StaticText "Email address"
  textbox "Email address"
  LabelText
    StaticText "Phone number "
    textbox "Phone number "
  textbox "Postcode"
  textbox "Date of birth"
  textbox
  LabelText
    StaticText "Password"
  textbox "Password" (required=true, describedby="f-hint")
  paragraph
    StaticText "At least 12 characters."
```

Five of the six got a name. The bare `<input name="e">` appears as `textbox` with nothing after it, so a screen reader can only announce "edit text" and the user has no idea what to type.

Two details in that dump are worth pausing on. The `required` attribute has become a property in the tree, which is why you should not also write `aria-required="true"` ([02-native-validation.md](02-native-validation.md) §6). And `aria-describedby` shows up _separately_ from the name: a screen reader announces the name first, then the role, then the description. That's the right home for a hint like "At least 12 characters" — putting it inside the `<label>` would fuse it into the name, and the user would hear it every time they returned to the field.

The fourth one, named from `placeholder`, is the interesting failure. It _does_ produce a name — and it's still the worst option on the list. §4.

---

## 2. `<label for>` versus wrapping

Both are real labels and both produce the same name. They differ in what they demand of your markup.

`<label for="id">` needs the input to have an `id`, and that `id` must be unique on the page — the recurring problem with a component rendered in a list, which is what `useId()` exists for in React. In exchange the label can sit anywhere in the document, which means your CSS grid or table layout can put the text in one cell and the control in another and the association survives.

The wrapping form, `<label>Phone number <input></label>`, needs no `id` at all. Its cost is structural: the label must be an ancestor of the control, so any layout that separates them breaks it, and a wrapping label is easy to over-stretch. A `<label>` names **exactly one** control — its first labelable descendant — and silently ignores the rest:

```
wrapping label with 2 inputs -> label.control is: p
labels on first input : 1
labels on second input: 0
```

So `<label>Range <input id="p"> to <input id="q"></label>` labels the first box "Range" and leaves the second unnamed. Two boxes need two labels.

Use `for` as the default, because it survives layout changes and works in every structure. Use wrapping when the control and its text are genuinely inseparable and you'd rather not mint an id — a checkbox and its sentence is the usual case.

Note also that `for` only works on **labelable** elements: `button`, `input` (except `type="hidden"`), `meter`, `output`, `progress`, `select`, `textarea`. Pointing a `<label>` at a `<div role="textbox">` or an `<a>` does nothing — those need `aria-labelledby`.

---

## 3. What a real label gives you that `aria-label` cannot

`aria-label` names the control and stops there. A `<label>` does three more things.

**It's a click target.** Clicking the word toggles the checkbox:

```
click <label for> -> checkbox checked: true
click aria-label text -> checked     : false
```

This is not a small win. For a checkbox or radio — a 13-pixel square — the label is most of the hit area, and on a phone it's the difference between a control that can be tapped and one that can't. `aria-label` on visually identical markup gives you a square and some inert text next to it.

**It's visible, so it can't silently rot.** An `aria-label` is invisible to everyone who isn't using assistive technology, including the person who later changes the visible design around it. A field whose visible text says "Mobile" and whose `aria-label` still says "Phone" looks fine forever.

**It can be spoken.** A [voice control](../glossary.md#voice-control) user says what they see on screen. If the visible text and the accessible name disagree, "click Phone" matches nothing. This is a WCAG requirement in its own right — _Label in Name_ — and the rule it gives you is that when there is visible text, the accessible name must contain it.

Which yields the order to reach for things: **a visible `<label>` first**. If the design has no room for visible text, such as an icon-only search field, a visually hidden `<label>` — moved off-screen with CSS, so it's no longer a click target, but it stays in the tree and gets translated with the rest of the page. `aria-label` comes last, for elements a `<label>` can't reach at all (the non-labelable ones in §2), or where adding a hidden element isn't worth it, like a "remove" × button in every list row.

---

## 4. `placeholder` is not a label

The dump in §1 shows `placeholder` producing a name, which is exactly why this myth survives. It is the last resort in the name-computation order, and relying on it means accepting all of the following.

It **disappears on first keystroke**. The one moment you most need to know what a box is for — while typing into it, or when checking your answers before submitting — is the moment the text is gone. For anyone with a short-term memory impairment, that's the end of the form.

It is **grey on white by default**, and the usual fix for that is to darken it until it looks like a real value, at which point users skip the field believing it's already filled in.

It **loses to every other source**. `<label for="s">Search</label><input id="s" placeholder="Ignored too">` gives:

```
  LabelText
    StaticText "Search"
  textbox "Search"
```

The placeholder contributes nothing to the name once a label exists — so the pattern of "label for screen readers, placeholder for sighted users" doesn't do what it claims.

Placeholders are for **examples**, not names: `<label>Postcode</label><input placeholder="SW1A 1AA">`. The label says what the box is; the placeholder shows what an answer looks like. And if the example matters, put it in a hint element wired up with `aria-describedby` so it stays on screen.

---

## 5. `aria-label` and `aria-labelledby`, and which wins

A control can have more than one name source at once. The browser doesn't combine them — it checks them in a fixed order and uses the first one it finds:

1. `aria-labelledby`
2. `aria-label`
3. `<label>`
4. `title`
5. `placeholder`

Everything further down the list is ignored. Here's an input carrying both ARIA attributes:

```html
<span id="lbl">Winner</span>
<input aria-labelledby="lbl" aria-label="Ignored" />
```

```
  textbox "Winner"
```

`aria-labelledby` is higher on the list, so it wins.

That order is a hazard as much as a feature, because `aria-label` sits above `<label>`. Say a shared input component has a proper visible label, "Email address", and someone adds `aria-label="Search"` to it for one screen. Now every place that uses the component is announced as "Search", while the screen still shows "Email address". Nobody sighted will ever notice.

Of the two ARIA attributes, `aria-labelledby` is the better one. `aria-label` holds its own hidden text; `aria-labelledby` points at text that's already on the page. So if someone edits the visible text, the name changes with it and the two can't drift apart, and page translation translates the name along with everything else.

It can also point at several elements, and joins their text in the order you list the ids:

```html
<tr>
  <td id="inv-4471">Invoice 4471</td>
  <td>
    <button id="del-4471" aria-labelledby="del-4471 inv-4471">Delete</button>
  </td>
</tr>
```

On screen the button just says "Delete". A screen reader hears "Delete Invoice 4471". Without this, a table with twenty rows has twenty buttons all called "Delete", and a screen-reader user can't tell which invoice each one removes.

Native labels can join too. Several `<label for>` elements pointing at one input are combined in document order:

```html
<label for="e">Email</label>
<input id="e" />
<label for="e">(work)</label>
```

```
  textbox "Email (work)"
```

---

## 6. Naming a group of controls

A radio group's individual labels — "Email", "Phone" — are meaningless without the question they answer. The question needs to be attached to the _group_, not left as a nearby paragraph:

```html
<p>How should we contact you?</p>
<label for="r1">Email</label><input type="radio" id="r1" name="contact" />
<label for="r2">Phone</label><input type="radio" id="r2" name="contact" />

<fieldset>
  <legend>How should we contact you?</legend>
  <label for="r3">Email</label><input type="radio" id="r3" name="contact2" />
  <label for="r4">Phone</label><input type="radio" id="r4" name="contact2" />
</fieldset>
```

```
form
  paragraph
    StaticText "How should we contact you?"
  radio "Email"
  radio "Phone"
  group "How should we contact you?"
    Legend
      StaticText "How should we contact you?"
    radio "Email"
    radio "Phone"
```

The two versions look the same on screen and read identically to a sighted user. In the tree, the first pair of radios float loose next to an unrelated paragraph, while the second pair sit inside a `group` that carries the question — and screen readers announce that group name when focus enters it. `<fieldset>`/`<legend>` is also what gives you `<fieldset disabled>`, which disables and un-submits every control inside it in one attribute ([01-forms-and-submission.md](01-forms-and-submission.md) §2).

Its reputation for being unstylable is out of date, but `<legend>` is still fussy; where it genuinely fights the design, `<div role="group" aria-labelledby="q1">` gets you the same group name.

---

## 7. The two attributes that finish the job

`aria-describedby` attaches anything that isn't the name — format hints, password rules, the error message from a failed validation. It's announced after the name and role, it accepts several ids, and it's the correct home for text you'd otherwise be tempted to cram into the label.

`autocomplete` is easy to leave out, because it looks like a nice extra that saves a bit of typing. It's actually an accessibility requirement. WCAG's _Identify Input Purpose_ rule says a field asking for the user's own details — name, email, phone, address — must say in a machine-readable way what it's for, and `autocomplete` is how HTML says it: `autocomplete="given-name"`, `"email"`, `"street-address"`, `"one-time-code"`, `"new-password"`.

That matters most to the people who find typing hardest. Someone using a switch device or a head pointer can have a whole address filled in one step instead of typing it letter by letter. Someone who struggles to remember their postcode doesn't have to, because the browser remembers it. And assistive tools can read the token and add a phone icon or reword a confusing label — something they can't do from the visible label, which could say anything in any language.

The tokens are a fixed list in the spec, so the exact spelling matters: `autocomplete="name"` works, while `autocomplete="fullname"` isn't a token and is silently ignored.

Put together, a field with every part in place is still short:

```html
<label for="email">Email address</label>
<input
  id="email"
  name="email"
  type="email"
  autocomplete="email"
  required
  aria-describedby="email-hint"
/>
<p id="email-hint">We'll only use this to send your booking confirmation.</p>
```
