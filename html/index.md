Here are 20 HTML questions that commonly come up at the senior level — these tend to focus less on basic syntax and more on semantics, performance, accessibility, and browser behavior, since that's what differentiates senior candidates.

Glossary: [glossary.md](glossary.md)

**Semantics & Structure** — notes: [overview](semantics/01-semantics-and-structure.md) · [sectioning elements](semantics/02-sectioning-elements.md) · [text-level semantics](semantics/03-text-level-semantics.md) · [a11y & SEO](semantics/04-semantics-for-a11y-and-seo.md)
1. What's the difference between `<div>`/`<span>` and semantic elements like `<article>`, `<section>`, `<aside>`? When would you use `<section>` vs `<div>`?
2. What's the difference between `<article>` and `<section>`? Can they be nested?
3. Why does semantic HTML matter for SEO and accessibility, beyond just "best practice"?
4. When would you use `<b>` vs `<strong>`, or `<i>` vs `<em>`? What's actually different under the hood?

**Forms**
5. How does form validation work natively (required, pattern, min/max) vs. via JS? What are the pros/cons of relying on native validation?
6. What's the difference between `<button type="submit">`, `type="button"`, and `type="reset"`? What happens if you omit `type` inside a `<form>`?
7. How do you handle accessible labeling for form inputs (`<label for>` vs wrapping vs `aria-label`)?

**Performance & Loading**
8. Difference between `async` and `defer` on `<script>` tags, and how each affects parsing/execution order.
9. How does the browser's preload scanner work, and how do `<link rel="preload">`, `preconnect`, and `prefetch` differ?
10. How does lazy loading images work natively (`loading="lazy"`), and what are its limitations?
11. What's the impact of render-blocking resources (CSS in `<head>`, synchronous scripts) on First Contentful Paint?

**Accessibility (a11y)**
12. How do ARIA roles/attributes interact with native HTML semantics? When should you *not* use ARIA ("no ARIA is better than bad ARIA")?
13. How do you make a custom component (like a dropdown or modal) keyboard-accessible and screen-reader friendly using HTML/ARIA?
14. What's the accessibility tree, and how does it differ from the DOM?

**Browser Rendering & Parsing**
15. Walk through what happens between the browser receiving HTML and painting the page (parsing, DOM construction, CSSOM, render tree, layout, paint).
16. How does the browser handle malformed/invalid HTML (tag soup, unclosed tags)? What's the error-recovery algorithm roughly doing?
17. What's the difference between `iframe` sandboxing attributes, and what security risks do iframes introduce (clickjacking, etc.)?

**Metadata & Misc**
18. What's the purpose of the `<meta viewport>` tag, and what happens without it on mobile?
19. How do `data-*` attributes work, and when would you prefer them over classes or other means of storing state in the DOM?
20. What's the Shadow DOM, and how does it relate to native HTML (e.g. how `<video>` controls or `<input type="date">` are implemented)?

A few of these (15, 16, 20) tend to be the ones that actually separate senior candidates from mid-level — interviewers use them to probe whether you understand *why* HTML behaves the way it does, not just what the tags do.

Want me to go deeper on any of these — like a full explanation of the rendering pipeline (#15), or a mock Q&A format you can rehearse with?