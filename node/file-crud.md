# File CRUD with Node.js (`fs`)

Node's built-in `fs` module is how you Create, Read, Update, and Delete
files on disk. No install needed — it ships with Node.

```js
const fs = require("fs/promises"); // CJS
import fs from "fs/promises"; // ESM
```

You'll also see these written as `require("node:fs")` / `from "node:fs"`.
The `node:` prefix is the same module — it just states explicitly that
it's a built-in, so Node never looks in `node_modules` for it.

---

## 1. Three flavours of the same API

Every `fs` operation exists in three forms. Pick one and stay consistent.

| Flavour | Import | Style | When |
| --- | --- | --- | --- |
| **Promise** | `fs/promises` | `await fs.readFile()` | **Default choice** — async, clean |
| **Callback** | `fs` | `fs.readFile(path, cb)` | Legacy code, or perf-critical hot paths |
| **Sync** | `fs` | `fs.readFileSync(path)` | CLI scripts, startup config, build tools |

```js
// promise
const data = await fs.readFile("a.txt", "utf8");

// callback — error-first: (err, result)
require("fs").readFile("a.txt", "utf8", (err, data) => {
  if (err) throw err;
  console.log(data);
});

// sync — returns directly, throws on error
const data2 = require("fs").readFileSync("a.txt", "utf8");
```

**Why sync is dangerous in a server:** Node runs your JS on a single
thread. `readFileSync` blocks that thread until the disk responds — every
other request in flight just waits. In a one-shot CLI script there's
nobody else to block, so sync is fine (and simpler). In an HTTP server,
never.

---

## 2. Paths — always build them, never concatenate

```js
const path = require("path");

path.join(__dirname, "data", "users.json");
// /Users/sonu.ram/project/data/users.json
```

