# IndexedDB

Level: beginner to intermediate. How to actually use IndexedDB, the browser's built-in database: opening it, changing its shape over time, reading and writing, finding things with indexes, sorting and paging, transactions, and keeping several tabs in step. Every output quoted here comes from running the code in Chrome 154.

This picks up from [Storage in the browser](browser-storage.md) §6, which introduces it in a few lines. That lesson's hotel is still here. IndexedDB is the storeroom in the basement.

## 1. What it's for

Reach for IndexedDB when a web app needs to keep a lot of data, or data with some shape to it, on the user's own machine, and still find things in it quickly. If a few strings in `localStorage` would do, you don't need it. Here is where it earns its place.

**Apps that keep working offline.** Gmail and Google Docs keep your mail and documents in IndexedDB when offline mode is on. You can read and edit on a train with no signal, and the changes go up to the server once you're back online. Meera's notes app is this case.

**Apps that open instantly.** A chat app like WhatsApp Web keeps recent conversations in IndexedDB. When you open it, it shows what it already has at once and only asks the server for what's new. Without that, every visit starts with an empty screen and a spinner.

**Big files and binary data.** A photo editor saving work in progress, a music app keeping downloaded tracks, a maps app keeping the map for an area. IndexedDB stores `Blob`s and typed arrays as they are, with room for hundreds of megabytes. `localStorage` stops at about five million characters, and only of text.

**Work waiting to be sent.** The user presses Send with no connection. The app puts the message in IndexedDB, and a service worker sends it when the network comes back. This works because IndexedDB can be used from workers, and `localStorage` can't.

**Data you need to search, filter or sort.** "Every note tagged work." "Mail from last week, newest first." "The next 20 results." Indexes and cursors answer these without loading everything into memory.

Often you use it without writing any IndexedDB code at all. Firebase's offline mode, for one, keeps its local copy of your data in IndexedDB.

It is the wrong tool for the rest of the hotel's jobs. A handful of settings is simpler in `localStorage`. Anything the server must see on every request, like who is logged in, belongs in a cookie. The app's own files for offline use go in the Cache API. And it should never hold the *only* copy of something that matters, because the browser is allowed to clear it ([Storage in the browser](browser-storage.md) §8). Treat it as a local copy of data that also lives on a server.

## 2. The storeroom, up close

Meera's notes app keeps every note in IndexedDB. Before any code, here is how the storeroom is laid out, because the API uses a word for each part.

- The **database** is the storeroom itself. It has a name (`'notes-app'`) and a **version number** painted on the door.
- An **object store** is one set of shelves for one kind of thing. Meera has two: `notes` and `settings`. If you know SQL, an object store is roughly a table.
- Every box on a shelf has a label, its **key**. No two boxes on the same shelves can have the same label. You find a box by its key.
- An **index** is a card catalogue for one set of shelves. It lets you find boxes by something other than the key, like "every note tagged `work`".
- A **transaction** is a request form. You list which shelves you need and whether you will only look (`readonly`) or also change things (`readwrite`). Every read and write happens on a form.

You never go down to the storeroom yourself. You hand in the form, and the staff tell you later when it's done. That is why everything in IndexedDB is asynchronous: the page never waits.

## 3. Opening the database

```js
const openReq = indexedDB.open('notes-app', 1);

openReq.onupgradeneeded = () => {
  const db = openReq.result;

  const notes = db.createObjectStore('notes', { keyPath: 'id' });
  notes.createIndex('byUpdated', 'updated');
  notes.createIndex('byTag', 'tags', { multiEntry: true });
  notes.createIndex('bySlug', 'slug', { unique: true });

  db.createObjectStore('settings');
};

openReq.onsuccess = () => {
  const db = openReq.result;
  // ready to use
};
```

`indexedDB.open` doesn't give you the database. It gives you a **request**: an object that will fire an event once the answer is ready. The answer then sits in `openReq.result`.

`onupgradeneeded` is where the shelves get built. It is the only place where you can create or remove object stores and indexes. It runs when the database doesn't exist yet, or when the code asks for a higher version than the one on disk. On every other visit it doesn't run at all.

The two stores are set up differently:

- `notes` has `keyPath: 'id'`. That means "the key of each note is its own `id` field". You store `{ id: 4, title: 'Dentist' }` and the key `4` is taken from inside it.
- `settings` has no key path. Its values carry no key of their own, so you pass the key separately each time you store something, like `put('dark', 'theme')`. This is handy for simple key/value data.

Meera's app gives each note its id itself, so the same id can be used on the server. If you would rather let the database count for you, add `autoIncrement: true` and leave `id` out; the database fills it in with 1, 2, 3 and so on.

The indexes say which field to catalogue. `byUpdated` catalogues notes by their `updated` date. `byTag` catalogues them by `tags`, and `multiEntry: true` means a note with `tags: ['work', 'today']` gets a card under *each* tag rather than one card for the whole array. `bySlug` has `unique: true`, so no two notes may share a slug. §8 puts all three to work.

### Turning requests into promises

Almost every IndexedDB call returns a request like `openReq`, with `onsuccess` and `onerror`. The API is older than promises. Everyone writes a tiny helper once, and the rest of this lesson uses it:

```js
const p = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
```

Now `await p(store.get(1))` gives you the note.

The answer really does arrive later. Meera asked for a count between two log lines, without waiting:

```js
console.log('before get');
db.transaction('notes').objectStore('notes').count().onsuccess = (e) => console.log('count = ' + e.target.result);
console.log('after get');
```

```
before get
after get
count = 3
```

The page carried on, and the count showed up afterwards, just like a `fetch` reply would ([event-loop.md](../4.%20async/event-loop.md)).

### From a worker

Unlike `localStorage`, IndexedDB also works inside web workers, and the page and the worker see the same database. A worker opened Meera's database and read a note:

```js
// worker.js
const openReq = indexedDB.open('notes-app', 1);
openReq.onsuccess = () => {
  const get = openReq.result.transaction('notes').objectStore('notes').get(1);
  get.onsuccess = () => postMessage(`worker read note 1: ${get.result.title} | localStorage in worker? ${typeof localStorage}`);
};
```

```
worker read note 1: Groceries | localStorage in worker? undefined
```

So the page can save notes while a worker builds a search index from them, with no messages needed to pass the data across.

## 4. Changing the shelves later

Version 1 of the app shipped without the `byTag` index. Later Meera wanted to filter by tag, so the database needed a new index. You can't add one whenever you like. You raise the version number, and the browser runs `onupgradeneeded` again for every user who still has the old version.

The event tells you which version is on disk in `oldVersion` (`0` for a brand new user). So the upgrade code is written as a list of steps, each one guarded by the version that introduced it:

```js
const openReq = indexedDB.open('notes-app', 2);

openReq.onupgradeneeded = (e) => {
  console.log(`upgradeneeded: ${e.oldVersion} -> ${e.newVersion}`);
  const db = openReq.result;
  if (e.oldVersion < 1) {
    db.createObjectStore('notes', { keyPath: 'id' });
  }
  if (e.oldVersion < 2) {
    openReq.transaction.objectStore('notes').createIndex('byTag', 'tags', { multiEntry: true });
  }
};

openReq.onsuccess = () => {
  const db = openReq.result;
  const indexes = [...db.transaction('notes').objectStore('notes').indexNames];
  console.log(`opened version ${db.version}, indexes: [${indexes}]`);
};
```

To see it work, follow one user across three visits. On the first visit the app was still at version 1, whose code was the same but without the second step. Then Meera shipped version 2:

```
-- visit 1
upgradeneeded: 0 -> 1
opened version 1, indexes: []
-- visit 2
upgradeneeded: 1 -> 2
opened version 2, indexes: [byTag]
-- visit 3
opened version 2, indexes: [byTag]
```

- **Visit 1.** Nothing was on disk yet, which counts as version 0. The code asked for 1, so the upgrade ran and created the store. No index yet.
- **Visit 2.** The disk said 1, the code asked for 2. `oldVersion < 1` was false, so the store wasn't created again (that would throw). `oldVersion < 2` was true, so the index was added. The user's notes were kept.
- **Visit 3.** The disk said 2, the code asked for 2. Nothing went up, so `onupgradeneeded` didn't run at all. This is what almost every visit looks like.

A brand new user who arrives after version 2 shipped skips straight to:

```
-- new user, first visit
upgradeneeded: 0 -> 2
opened version 2, indexes: [byTag]
```

Both `if`s were true, so both steps ran in one go, and this user ended up with the same database as the one who went 0 → 1 → 2. Each user runs only the steps they missed.

Two habits keep this safe. Never edit an old step after it has shipped, since some users have already run it; add a new step instead. And raise the version number every time the shape changes, because the upgrade code only runs when the number goes up.

`openReq.transaction` in the second step is the special transaction that the upgrade runs inside. It is how you reach a store that already exists, to add an index to it.

## 5. When another tab has the old version open

Upgrades have one awkward case. Suppose the user has the app open in tab A, running the old version 1 code. Meera ships version 2, and the user opens it in tab B. Tab B asks for version 2, but tab A is still using version 1. The browser won't change the shelves while someone is using them.

Here is what each tab heard:

```js
// both tabs
openReq.onblocked = (e) => console.log(`blocked (another tab still has version ${e.oldVersion} open)`);

openReq.onsuccess = () => {
  const db = openReq.result;
  db.onversionchange = (e) => console.log(`versionchange to ${e.newVersion}, ignoring`);
};
```

```
[tab A] old code: opened version 1
[tab A] old code: versionchange to 2, ignoring
[tab B] new code: blocked (another tab still has version 1 open)
```

Tab A got a `versionchange` event: "someone wants to upgrade". It ignored it. So tab B got `blocked`, and its upgrade sat waiting. It only went ahead once tab A let go of the database:

```
[tab B] new code: upgrading 1 -> 2
[tab B] new code: opened version 2
```

If tab A is a forgotten tab the user won't look at for days, tab B waits for days. The fix is for every tab to step aside politely. When `versionchange` arrives, close the connection and tell the user to reload:

```js
db.onversionchange = () => {
  db.close();
  showBanner('A new version of the app is ready. Please reload.');
};
```

With that in place, a tab running version 2 made way for version 3 at once:

```
[tab C] v2 code: opened version 2
[tab C] v2 code: versionchange to 3, closing
[tab D] v3 code: upgrading 2 -> 3
[tab D] v3 code: opened version 3
```

Once tab C closes its connection, it can't use the database any more, so the reload really is needed. A call after closing fails straight away:

```
after close: InvalidStateError: Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.
```

## 6. Putting things in and taking them out

Every read and write goes through a transaction. You name the stores you need and the mode:

```js
const tx = db.transaction('notes', 'readwrite');
const notes = tx.objectStore('notes');
```

There are two ways to store a value, and they differ in one way. `add` only stores a *new* box: if the key is already taken, it fails. `put` stores the box whatever happens, replacing any box with the same key.

```js
await p(notes.add({ id: 1, title: 'Groceries', slug: 'groceries', tags: ['home'], updated: new Date('2026-10-01') }));
await p(notes.add({ id: 1, title: 'Groceries again', slug: 'groceries-2', tags: [], updated: new Date() }));
```

```
add id 1 -> 1
add id 1 again: ConstraintError: Key already exists in the object store.
```

`add` returned the key it stored under, `1`. The second `add` with the same id was refused. With `put` the same thing just overwrites:

```js
notes.put({ id: 1, title: 'Groceries', /* … */ });
notes.put({ id: 1, title: 'Groceries (edited)', /* … */ });
```

```
after put twice: Groceries (edited)
```

So use `add` when a clash would mean a bug and you want to hear about it, and `put` for "save this, new or not". Most saving code uses `put`.

Reading is `get(key)` for one value, `getAll()` for everything, `count()`, and `getAllKeys()`. Removing is `delete(key)`, or `clear()` for the whole store.

### Values keep their type

Whatever you store comes back as the same kind of thing. Meera saved a note with a date and an attached image, then read it back:

```js
await p(notes.put({
  id: 3, title: 'Release', tags: ['work'], updated: new Date('2026-10-04T09:00:00Z'),
  attachments: new Map([['logo.png', new Blob(['png-bytes'])]]),
}));

const note = await p(db.transaction('notes').objectStore('notes').get(3));
```

```
get(3).attachments: Map, logo is Blob of 9 bytes
```

No `JSON.stringify` and no `JSON.parse`. The `Date` came back as a `Date`, the `Map` as a `Map`, and the image as a `Blob`. IndexedDB copies values with the same **structured clone** algorithm that `postMessage` uses, so anything that can be sent to a worker can be stored ([web workers lesson 2](../8.%20web-workers/02-messages-are-copies.md) §2). The same things fail, too:

```
adding a function: DataCloneError: Failed to execute 'add' on 'IDBObjectStore': () => {} could not be cloned.
```

### Stores without a key path

The `settings` store, the one with no key path, takes the key as a second argument:

```js
const settings = db.transaction('settings', 'readwrite').objectStore('settings');
settings.put('dark', 'theme');
settings.put(16, 'fontSize');
settings.put({ left: 240 }, 'layout');
```

```
settings keys: ["fontSize","layout","theme"] fontSize type: number
```

Compare that with `localStorage`, which turned `16` into the string `"16"` ([Storage in the browser](browser-storage.md) §3). Here the number came back as a number. And notice the keys came back in alphabetical order, not in the order they were stored. That is the next section.

## 7. What a key can be, and how keys are sorted

Not every value can be a key. Keys can be numbers, strings, dates, binary data, and arrays of those. Some ordinary values are refused:

```
key true -> DataError
key {"a":1} -> DataError
key null -> DataError
key NaN -> DataError
```

Booleans, plain objects, `null` and `NaN` can't be keys. (They can of course be stored inside a value; they just can't be the label.)

IndexedDB keeps every store and every index **sorted by key**. This is what makes ranges and "newest first" cheap later on. The sort order has its own rules, which `indexedDB.cmp(a, b)` shows. It returns `-1` if `a` sorts first and `1` if `b` does:

```js
indexedDB.cmp(2, '10');            // a number vs a string
indexedDB.cmp(new Date(0), 99999); // a date vs a number
indexedDB.cmp('B', 'a');           // uppercase vs lowercase
indexedDB.cmp([1, 'z'], 'zzz');    // an array vs a string
```

```
cmp: -1 1 -1 1
```

Read left to right:

- Every number sorts before every string, so `2` comes before `'10'`, whatever the digits say.
- Every date sorts after every number, even a date from 1970 against a big number.
- Strings sort by character code, not alphabetically the way a person would. All uppercase letters come before all lowercase ones, so `'B'` comes before `'a'`.
- Arrays sort after everything else.

In practice this means: keep one kind of key per store. If some ids are numbers and some are strings, the numbers all bunch up at the front. And if you need a case-insensitive order, store a lowercased copy of the field and index that.

## 8. Indexes: finding things without opening every box

Meera put seven notes in the store, and then asked each index a question.

The store itself returns notes in key order:

```
getAll by key order: 1:Groceries (edited), 2:Standup, 3:Release, 4:Dentist, 5:Book club, 6:Retro, 7:Taxes
```

