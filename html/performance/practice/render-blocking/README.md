# Render-blocking test

A runnable version of [lesson 1](../../01-render-blocking-and-first-paint.md) §1. Priya's page is loaded three ways: with nothing extra, with a stylesheet in `<head>`, and with a script in `<head>`. The server holds the stylesheet or script back for one second before sending it, and each page reports two times: when it first painted (FCP) and when DOMContentLoaded fired.

There's nothing to install:

```bash
cd html/performance/practice/render-blocking
npm start
```

Open http://localhost:8766 and pick a page. For `/stylesheet` the screen stays white for a second, and then the page appears with its own numbers printed under the paragraph:

```
FCP               1016 ms
DOMContentLoaded  10 ms
```

Add `?d=3000` to any page to hold its resource back for three seconds instead. The terminal logs every request, and when the held one was finally sent:

```
   1314 ms  GET /stylesheet
   1320 ms  GET /slow.css?d=1000
   2322 ms  sent /slow.css after 1000 ms
```

`server.js` holds the server and the page. The measuring is done by the small inline script at the top of `<head>`. It sits above the stylesheet or script being tested, so it runs straight away instead of waiting for them. §3 of the lesson explains why a script placed below the stylesheet would wait.
