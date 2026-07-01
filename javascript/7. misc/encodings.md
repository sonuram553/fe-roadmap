# Character Encodings in JavaScript

## ASCII

7-bit encoding for 128 characters (0–127): English letters, digits, punctuation, control chars.

```js
"A".charCodeAt(0)  // 65
"a".charCodeAt(0)  // 97
"0".charCodeAt(0)  // 48

String.fromCharCode(65)                   // "A"
String.fromCharCode(72, 101, 108, 108, 111)  // "Hello"
```

ASCII is a subset of everything below — the first 128 code points are the same across ASCII, Unicode, and UTF-8.

`charCodeAt` and `fromCharCode` work for ASCII and any BMP character (up to U+FFFF). They break for characters above U+FFFF (like most emoji) — use `codePointAt`/`fromCodePoint` for those.

Latin-1 (ISO 8859-1) is only the first 256 code points (U+0000–U+00FF): ASCII + Western European characters like `é`, `ñ`, `ü`. Much smaller than BMP. `btoa()` is restricted to Latin-1 — even `€` (U+20AC, within BMP) breaks it.

BMP (Basic Multilingual Plane) is the first 65,536 code points (U+0000–U+FFFF), covering virtually all modern languages and common symbols. Characters above it live in supplementary planes — most emoji are there.

---

## Unicode

A **standard** (not an encoding) that assigns a unique **code point** to every character in every language. Code points are written as `U+XXXX`.

```js
"A"    // U+0041
"€"    // U+20AC
"😀"   // U+1F600

// Get code point (works for emoji/surrogate pairs unlike charCodeAt)
"😀".codePointAt(0)          // 128512  (0x1F600)
String.fromCodePoint(128512) // "😀"

// Emoji are > U+FFFF, so they take 2 UTF-16 code units ("surrogate pair")
"😀".length       // 2  — JS strings are UTF-16 internally
[..."😀"].length  // 1  — spread iterates code points
```

A **code unit** is the fixed-size chunk an encoding works with internally. UTF-16 uses 2-byte code units — BMP characters fit in one, characters above U+FFFF need two (surrogate pair). `.length` counts code units, not characters.

UTF-8 uses 1-byte code units with 1–4 per character. UTF-16 uses 2-byte code units with 1–2 per character.

`u` (lowercase) appears in JS escape syntax, not in the name itself:

- `\uXXXX` — escapes a BMP code point (up to U+FFFF)
- `\u{XXXXX}` — escapes any code point

```js
"\u{1F600}" // "😀"
```

---

## UTF-8

UTF = Unicode Transformation Format. A **variable-width encoding** of Unicode code points into bytes:


| Code point range        | Bytes used |
| ----------------------- | ---------- |
| U+0000 – U+007F (ASCII) | 1 byte     |
| U+0080 – U+07FF         | 2 bytes    |
| U+0800 – U+FFFF         | 3 bytes    |
| U+10000 – U+10FFFF      | 4 bytes    |

```js
const encoder = new TextEncoder()   // always outputs UTF-8
const decoder = new TextDecoder()   // default is UTF-8

encoder.encode("Hello 😀")
// Uint8Array [72, 101, 108, 108, 111, 32, 240, 159, 152, 128]
//             H    e    l    l    o   SP  ←── emoji: 4 bytes ──→

decoder.decode(new Uint8Array([72, 101, 108, 108, 111]))
// "Hello"
```

`TextEncoder` converts a JS string (UTF-16 internally) into UTF-8 bytes as a `Uint8Array`. `TextDecoder` does the reverse. They bridge the gap between JS strings and network/file APIs that work with raw UTF-8 bytes.

---

## Base64

An **encoding scheme** (not a character set) that represents binary data as printable ASCII using 64 characters (`A-Z`, `a-z`, `0-9`, `+`, `/`). Every 3 bytes → 4 chars, so output is ~33% larger.

Common uses:

- **Data URLs** — embed images/fonts directly in HTML/CSS without a separate request (`<img src="data:image/png;base64,...">`)
- **Email attachments (MIME)** — email protocols are text-only, so binary files are Base64-encoded before sending
- **JWT tokens** — header and payload are Base64url-encoded (a variant using `-` and `_` instead of `+` and `/`)
- **JSON APIs** — transferring binary data (images, files) over JSON, which can't represent raw bytes
- **Cookies / localStorage** — storing binary-ish data as a plain string

`btoa` = binary to ASCII, `atob` = ASCII to binary

```js
btoa("Hello")     // "SGVsbG8="
atob("SGVsbG8=")  // "Hello"

// btoa() breaks on non-ASCII — encode to UTF-8 bytes first
function toBase64(str) {
  const bytes = new TextEncoder().encode(str)
  const binary = String.fromCharCode(...bytes)
  return btoa(binary)
}

function fromBase64(b64) {
  const binary = atob(b64)
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

toBase64("Hello 😀")             // "SGVsbG8g8J+YgA=="
fromBase64("SGVsbG8g8J+YgA==")  // "Hello 😀"
```

---

## How they relate

```
Source text: "€"
     │
     ▼
Unicode code point: U+20AC (8364 decimal)
     │
     ▼
UTF-8 bytes: 0xE2 0x82 0xAC  (3 bytes)
     │
     ▼
Base64: "4oCs"  (4 ASCII chars)
```

- **Unicode** — the map of every character to a number
- **UTF-8** — how to store those numbers as bytes (variable width, ASCII-compatible)
- **ASCII** — the original 128-char subset; still valid UTF-8
- **Base64** — how to represent arbitrary bytes as safe printable text