The `byUpdated` index returns the same notes in date order, oldest first:

```js
await p(db.transaction('notes').objectStore('notes').index('byUpdated').getAll());
```

```
byUpdated order: Taxes, Book club, Groceries (edited), Release, Standup, Retro, Dentist
```

The `byTag` index finds notes by one tag. Because of `multiEntry`, a note with two tags turns up under both:

```js
await p(db.transaction('notes').objectStore('notes').index('byTag').getAll('today'));
```

```
byTag today: Standup, Dentist
```

The `bySlug` index looks up a single note by its slug, the way the app would when opening the URL `/notes/retro`:

```js
await p(db.transaction('notes').objectStore('notes').index('bySlug').get('retro'));
```

```
bySlug get "retro": 6
```

Because `bySlug` is `unique`, the index also guards the data. Saving a different note with a slug that's already taken was refused, even though its id was new:

```
unique slug clash: ConstraintError: Unable to add key to index 'bySlug': at least one key does not satisfy the uniqueness requirements.
```

An index is kept up to date by the database itself. Every `put` and `delete` updates the catalogue cards too. That costs a little on each write, so only make an index for questions the app actually asks.

## 9. Ranges and cursors

### A range of keys

Often you want "everything between this and that", not one exact key. An `IDBKeyRange` describes that, and you pass it wherever a key would go:

```js
const store = db.transaction('notes').objectStore('notes');
await p(store.getAll(IDBKeyRange.bound(2, 4)));
```

```
ids 2..4: Standup, Release, Dentist
```

`bound(2, 4)` includes both ends. It also takes two more arguments that say whether to *leave out* the lower and upper end. That makes date ranges easy. Here are all notes updated in October, from the 1st up to but not including 1 November:

```js
const october = IDBKeyRange.bound(new Date('2026-10-01'), new Date('2026-11-01'), false, true);
await p(store.index('byUpdated').getAll(october));
```

```
updated in October: Groceries (edited), Release, Standup, Retro, Dentist
```

The `false, true` means "keep the lower end, drop the upper end". The other shapes are `IDBKeyRange.lowerBound(x)` (from `x` upwards), `upperBound(x)` (up to `x`) and `only(x)` (exactly `x`).

`getAll` also takes a second argument, the most results to return:

```js
await p(store.getAll(null, 2));   // null means "no range, start from the beginning"
```

```
first 2 ids: 1, 2
```

### Walking with a cursor

`getAll` always reads from the low end upwards. To read newest first, or to stop part way, you use a **cursor**. A cursor is a pointer that walks along the shelves one box at a time. You look at the box it is on, then tell it to move on with `continue()`. Each step fires `onsuccess` again, and when there are no more boxes, `result` is `null`.

The app's home screen shows the three most recently edited notes:

```js
const req = db.transaction('notes').objectStore('notes')
  .index('byUpdated')
  .openCursor(null, 'prev');      // 'prev' walks backwards: newest first

const page = [];
req.onsuccess = () => {
  const cursor = req.result;
  if (!cursor || page.length === 3) return show(page);
  page.push(cursor.value);
  cursor.continue();
};
```

```
Dentist (2026-10-07), Retro (2026-10-06), Standup (2026-10-05)
```

Because the index was already sorted, the database didn't have to sort anything or read the other four notes. It started at the newest end and stopped after three.

A cursor in a `readwrite` transaction can also change the box it is pointing at, with `cursor.update(value)`, or remove it with `cursor.delete()`. Meera renamed the `home` tag to `personal` across every note that had it:

```js
const tx = db.transaction('notes', 'readwrite');
const req = tx.objectStore('notes').index('byTag').openCursor('home');
req.onsuccess = () => {
  const cursor = req.result;
  if (!cursor) return;
  const note = cursor.value;
  note.tags = note.tags.map((t) => (t === 'home' ? 'personal' : t));
  cursor.update(note);
  cursor.continue();
};
```

