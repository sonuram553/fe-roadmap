# Core HTTP Concepts

## Table of Contents

1. [HTTP Basics](#1-http-basics)
2. [HTTP Methods (Verbs)](#2-http-methods-verbs)
3. [HTTP Status Codes](#3-http-status-codes)
4. [HTTP Headers](#4-http-headers)
5. [CORS (Cross-Origin Resource Sharing)](#5-cors-cross-origin-resource-sharing)
6. [HTTP Caching](#6-http-caching)
7. [Authentication & Security](#7-authentication--security)
8. [HTTP/2 vs HTTP/1.1](#8-http2-vs-http11)
9. [Performance Optimization](#9-performance-optimization)

---

## 1. HTTP Basics

### What is HTTP?

**HTTP (HyperText Transfer Protocol)** is the foundation of data communication on the web. It's a request-response protocol that allows clients (browsers) to communicate with servers.

### Key Characteristics:

- **Stateless**: Each request is independent; server doesn't remember previous requests
- **Request-Response**: Client sends request → Server sends response
- **Application Layer**: Works on top of TCP/IP
- **Text-based**: Human-readable protocol

### HTTP Request Structure

```
GET /api/users/123 HTTP/1.1
Host: api.example.com
Content-Type: application/json
Authorization: Bearer token123

{
  "name": "John Doe"
}
```

### HTTP Response Structure

```
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: max-age=3600

{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com"
}
```

---

## 2. HTTP Methods (Verbs)

### GET

- **Purpose**: Retrieve data from server
- **Characteristics**: Idempotent, cacheable, no request body (technically possible but not recommended)
- **Use cases**: Fetching user data, fetching posts

### POST

- **Purpose**: Create new resources or submit data
- **Characteristics**: Not idempotent, not cacheable, has request body
- **Use cases**: User registration, form submissions, file uploads

### PUT

- **Purpose**: Update/replace entire resource
- **Characteristics**: Idempotent, not cacheable, has request body
- **Use cases**: Updating user profile, replacing content

### PATCH

- **Purpose**: Partial update of resource
- **Characteristics**: Not idempotent, not cacheable, has request body
- **Use cases**: Updating specific fields

### DELETE

- **Purpose**: Remove resource
- **Characteristics**: Idempotent, not cacheable, no request body
- **Use cases**: Deleting users, removing posts

### Method Comparison

| Method | Idempotent | Safe | Cacheable | Request Body |
| ------ | ---------- | ---- | --------- | ------------ |
| GET    | ✅         | ✅   | ✅        | ❌           |
| POST   | ❌         | ❌   | ❌        | ✅           |
| PUT    | ✅         | ❌   | ❌        | ✅           |
| PATCH  | ❌         | ❌   | ❌        | ✅           |
| DELETE | ✅         | ❌   | ❌        | ❌           |

---

## 3. HTTP Status Codes

### 2xx Success

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **204 No Content**: Success but no content to return

### 3xx Redirection

- **301 Moved Permanently**: Resource moved permanently
- **302 Found**: Temporary redirect
- **304 Not Modified**: Resource not changed (caching)

### 4xx Client Error

- **400 Bad Request**: Invalid request syntax
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Access denied
- **404 Not Found**: Resource doesn't exist
- **429 Too Many Requests**: Rate limiting

### 5xx Server Error

- **500 Internal Server Error**: Server error
- **502 Bad Gateway**: Invalid response from upstream
- **503 Service Unavailable**: Server temporarily unavailable

---

## 4. HTTP Headers

### Request Headers

```javascript
// Common request headers
const headers = {
  "Content-Type": "application/json",
  Authorization: "Bearer token123",
  Accept: "application/json",
  "User-Agent": "MyApp/1.0",
  "Cache-Control": "no-cache",
  "X-Requested-With": "XMLHttpRequest",
};

fetch("/api/data", { headers });
```

### Response Headers

```javascript
// Common response headers
{
  'Content-Type': 'application/json',
  'Cache-Control': 'max-age=3600',
  'Set-Cookie': 'sessionId=abc123',
  'Access-Control-Allow-Origin': '*',
  'ETag': '"abc123"',
  'Last-Modified': 'Wed, 21 Oct 2015 07:28:00 GMT'
}
```

### Important Header Categories

#### Content Headers

- `Content-Type`: MIME type of the body
- `Content-Length`: Size of the body in bytes
- `Content-Encoding`: Compression used (gzip, deflate)

#### Authentication Headers

- `Authorization`: Credentials for authentication
- `WWW-Authenticate`: Authentication challenge

#### Caching Headers

- `Cache-Control`: Caching directives
- `ETag`: Entity tag for cache validation
- `Last-Modified`: When resource was last changed

---

## 5. CORS (Cross-Origin Resource Sharing)


CORS is a security feature that controls which hosts can access your API from a browser.

### Same-Origin Policy

- **Same Origin**: Same protocol, host, and port
- **Cross-Origin**: Different protocol, host, or port

### Host vs Domain

- **Host**: The full address used to reach a server — includes the domain (or IP) plus an optional port, e.g. `api.example.com:8080`. This is what goes in the `Host` header and is what Same-Origin Policy actually compares (domain + port).
- **Domain**: Just the registered name, e.g. `example.com`. A domain can have many hosts/subdomains (`api.example.com`, `www.example.com`), all sharing the same domain but counting as different origins.
- Domains aren't always `name.com` — the TLD/suffix can itself be multi-part, e.g. `example.co.uk` (registrable domain is `example.co.uk`, not just `co.uk`).

### CORS Headers

```javascript
// Server response headers
{
  'Access-Control-Allow-Origin': 'https://myapp.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400'
}
```

### Preflight Requests

For complex requests (POST with custom headers), browsers send an OPTIONS request first:

```javascript
// This triggers a preflight request
fetch("/api/data", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Custom-Header": "value",
  },
  body: JSON.stringify({ data: "test" }),
});
```

### CORS Error Handling

```javascript
fetch("/api/data")
  .then((response) => response.json())
  .catch((error) => {
    if (error.name === "TypeError" && error.message.includes("CORS")) {
      console.error("CORS error: Check server configuration");
    }
  });
```

---

## 6. HTTP Caching

### Cache-Control Headers

```javascript
// Server sets cache headers
res.setHeader("Cache-Control", "max-age=3600"); // Cache for 1 hour
res.setHeader("ETag", '"abc123"'); // Entity tag for validation
res.setHeader("Last-Modified", "Wed, 21 Oct 2015 07:28:00 GMT");
```

### Cache Directives

- `max-age=3600`: Cache for 1 hour
- `no-cache`: Must revalidate with server
- `no-store`: Don't cache at all
- `private`: Only cache in browser, not in proxies
- `public`: Can cache in any cache

### Browser Caching Strategies

```javascript
// Service Worker caching example
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    })
  );
});
```

### Cache Validation

```javascript
// Conditional requests with ETag
fetch("/api/data", {
  headers: {
    "If-None-Match": '"abc123"',
  },
}).then((response) => {
  if (response.status === 304) {
    // Use cached version
    return cachedData;
  }
  return response.json();
});
```

---

## 7. Authentication & Security

### JWT (JSON Web Tokens)

```javascript
// Sending JWT in Authorization header
const token = localStorage.getItem("token");
fetch("/api/protected", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### Session-based Authentication

```javascript
// Cookies are automatically sent with requests
fetch("/api/protected", {
  credentials: "include", // Include cookies
});
```

### HTTPS

- **Purpose**: Encrypts data in transit
- **SSL/TLS**: Provides encryption and authentication
- **Mixed Content**: HTTP resources blocked on HTTPS pages

### Security Headers

```javascript
// Important security headers
{
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block'
}
```

---

## 8. HTTP/2 vs HTTP/1.1

### HTTP/1.1 Limitations

- **Head-of-line blocking**: One slow request blocks others
- **Multiple connections**: Browsers open 6-8 connections per domain
- **No compression**: Headers sent in plain text
- **No server push**: Server can't proactively send resources

### HTTP/2 Improvements

- **Multiplexing**: Multiple requests over single connection
- **Header compression**: HPACK algorithm
- **Server push**: Server can send resources proactively
- **Binary protocol**: More efficient than text-based
- **Stream prioritization**: Important requests get priority

### Frontend Implications

```javascript
// HTTP/2 allows more concurrent requests
// No need to bundle resources as aggressively
// Server push can preload critical resources

// Example: Server push for critical CSS
// Server can push CSS file before HTML requests it
```

---

## 9. Performance Optimization

### Request Optimization

```javascript
// Debouncing API calls
const debouncedSearch = debounce(async (query) => {
  const response = await fetch(`/api/search?q=${query}`);
  const results = await response.json();
  updateResults(results);
}, 300);

// Request cancellation
const controller = new AbortController();
fetch("/api/data", { signal: controller.signal });
// Cancel if component unmounts
controller.abort();
```

### Response Optimization

```javascript
// Streaming responses for large data
const response = await fetch("/api/large-data");
const reader = response.body.getReader();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  // Process chunk of data
  processChunk(value);
}
```

### Connection Pooling

```javascript
// Keep-alive connections
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
});

fetch("/api/data", { agent: keepAliveAgent });
```

### Request Batching

```javascript
// Batch multiple requests
const requests = [
  fetch("/api/users"),
  fetch("/api/posts"),
  fetch("/api/comments"),
];

const responses = await Promise.all(requests);
const [users, posts, comments] = await Promise.all(
  responses.map((r) => r.json())
);
```

