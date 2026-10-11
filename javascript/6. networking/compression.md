# Compressed responses: what "gzipped" means

Level: beginner to intermediate. What gzip does to a file, how the browser and the server agree to use it, what your JavaScript sees, and the newer Brotli and Zstandard formats. Every number here was measured on the Monaco editor build from [lesson 12 of the Monaco series](../../libraries/monaco/12-bundle-size.md), with Chrome 155 and Node 22.

## 1. A clerk who hates writing anything twice

Priya's query playground has a Monaco editor in it, and Vite builds the editor into one JavaScript file of 4,025,028 bytes. Bundle size reports put a second number next to it: about 1 MB "gzipped". This note is about that second number.

Picture the server as an office that sends long documents to readers by courier, and the courier charges by weight. Before anything goes out, a clerk rewrites the document in shorthand. Whenever a phrase comes up that already appeared earlier, the clerk writes a short pointer back to it instead of copying it out again. At the other end, the reader's clerk expands the shorthand back into the full document, word for word.

**Gzip** is that shorthand. It is a compression format: a way of writing a file in fewer bytes so that the exact original can be rebuilt later. Nothing is lost, which is what **lossless** means. JPEG, by contrast, is lossy: it throws detail away for good.

On the web, the server does the shrinking, the file travels small, and the browser expands it before any code touches it. Priya's editor file travels as 1,012,281 bytes and arrives as 4,025,028 again. "Gzipped size" means the weight the courier carries.

## 2. How the shorthand works

Gzip uses an algorithm called **DEFLATE**, which does two things.

The first is the pointer trick. Take this line of code:

```js
this.model.getValue(); this.model.setValue(v);
```

When the clerk reaches the second `this.model.`, the same 11 characters appeared 23 characters earlier. So instead of writing them out, the clerk writes "go back 23, copy 11". The `set` is new and gets written out, and then `Value(` is another repeat:

```
this.model.getValue(); ⟨back 23, copy 11⟩set⟨back 23, copy 6⟩v);
```

That is a sketch of the idea, not real gzip output, which is binary. DEFLATE looks back up to 32 KB for a match, and minified JavaScript is full of them. In Priya's editor file, `this.` appears 51,388 times and `return ` 10,021 times.

The second trick is short codes for common bytes. Morse code gives `E`, the most common English letter, a single dot, and rare letters longer codes. DEFLATE does the same for each file: bytes that show up often get codes shorter than the usual 8 bits.

Both tricks need repetition, so how much a file shrinks depends on what is in it. Priya ran gzip over a few different inputs:

```js
// squeeze.mjs
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const editor = fs.readFileSync('editor.js');
const inputs = {
  'tiny JSON': Buffer.from('{"ok":true}'),
  'editor.js, first 100 kB': editor.subarray(0, 100_000),
  'random bytes, 100 kB': crypto.randomBytes(100_000),
  'editor.js.gz': fs.readFileSync('editor.js.gz'),
  'photo.jpg': fs.readFileSync('photo.jpg'),
};
for (const [name, buf] of Object.entries(inputs)) {
  const out = zlib.gzipSync(buf);
  console.log(name.padEnd(24), String(buf.length).padStart(8), '->', String(out.length).padStart(8));
}
```

```
tiny JSON                      11 ->       31
editor.js, first 100 kB    100000 ->    33457
random bytes, 100 kB       100000 ->   100053
editor.js.gz              1012281 ->  1011543
photo.jpg                 5617703 ->  5560106
```

1. **The tiny JSON grew.** Every gzip file has a 10-byte header and an 8-byte trailer holding a checksum and the original length. Think of it as the envelope. For 11 bytes of content, the envelope weighs more than the letter.
2. **The editor code shrank to a third.** It is full of repeats close to each other.
3. **Random bytes grew by 53 bytes.** Random data has no repeats and no favourite bytes, so there is nothing to point back to. DEFLATE stores it as it is, and the envelope adds a little.
4. **The gzipped file barely moved.** Compressed output looks like random bytes, so shorthand of shorthand gains nothing.
5. **The photo shrank by 1%.** JPEG is already compressed inside. The same goes for PNG, WebP, AVIF, WOFF2 fonts, video and zip files.

So compression pays off for text: HTML, CSS, JavaScript, JSON and SVG. Servers usually leave images, fonts and very small responses alone.

## 3. Asking and answering

The reader's clerk has to know the shorthand, so the browser lists the ones it can expand in a request header. The server picks one and writes it on the envelope in a response header. Here is Chrome 155 asking for Priya's editor file from a server that only does gzip:

```
GET /assets/index-BiMcKPBS.js
Accept-Encoding: gzip, deflate, br, zstd
```

```
HTTP/1.1 200 OK
Content-Type: text/javascript
Content-Length: 1012281
Content-Encoding: gzip
Vary: Accept-Encoding
```

`Accept-Encoding` is the browser's list. `deflate` is DEFLATE in a different envelope, `br` is Brotli and `zstd` is Zstandard (§6).

`Content-Encoding` tells the browser which one the server used. If it is missing, the body is plain. Despite the name, this has nothing to do with character encodings like UTF-8, which are covered in [encodings.md](../7.%20misc/encodings.md).

`Vary: Accept-Encoding` is for caches along the way, such as a CDN. A cache is like a sorting office that keeps copies of documents to hand out again. `Vary` tells it that the answer depends on the reader's `Accept-Encoding`, so it must keep the gzip copy and the plain copy apart and give each reader one they can read. Without it, a cache could hand a gzipped file to a client that never said it could expand gzip.

What Chrome lists depends on the connection. Priya loaded the same page from three addresses and logged the header the server received each time:

```
http://localhost:5411
  Accept-Encoding: gzip, deflate, br, zstd
http://playground.test:5411
  Accept-Encoding: gzip, deflate
https://playground.test:5412
  Accept-Encoding: gzip, deflate, br, zstd
```

Over plain HTTP to a real host name, Chrome only offers the two old formats. Unencrypted traffic is an open envelope: proxies along the route can read it and rewrite it, and when Brotli was new, some of them broke responses in a format they didn't recognise. Over HTTPS the envelope is sealed, so the newer formats are safe. `localhost` counts as safe too, because the traffic never leaves the machine.

## 4. What your code sees

Your code never sees the compressed bytes. The browser expands the response before `fetch` hands it over, so `res.json()`, `res.text()` and the body stream all give you the original bytes. What's left is a header and two numbers in the browser's performance timeline. Priya ran this in the playground page, with the server doing gzip:

```js
const url = '/assets/index-BiMcKPBS.js';

const [entry] = performance.getEntriesByName(new URL(url, location.href).href);
console.log('encodedBodySize', entry.encodedBodySize);
console.log('decodedBodySize', entry.decodedBodySize);

const res = await fetch(url);
console.log('content-encoding', res.headers.get('content-encoding'));
console.log('content-length', res.headers.get('content-length'));

let received = 0;
for await (const chunk of res.body) received += chunk.length;
console.log('bytes read', received);
```

```
encodedBodySize 1012281
decodedBodySize 4025028
content-encoding gzip
content-length 1012281
bytes read 4025028
```

1. **`encodedBodySize` is the size on the wire.** 1,012,281 bytes travelled. The browser records this for every file the page loads. For files from another origin, the server must allow it with a `Timing-Allow-Origin` header, or both sizes read 0.
2. **`decodedBodySize` is the size after expanding.** 4,025,028 bytes, the file as Vite wrote it.
3. **The `content-encoding` header is visible.** That is how code can tell compression happened.
4. **`content-length` counts the compressed bytes.** It is the weight on the envelope: 1,012,281.
5. **Reading the body gives the expanded bytes.** 4,025,028, four times the `content-length`.

Those last two lines catch out download progress bars. Code that shows `received / content-length` would reach 100% a quarter of the way through and finish at 398%. When `content-encoding` is set, treat `content-length` as unknown. Either show a spinner instead of a percentage, or have the server send the uncompressed size in a header of its own. Servers that compress on the fly often send no `content-length` at all, as §7 shows.

DevTools shows the same pair. The Network panel's status bar has "kB transferred", which is the wire size, and "MB resources", which is the size after expanding.

## 5. Two sizes, two costs

The two numbers pay for different things.

The gzipped size decides how long the download takes. On a 10 Mbit/s connection, 1,012,281 bytes take about 0.8 seconds. The uncompressed 4,025,028 would take 3.2. Compression saves 2.4 seconds on the wire.

The full size decides the cost after arrival. Chrome still has to parse 4 MB of JavaScript, compile it, run it and keep it in memory, and compression helps with none of that. A performance trace of the page load on a Mac showed Chrome spending 58 ms parsing the file, on a background thread, and 37 ms running it, which includes creating the editor. With the main thread slowed down 4×, the way DevTools imitates a cheaper phone, running it took 172 ms.

So gzip makes a big file cheaper to send but not cheaper to use. Loading less, as in [lesson 12 §3](../../libraries/monaco/12-bundle-size.md#3-load-less-choosing-features-and-languages), shrinks both numbers.

To check a file yourself, `gzip -c file.js | wc -c` prints its gzipped size, and Vite's build output has a `gzip:` column, as in [web workers lesson 5](../8.%20web-workers/05-module-workers-and-bundlers.md) §2. Tools disagree by a few kB because they use different settings and implementations. For this file, Vite reported 1,026.74 kB, Node's zlib at its strongest setting gave 1,012,281 bytes, and macOS's `gzip -9` gave 1,010,928.

## 6. Brotli and Zstandard

Gzip dates from 1992. Two newer shorthands do better.

**Brotli** (`br`) came from Google in 2015. It can look back up to 16 MB instead of 32 KB, and it ships with a built-in phrasebook: a dictionary of about 120 KB of common words and pieces of HTML, CSS and JavaScript. That lets it point at a phrase even the first time it appears in a file. Every current browser can expand it.

**Zstandard** (`zstd`) came from Facebook in 2016 and is built for speed. At its quick settings it compresses about as well as gzip, at its slow settings nearly as well as Brotli, and it expands very fast. Chrome added it in 2024.

Each format also has levels: how hard the clerk searches for earlier matches. Here is Priya's 4 MB editor file at a quick and a careful level of each, with how long compressing took on a Mac:

| format and level  | bytes     | smaller by | time    |
| ----------------- | --------- | ---------- | ------- |
| gzip 6 (default)  | 1,016,290 | 4.0×       | 62 ms   |
| gzip 9 (max)      | 1,012,281 | 4.0×       | 97 ms   |
| Brotli 4          |   981,889 | 4.1×       | 32 ms   |
| Brotli 11 (max)   |   787,260 | 5.1×       | 5.1 s   |
| zstd 3 (default)  | 1,039,987 | 3.9×       | 12 ms   |
| zstd 19           |   817,412 | 4.9×       | 0.9 s   |

Gzip and Brotli were timed with Node's zlib, and zstd with the `zstd` command's benchmark mode.

At the quick levels all three land near 1 MB. Brotli at its top level makes the smallest file, 22% smaller than the best gzip, but it took five seconds for this one file. That is fine once, at build time. It is far too slow to do for every request.

## 7. Who does the compressing

The clerk can write the shorthand while the reader waits, or keep shorthand copies ready on the shelf.

**On the fly** means the server compresses each response as it sends it. CDNs and servers like nginx do this with a setting. In Node, Express has the `compression` middleware:

```js
// server.mjs
import express from 'express';
import compression from 'compression';

const app = express();
app.use(compression());
app.get('/api/ok', (req, res) => res.json({ ok: true }));
app.use(express.static('app/dist'));
app.listen(5421);
```

The server never knows whether the browser is on HTTPS. All it reads is the `Accept-Encoding` header, and curl lets you write that header yourself. So Priya sent plain HTTP requests to `localhost`, each carrying one of Chrome's two lists from §3: first the one Chrome sends over HTTPS, with `br` and `zstd`, then the one it sends over plain HTTP, without them. A last request asked for the small API response:

```bash
for enc in "gzip, deflate, br, zstd" "gzip, deflate"; do
  echo "== request sent with Accept-Encoding: $enc"
  curl -s -o /dev/null -D - -H "Accept-Encoding: $enc" http://localhost:5421/assets/index-BiMcKPBS.js \
    | grep -i -E "content-encoding|content-length|transfer-encoding|vary"
done
echo "== request for /api/ok, sent with Accept-Encoding: gzip, deflate, br, zstd"
curl -s -o /dev/null -D - -H "Accept-Encoding: gzip, deflate, br, zstd" http://localhost:5421/api/ok \
  | grep -i -E "content-encoding|content-length|vary"
```

```
== request sent with Accept-Encoding: gzip, deflate, br, zstd
Vary: Accept-Encoding
Content-Encoding: br
Transfer-Encoding: chunked
== request sent with Accept-Encoding: gzip, deflate
Vary: Accept-Encoding
Content-Encoding: gzip
Transfer-Encoding: chunked
== request for /api/ok, sent with Accept-Encoding: gzip, deflate, br, zstd
Content-Length: 11
Vary: Accept-Encoding
```

The `==` lines come from the script's own `echo`. They are labels saying which request header each request carried. Everything under a label is a response header: `-D -` makes curl print the headers the server sent back, and `grep` keeps the few that matter here.

1. **Brotli when it can, gzip otherwise.** The middleware (version 1.8.2) picks `br` when the browser lists it. It doesn't support `zstd`, so it ignores that.
2. **No `Content-Length`.** It compresses while sending, so it can't know the final size in advance. `Transfer-Encoding: chunked` means the body arrives in pieces, each with its own length. This is the case §4 warned about.
3. **Quick, not careful.** Measured separately, that Brotli response was 1,007,161 bytes, nowhere near the 787,260 from §6. A server compressing every request has to use a fast setting.
4. **The small response was left alone.** `{"ok":true}` is 11 bytes, below the middleware's default threshold of 1 kB, so it has no `Content-Encoding`. §2 showed that gzip would only have made it bigger.

**Ahead of time** works for files that don't change between deploys, like a build's `assets/` folder. The build compresses each file once at the slowest, best setting and writes `index-BiMcKPBS.js.gz`, `.br` and `.zst` next to it. The server only has to choose. The test server behind §3 and §4 worked this way. It had all three copies of every file and sent the first of zstd, Brotli and gzip that appeared in the request's `Accept-Encoding`, or the plain file if none did.

Responses built per request, such as JSON from an API, can only be compressed on the fly. Node's `zlib` can compress a stream as it flows, as in the `createGzip()` pipeline in [file-crud.md §8](../../node/file-crud.md#8-big-files--streams).

## 8. Compressing in your own code

JavaScript can use the browser's own clerk, through `CompressionStream` and `DecompressionStream`. Priya uses them for share links. The whole query goes into the link, so anyone who opens it sees the same query, and no server has to store anything.

```js
const query = `select
  c.customer_id,
  c.customer_name,
  c.region,
  sum(o.amount) as total_amount,
  count(o.order_id) as order_count,
  max(o.order_date) as last_order_date
from customers c
join orders o on o.customer_id = c.customer_id
where o.order_date >= date '2026-01-01'
  and o.order_date < date '2026-10-01'
  and o.status = 'shipped'
group by c.customer_id, c.customer_name, c.region
having sum(o.amount) > 1000
order by total_amount desc
limit 50;`;

async function pack(text) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return bytes.toBase64({ alphabet: 'base64url', omitPadding: true });
}

async function unpack(packed) {
  const bytes = Uint8Array.fromBase64(packed, { alphabet: 'base64url' });
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}

const packed = await pack(query);
console.log('query:', query.length, 'characters');
console.log('escaped for a URL:', encodeURIComponent(query).length, 'characters');
console.log('packed:', packed.length, 'characters');
console.log('round trip matches:', (await unpack(packed)) === query);
console.log('#q=' + packed.slice(0, 40) + '...');
```

```
query: 447 characters
escaped for a URL: 609 characters
packed: 286 characters
round trip matches: true
#q=ZZDNboMwEITvfoq5kUoNMpHaS0teBTn2FlxhL_Ka...
```

1. **The query is 447 characters.** Put into a URL as it is, every space becomes `%20` and every newline `%0A`, and it grows to 609.
2. **Packed, it is 286.** That is compressed with DEFLATE and then turned into URL-safe text.
3. **The round trip is exact.** Lossless, as in §1.

`'deflate-raw'` is DEFLATE with no envelope: no header and no checksum, so 18 bytes lighter than `'gzip'`. Nothing else needs to recognise the format here, so the envelope would be wasted. The compressed output is bytes, not text, so `toBase64` with the `base64url` alphabet turns it into characters that are safe in a URL ([Base64](../7.%20misc/encodings.md#base64)).

Chrome 155 accepts `'gzip'`, `'deflate'` and `'deflate-raw'`. Passing `'brotli'` or `'zstd'` throws a `TypeError`: the browser can expand those formats in responses, but scripts can't use them yet.
