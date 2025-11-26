# Core HTTP Concepts for Frontend Engineers

## Table of Contents

1. [HTTP Basics](#1-http-basics)
2. [HTTP Methods (Verbs)](#2-http-methods-verbs)
3. [HTTP Status Codes](#3-http-status-codes)
4. [HTTP Headers](#4-http-headers)
5. [CORS (Cross-Origin Resource Sharing)](#5-cors-cross-origin-resource-sharing)
6. [HTTP Caching](#6-http-caching)
7. [Authentication & Security](#7-authentication--security)
8. [HTTP/2 vs HTTP/1.1](#8-http2-vs-http11)
9. [Frontend HTTP Libraries](#9-frontend-http-libraries)
10. [Base64 Encoding and File Uploads](#10-base64-encoding-and-file-uploads)
11. [Performance Optimization](#11-performance-optimization)
12. [Error Handling Patterns](#12-error-handling-patterns)
13. [Best Practices](#13-best-practices-for-frontend-engineers)

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

### What is CORS?

CORS is a security feature that controls which domains can access your API from a browser.

### Same-Origin Policy

- **Same Origin**: Same protocol, domain, and port
- **Cross-Origin**: Different protocol, domain, or port

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

## 9. Frontend HTTP Libraries

### Fetch API (Native)

```javascript
// Modern fetch API with async/await
async function fetchData() {
  try {
    const response = await fetch("/api/data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key: "value" }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}
```

### Axios (Popular Library)

```javascript
import axios from "axios";

// Request interceptor
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Usage
const response = await axios.get("/api/users");
const users = response.data;
```

### Comparison: Fetch vs Axios

| Feature                       | Fetch           | Axios        |
| ----------------------------- | --------------- | ------------ |
| Browser Support               | Modern browsers | All browsers |
| Request/Response Interceptors | ❌              | ✅           |
| Automatic JSON Parsing        | ❌              | ✅           |
| Request Cancellation          | AbortController | CancelToken  |
| Timeout Support               | Manual          | Built-in     |
| Bundle Size                   | 0KB             | ~13KB        |

---

## 10. Base64 Encoding and File Uploads

### What is Base64 Encoding?

**Base64** is a binary-to-text encoding scheme that converts binary data into an ASCII string format using a set of 64 characters. This encoding is particularly useful for transmitting binary data over media that are designed to handle text, such as email systems or web protocols.

### How Base64 Encoding Works

1. **Grouping Bits**: The binary data is divided into 24-bit groups
2. **Splitting into 6-Bit Segments**: Each 24-bit group is divided into four 6-bit segments
3. **Mapping to Characters**: Each 6-bit segment is mapped to a character from the Base64 alphabet

#### Base64 Character Set

```
A-Z (26 characters): A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
a-z (26 characters): a b c d e f g h i j k l m n o p q r s t u v w x y z
0-9 (10 characters): 0 1 2 3 4 5 6 7 8 9
Special (2 characters): + /
Padding: = (used when final group has fewer than 24 bits)
```

### Base64 Encoding Example

```javascript
// Encoding binary data to Base64
const binaryData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
const base64String = btoa(String.fromCharCode(...binaryData));
console.log(base64String); // "SGVsbG8="

// Decoding Base64 back to binary
const decodedData = atob(base64String);
console.log(decodedData); // "Hello"
```

### File Upload Methods

#### 1. Base64 Encoding in JSON

```javascript
// Converting file to Base64 for JSON transmission
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

// Upload file as Base64 in JSON
async function uploadFileAsBase64(file) {
  const base64Data = await fileToBase64(file);

  const response = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      data: base64Data,
    }),
  });

  return response.json();
}
```

#### 2. Multipart/Form-Data (Recommended for Large Files)

```javascript
// Using FormData for file uploads
async function uploadFileWithFormData(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("description", "Profile picture");

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData, // Don't set Content-Type header - browser sets it automatically
  });

  return response.json();
}

// Using Axios for file uploads
async function uploadWithAxios(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post("/api/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      console.log(`Upload Progress: ${percentCompleted}%`);
    },
  });

  return response.data;
}
```

### Base64 vs Multipart/Form-Data Comparison

| Aspect                | Base64 in JSON               | Multipart/Form-Data         |
| --------------------- | ---------------------------- | --------------------------- |
| **Size Overhead**     | ~33% increase                | Minimal overhead            |
| **Streaming**         | ❌ Must load entire file     | ✅ Supports streaming       |
| **Memory Usage**      | High (entire file in memory) | Low (chunked processing)    |
| **Large Files**       | ❌ Not suitable              | ✅ Handles large files well |
| **Browser Support**   | ✅ Universal                 | ✅ Universal                |
| **Server Processing** | Simple JSON parsing          | Requires multipart parser   |
| **Progress Tracking** | Manual implementation        | Built-in support            |

### When to Use Each Method

#### Use Base64 Encoding When:

- **Small files** (< 1MB)
- **Simple JSON APIs** that don't support multipart
- **Data URLs** for embedding images in HTML/CSS
- **Email attachments** or **API responses**
- **Authentication tokens** (JWT)

```javascript
// Example: Embedding image in HTML
const imageBase64 = await fileToBase64(imageFile);
const dataUrl = `data:${imageFile.type};base64,${imageBase64}`;
document.getElementById("preview").src = dataUrl;
```

#### Use Multipart/Form-Data When:

- **Large files** (> 1MB)
- **Binary data** (images, videos, PDFs)
- **Multiple files** in one request
- **Streaming uploads** with progress tracking
- **Production applications**

```javascript
// Example: Multiple file upload with progress
async function uploadMultipleFiles(files) {
  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append(`file_${index}`, file);
  });

  return axios.post("/api/upload-multiple", formData, {
    onUploadProgress: (progressEvent) => {
      const progress = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      updateProgressBar(progress);
    },
  });
}
```

### Security Considerations

#### Base64 Encoding

- **Not encryption**: Base64 is encoding, not encryption
- **Data visibility**: Base64 data is easily readable
- **Size increase**: 33% overhead can impact performance

#### File Upload Security

```javascript
// File validation
function validateFile(file) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];

  if (file.size > maxSize) {
    throw new Error("File too large");
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type");
  }

  return true;
}

// Secure file upload
async function secureFileUpload(file) {
  validateFile(file);

  const formData = new FormData();
  formData.append("file", file);

  return fetch("/api/secure-upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: formData,
  });
}
```

### Best Practices

1. **Choose the right method** based on file size and requirements
2. **Validate files** on both client and server
3. **Implement progress tracking** for better UX
4. **Handle errors gracefully** with proper error messages
5. **Use HTTPS** for secure file transmission
6. **Implement file size limits** to prevent abuse
7. **Sanitize file names** to prevent security issues

---

## 11. Performance Optimization

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

---

## 12. Error Handling Patterns

### Comprehensive Error Handling

```javascript
class ApiClient {
  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network or other errors
      throw new ApiError("Network error", 0);
    }
  }
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

// Usage
const apiClient = new ApiClient();
try {
  const data = await apiClient.request("/api/users");
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error ${error.status}: ${error.message}`);
  }
}
```

### Retry Logic

```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}
```

### Timeout Handling

```javascript
function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}
```

---

## 13. Best Practices for Frontend Engineers

### 1. Always Handle Errors

```javascript
// ❌ Don't do this
fetch("/api/data").then((response) => response.json());

// ✅ Do this
fetch("/api/data")
  .then((response) => {
    if (!response.ok) throw new Error("Request failed");
    return response.json();
  })
  .catch((error) => {
    console.error("API Error:", error);
    // Show user-friendly error message
  });
```

### 2. Use Proper HTTP Methods

- GET for retrieving data
- POST for creating resources
- PUT for complete updates
- PATCH for partial updates
- DELETE for removing resources

### 3. Implement Request Timeouts

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

fetch("/api/data", { signal: controller.signal }).finally(() =>
  clearTimeout(timeoutId)
);
```

### 4. Cache Strategically

```javascript
// Use appropriate cache headers
const response = await fetch("/api/data", {
  headers: {
    "Cache-Control": "max-age=3600",
  },
});

// Implement client-side caching
const cache = new Map();
async function getCachedData(key) {
  if (cache.has(key)) {
    return cache.get(key);
  }

  const data = await fetch(`/api/data/${key}`).then((r) => r.json());
  cache.set(key, data);
  return data;
}
```

### 5. Optimize for Mobile

```javascript
// Minimize request size
const compressedData = JSON.stringify(data);

// Handle network connectivity
if (!navigator.onLine) {
  // Show offline message or use cached data
  showOfflineMessage();
}

// Progressive loading
async function loadDataProgressively() {
  const criticalData = await fetch("/api/critical").then((r) => r.json());
  renderCriticalUI(criticalData);

  const additionalData = await fetch("/api/additional").then((r) => r.json());
  renderAdditionalUI(additionalData);
}
```

### 6. Security Best Practices

```javascript
// Sanitize user input
function sanitizeInput(input) {
  return input.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );
}

// Use HTTPS in production
const apiUrl =
  process.env.NODE_ENV === "production"
    ? "https://api.example.com"
    : "http://localhost:3000";

// Validate responses
function validateResponse(data, schema) {
  // Use a library like Joi or Yup for validation
  return schema.validate(data);
}
```

### 7. Monitor and Log

```javascript
// Log API calls for debugging
function logApiCall(url, method, status, duration) {
  console.log(`API ${method} ${url} - ${status} (${duration}ms)`);

  // Send to monitoring service
  if (window.analytics) {
    window.analytics.track("api_call", {
      url,
      method,
      status,
      duration,
    });
  }
}

// Usage
const startTime = Date.now();
const response = await fetch("/api/data");
const duration = Date.now() - startTime;
logApiCall("/api/data", "GET", response.status, duration);
```

---

## Summary

Understanding HTTP concepts is crucial for frontend engineers because:

1. **API Integration**: Most frontend applications consume REST APIs
2. **Performance**: Proper HTTP usage improves app performance
3. **User Experience**: Good error handling and caching enhance UX
4. **Security**: Understanding CORS, authentication, and HTTPS is essential
5. **Debugging**: HTTP knowledge helps troubleshoot network issues

### Key Takeaways:

- Always handle errors gracefully
- Use appropriate HTTP methods and status codes
- Implement proper caching strategies
- Understand CORS and security implications
- Optimize for performance and mobile devices
- Monitor and log API calls for debugging

### Next Steps:

- Practice implementing these concepts in real projects
- Learn about GraphQL as an alternative to REST
- Explore WebSockets for real-time communication
- Study advanced topics like HTTP/3 and QUIC protocol
