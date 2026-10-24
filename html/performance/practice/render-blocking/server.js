// The test server for 01-render-blocking-and-first-paint.md §1.
// Run:  npm start   (nothing to install for this part)
// Then open http://localhost:8766

const http = require("node:http");

const PORT = 8766;

// The three versions of Priya's page. Each one gets the delay, so
// /stylesheet?d=3000 holds its stylesheet back for three seconds.
const CASES = {
  none: () => "",
  stylesheet: (d) => `<link rel="stylesheet" href="/slow.css?d=${d}">`,
  script: (d) => `<script src="/slow.js?d=${d}"></script>`,
};

function page(extra) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Priya's Plants</title>
  <script>
    // This sits above the extra resource, so it runs straight away and never
    // waits for it (§3). Both numbers are ms since the navigation started.
    const fcp = new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entry = list.getEntriesByName("first-contentful-paint")[0];
        if (entry) resolve(entry.startTime);
      }).observe({ type: "paint", buffered: true });
    });
    const dcl = new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", () => {
        resolve(performance.getEntriesByType("navigation")[0].domContentLoadedEventStart);
      });
    });
    Promise.all([fcp, dcl]).then(([fcp, dcl]) => {
      document.body.insertAdjacentHTML(
        "beforeend",
        "<pre>FCP               " + Math.round(fcp) + " ms\\n" +
        "DOMContentLoaded  " + Math.round(dcl) + " ms</pre>"
      );
    });
  </script>
  ${extra}
</head>
<body>
  <h1>Priya's Plants</h1>
  <p>Monstera, fiddle-leaf figs and a great many cacti.</p>
</body>
</html>`;
}

function index() {
  const links = Object.keys(CASES)
    .map((name) => `<li><a href="/${name}">/${name}</a></li>`)
    .join("\n");
  return `<!doctype html>
<meta charset="utf-8">
<title>Render-blocking demo</title>
<p>Each page reports its own FCP and DOMContentLoaded. Add <code>?d=3000</code> to hold the resource back for longer.</p>
<ul>
${links}
</ul>`;
}

const started = Date.now();
const log = (msg) => console.log(`${String(Date.now() - started).padStart(7)} ms  ${msg}`);

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const delay = Number(url.searchParams.get("d") ?? 1000);
  log(`GET ${req.url}`);

  const send = (type, body) => {
    // no-store, so a reload holds the resource back again instead of
    // taking it from the cache.
    res.writeHead(200, { "Content-Type": `${type}; charset=utf-8`, "Cache-Control": "no-store" });
    res.end(body);
  };
  const sendLater = (type, body) => {
    setTimeout(() => {
      log(`sent ${url.pathname} after ${delay} ms`);
      send(type, body);
    }, delay);
  };

  const name = url.pathname.slice(1);
  if (url.pathname === "/") return send("text/html", index());
  if (Object.hasOwn(CASES, name)) return send("text/html", page(CASES[name](delay)));
  if (url.pathname === "/slow.css") return sendLater("text/css", "h1 { color: seagreen; }");
  if (url.pathname === "/slow.js") return sendLater("text/javascript", "console.log('slow.js ran');");

  res.writeHead(404).end();
}).listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