```
byTag personal: Groceries (edited), Dentist, Book club, Taxes | home: 0
```

## 10. Transactions: all or nothing

A transaction is a promise from the storeroom: either every change on the form happens, or none of them do. If anything on the form fails, the whole form is torn up and every change on it is undone. This is called being **atomic**.

Meera moved a note by writing a new one and deleting the old one in the same transaction. A third write, by mistake, used a slug that was already taken:

```js
const tx = db.transaction('notes', 'readwrite');
const notes = tx.objectStore('notes');
notes.put({ id: 20, title: 'Move me', slug: 'move-me', tags: [], updated: new Date() });
notes.delete(2);
notes.put({ id: 21, title: 'Clash', slug: 'retro', tags: [], updated: new Date() });   // slug taken
```

```
tx aborted: ConstraintError
note 20 exists? false | note 2 still there? true
```

The first two changes had already succeeded on their own. Because the third one failed, the transaction was **aborted**, and both were undone. There was never a moment where the note existed twice or not at all. That is exactly what you want for anything that has to change several things together.

You can also tear up the form yourself with `tx.abort()`, for example when a check in your own code fails part way. Meera deleted note 3 and then aborted:

```
note 3 after manual abort? true
```

### An error you handle doesn't have to abort

A failed request aborts the transaction only if nobody deals with it. If you catch the error on the request and call `preventDefault()`, the transaction carries on. Meera tried the duplicate `add` from §6 both ways:

```js
const tx = db.transaction('notes', 'readwrite');
const notes = tx.objectStore('notes');
notes.add({ id: 1, title: 'Groceries' });
const dup = notes.add({ id: 1, title: 'Groceries again' });

dup.onerror = (e) => {
  e.preventDefault();          // "I've dealt with this, keep going"
};
```

Without the `onerror` handler:

```
unhandled error: tx aborted (ConstraintError), note 1 exists? false
```

With it:

```
handled: ConstraintError
handled error: tx committed, note 1 title: Groceries
```

Look at the first result closely. The *first* `add` worked, but it was undone too, because the transaction it belonged to was aborted. With the handler, the duplicate was simply skipped and the first note was saved.

### Staying inside the form

The form lists which shelves it covers and whether it may change them. Asking for anything else fails at once:

```
NotFoundError: Failed to execute 'objectStore' on 'IDBTransaction': The specified object store was not found.
put in readonly: ReadOnlyError: Failed to execute 'put' on 'IDBObjectStore': The transaction is read-only.
```

The first is a `notes` transaction asked for the `settings` store. The second is a `put` in a transaction opened without `'readwrite'`. Leaving the mode out gives you `readonly`, which is the right default: several read-only transactions can run at the same time, while `readwrite` transactions on the same store take turns.

### The form that files itself

One rule catches everybody once. A transaction stays open only while it has work queued. As soon as your code goes off to wait for something *else*, the staff see an empty form and file it. Meera read a note, waited on a network request, then tried to save:

```js
const tx = db.transaction('notes', 'readwrite');
const notes = tx.objectStore('notes');
const note = await p(notes.get(4));
await fetch('/api/confirm');                                 // waiting on something else
notes.put({ ...note, title: 'Dentist (confirmed)' });
```

```
put after fetch: TransactionInactiveError
```

Awaiting the transaction's own requests, like the `get` above, is fine. Awaiting a `fetch`, a timer, or anything else in the middle is not; even `setTimeout(…, 0)` is enough to close it. The fix is to do the slow work first, then open the transaction and do all the reads and writes together:

```js
const confirmed = await fetch('/api/confirm').then((r) => r.json());

const tx = db.transaction('notes', 'readwrite');
const notes = tx.objectStore('notes');
const note = await p(notes.get(4));
notes.put({ ...note, title: 'Dentist (confirmed)', confirmed });
```