- `path.join` uses the right separator per OS (`/` vs `\`) and collapses
  `..`/duplicate slashes.
- Relative paths like `"./data.json"` resolve against **`process.cwd()`**
  (where the terminal ran the command), *not* against the file containing
  the code. That's the classic "works when I run it from the project root,
  breaks otherwise" bug. `__dirname` is what you almost always want.
- In ESM there is no `__dirname`:

  ```js
  import { fileURLToPath } from "url";
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  ```

  (See [js-modules.md](../javascript/1.%20basics/12-js-modules.md).)

---

## 3. CREATE — writing a new file

```js
await fs.writeFile("notes.txt", "hello world");
```

`writeFile` **creates the file if missing and overwrites it if present**.
That silent overwrite is the #1 gotcha. To fail loudly instead, pass the
`wx` flag ("write, exclusive"):

```js
try {
  await fs.writeFile("notes.txt", "hello", { flag: "wx" });
} catch (err) {
  if (err.code === "EEXIST") console.log("already exists, not touching it");
  else throw err;
}
```

### Flags worth knowing

| Flag | Meaning |
| --- | --- |
| `w` | write — truncate if exists, create if not (**default**) |
| `wx` | same as `w`, but **fails** if the file exists |
| `a` | append — create if missing |
| `ax` | append, but fails if the file exists |
| `r` | read only (default for `readFile`) — fails if missing |
| `r+` | read + write, fails if missing |

### Directories

```js
await fs.mkdir("data");                          // fails if it exists
await fs.mkdir("data/2026/logs", { recursive: true }); // makes parents,
                                                       // no error if exists
```

`{ recursive: true }` is the `mkdir -p` equivalent and is idempotent —
great for "make sure this folder exists" at startup.

---

## 4. READ

```js
const text = await fs.readFile("notes.txt", "utf8"); // → string
const buf  = await fs.readFile("photo.png");          // → Buffer
```

**Encoding matters.** Without an encoding you get a `Buffer` — raw bytes.
That's correct for images/binaries, but for text you'll see
`<Buffer 68 65 6c ...>` instead of your content. Pass `"utf8"` (or call
`buf.toString("utf8")`).

### Reading JSON

```js
const raw = await fs.readFile(file, "utf8");
const users = JSON.parse(raw);
```

There's no `fs.readJSON` — parsing is on you. Wrap `JSON.parse` in
try/catch: a half-written or empty file throws a `SyntaxError`, which is a
*different* failure from the file not existing.

### Listing a directory

```js
const names = await fs.readdir("data");          // ["a.txt", "sub"]

// with type info — avoids a stat() call per entry
const entries = await fs.readdir("data", { withFileTypes: true });
for (const e of entries) {
  console.log(e.name, e.isDirectory() ? "dir" : "file");
}

// recursive walk (Node 20+)
const all = await fs.readdir("data", { recursive: true });
```

### Metadata

```js
const st = await fs.stat("notes.txt");
st.size;          // bytes
st.mtime;         // last modified Date
st.birthtime;     // created Date
st.isFile();
st.isDirectory();
```

---

## 5. UPDATE

There is no "edit line 12 in place" API. Updating is one of three
patterns.

### a) Append

```js
await fs.appendFile("app.log", `${new Date().toISOString()} started\n`);
```

Cheapest update — the OS just adds to the end. Perfect for logs.

### b) Read → modify → write (the usual one)

```js
const users = JSON.parse(await fs.readFile(file, "utf8"));
users.push({ id: 3, name: "Asha" });
await fs.writeFile(file, JSON.stringify(users, null, 2));
```

Note this loads the whole file into memory. Fine for config/JSON, wrong
for a 2 GB log — use streams (§8) for those.

### c) Rename / move / copy

```js
await fs.rename("old.txt", "new.txt");        // rename = move
await fs.rename("a.txt", "archive/a.txt");    // dest dir must exist
await fs.copyFile("a.txt", "a.backup.txt");
await fs.cp("src", "dist", { recursive: true }); // copy a whole tree
```

`rename` within the same filesystem is **atomic** — it either fully
happens or doesn't. That property powers the safe-write pattern in §9.

---

## 6. DELETE

```js
await fs.rm("notes.txt");                            // one file
await fs.rm("notes.txt", { force: true });           // no error if missing
await fs.rm("data", { recursive: true });            // folder + contents
await fs.rm("data", { recursive: true, force: true }); // rm -rf
```

`fs.rm` (Node 14.14+) is the modern one-stop API. Older code uses
`fs.unlink` (files only) and `fs.rmdir` (empty dirs only; `recursive` on
it is deprecated) — you can still read them in the wild, but write `rm`.

Deleting is permanent — no trash/recycle bin. Guard `recursive: true`
paths carefully; a bad variable interpolation turns into `rm -rf /`.

---

## 7. Errors: check by `err.code`, don't pre-check existence

```js
if (fs.existsSync(file)) {        // ❌ don't do this
  const data = await fs.readFile(file, "utf8");
}
```

This is a **TOCTOU race** (time-of-check to time-of-use): the file can be
deleted by another process in the gap between the check and the read, and
the read throws anyway. You need the try/catch regardless, so just write
the try/catch:

```js
try {                              // ✅
  const data = await fs.readFile(file, "utf8");
} catch (err) {
  if (err.code === "ENOENT") return null;  // not found → sensible default
  throw err;                                // anything else → real problem
}
```

Note `fs.existsSync` is the one `*Sync` function with no promise
counterpart, precisely because the API discourages this pattern.

### Common error codes

| Code | Meaning |
| --- | --- |
| `ENOENT` | No such file or directory (also: parent dir missing on write) |
| `EEXIST` | Already exists (with `wx`/`mkdir`) |
| `EACCES` / `EPERM` | Permission denied |
| `EISDIR` | Expected a file, got a directory |
| `ENOTDIR` | Expected a directory, got a file |
| `ENOTEMPTY` | Tried to remove a non-empty dir without `recursive` |
| `EMFILE` | Too many open files (leaked handles, or unthrottled parallel I/O) |

---

## 8. Big files → streams

`readFile` buffers the **entire** file in memory. A 2 GB file means 2 GB
of RAM (and Node's buffer cap will reject it outright). Streams process it
in chunks (64 KB by default) with near-constant memory.

```js
const { createReadStream, createWriteStream } = require("fs");
const { pipeline } = require("stream/promises");
const { createGzip } = require("zlib");

await pipeline(
  createReadStream("huge.log"),
  createGzip(),                       // any transform (optional)
  createWriteStream("huge.log.gz")
);
```

Use `pipeline` rather than `.pipe()` — it propagates errors and destroys
every stream in the chain on failure, so a mid-transfer error can't leak
file descriptors.

Reading line by line:

```js
const readline = require("readline");
const rl = readline.createInterface({ input: createReadStream("huge.log") });
for await (const line of rl) {
  // one line at a time, memory stays flat
}
```

Rule of thumb: file comfortably under a few MB and you need it whole →
`readFile`. Otherwise → stream.

---

## 9. Atomic writes (don't corrupt data on crash)

`writeFile` truncates the file first, then writes. If the process dies
mid-write, you're left with a truncated/empty file — original data gone.
Write to a temp file and `rename` over the target instead:

```js
async function writeAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, file); // atomic swap on the same filesystem
}
```

At every instant the target is either the complete old content or the
complete new content — never a half-written mix. Worth doing for anything
you'd hate to lose (JSON stores, config, caches).

---

## 10. Putting it together — a tiny JSON store

```js
const fs = require("fs/promises");
const path = require("path");

