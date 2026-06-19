To understand how we got to modern tools like Fetch and Axios, we have to look at the "ancestors" of web data transfer. Here is a deeper dive into AJAX, XHR, and XML with practical examples.

---

## 1. XML (The Data Format)

XML was designed to be self-descriptive. Unlike HTML, which tells a browser how to **display** a button or a heading, XML tells the computer what the **data** actually represents.

**Example of XML data:**

```xml
<bookstore>
  <book category="programming">
    <title>Eloquent JavaScript</title>
    <author>Marijn Haverbeke</author>
    <price>25.00</price>
  </book>
</bookstore>
```

**The Problem:** To use this in JavaScript, you have to use complex "DOM parsing" methods (like `getElementsByTagName`) to extract the price. It’s tedious compared to JSON, where you just write `book.price`.

---

## 2. XMLHttpRequest (The Engine)

Before 2015, if you wanted to get data without refreshing the page, the `XMLHttpRequest` (XHR) object was your only choice. It is "event-based," meaning you have to listen for changes in the request's state.

**Example of an XHR Request:**

```javascript
const xhr = new XMLHttpRequest();

// Configure it: GET-request for the URL
xhr.open("GET", "https://api.example.com/data");

// SUCCESS: Triggered when the request completes successfully
xhr.onload = function () {
  if (xhr.status === 200) {
    // JSON.parse is correct here — despite the name "XMLHttpRequest", XHR is a
    // general-purpose HTTP mechanism. "XML" is historical baggage from its early
    // 2000s origins. Today it's almost always used to fetch JSON.
    // If you were fetching actual XML, you'd use xhr.responseXML instead.
    console.log("Success!", JSON.parse(xhr.response));
  } else {
    // This handles cases like 404 or 500
    console.error("Server returned an error:", xhr.status);
  }
};

// FAILURE: Triggered if the request couldn't be made at all
// (e.g., Network is down, DNS failure)
xhr.onerror = function () {
  console.error("Network Request Failed");
};

// PROGRESS: You can even track how much data has loaded
xhr.onprogress = function (event) {
  if (event.lengthComputable) {
    const percentComplete = (event.loaded / event.total) * 100;
    console.log(`Loaded: ${percentComplete}%`);
  }
};

xhr.send();
```

---

## 3. AJAX (The Technique)

AJAX is the **concept** of combining these tools to create a seamless user experience. It isn't a single "thing" you install; it’s a workflow.

**The AJAX Workflow:**

1.  **An Event Occurs:** A user clicks "Load More" or types in a search bar.
2.  **The Request:** JavaScript creates an XHR (or Fetch) object and sends a request to the server in the background.
3.  **The Server Processes:** The server sends back data (usually JSON these days).
4.  **The Update:** JavaScript receives the data and updates **only** the part of the page that needs to change (using the DOM).

---

## 4. Why we prefer Fetch/Axios over this

Even with `onload` and `onerror`, XHR has a major limitation: it doesn't support Promises.

If you wanted to get a User, then get their Posts, then get the Comments on those posts using XHR, you would have to nest these functions inside each other. This is known as **Callback Hell**:
