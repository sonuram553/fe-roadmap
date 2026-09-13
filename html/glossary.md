# Glossary

Terms used across these notes.

## Switch device

One or two physical buttons used instead of a mouse and keyboard: a large pad hit with a hand, head or knee, a sip-and-puff tube, a muscle or blink sensor. Used by people with severe motor impairment. Since you can't point with one button, the system highlights each focusable element in turn and you press the switch when it reaches the one you want — so a clickable `<div>`, which never takes focus, is not merely awkward but unreachable.

## Voice control

Operating the interface by speaking commands ("click Submit", "scroll down"), rather than dictating text. Commands are matched against a control's accessible name, so a real `<button>Submit</button>` works by voice for free while an icon-only control with no name cannot be addressed at all. Used mostly by people with RSI, tremor, or limited hand movement.