const FILE = path.join(__dirname, "data", "users.json");

// READ ALL — returns [] when the store doesn't exist yet
async function readAll() {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(users) {
  await fs.mkdir(path.dirname(FILE), { recursive: true }); // ensure dir
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(users, null, 2));
  await fs.rename(tmp, FILE);
}

// CREATE
async function create(user) {
  const users = await readAll();
  const record = { id: crypto.randomUUID(), ...user }; // crypto is global
                                                       // in Node 19+
  users.push(record);
  await writeAll(users);
  return record;
}

// READ ONE
async function findById(id) {
  return (await readAll()).find((u) => u.id === id) ?? null;
}

// UPDATE
async function update(id, patch) {
  const users = await readAll();
  const i = users.findIndex((u) => u.id === id);
  if (i === -1) return null;
  users[i] = { ...users[i], ...patch };
  await writeAll(users);
  return users[i];
}

// DELETE
async function remove(id) {
  const users = await readAll();
  const left = users.filter((u) => u.id !== id);
  if (left.length === users.length) return false; // nothing removed
  await writeAll(left);
  return true;
}
```

This is a real pattern for small local tools and CLIs. Its limit: every
operation rewrites the whole file, and two concurrent writers can clobber
each other (`fs` gives you no locking). Past that point, use SQLite or a
real database.

---

## Quick reference

| Operation | API |
| --- | --- |
| Write / overwrite | `fs.writeFile(path, data)` |
| Create only if absent | `fs.writeFile(path, data, { flag: "wx" })` |
| Append | `fs.appendFile(path, data)` |
| Read text | `fs.readFile(path, "utf8")` |
| Read binary | `fs.readFile(path)` → Buffer |
| List dir | `fs.readdir(path, { withFileTypes: true })` |
| Make dir | `fs.mkdir(path, { recursive: true })` |
| Metadata | `fs.stat(path)` |
| Move / rename | `fs.rename(from, to)` |
| Copy file / tree | `fs.copyFile(a, b)` / `fs.cp(a, b, { recursive: true })` |
| Delete file | `fs.rm(path, { force: true })` |
| Delete tree | `fs.rm(path, { recursive: true, force: true })` |
| Big file in | `createReadStream(path)` |
| Big file out | `createWriteStream(path)` |
