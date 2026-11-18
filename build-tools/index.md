# Build tool lessons

A beginner-to-intermediate course on frontend build tools: what they do, and how to use the two you are most likely to meet, webpack and Vite. Written against webpack 5.112 and Vite 8.3 on Node 22, with Chrome 157. Every output quoted in the lessons comes from actually running the code.

The lessons follow Neha building a small expense tracker, first with no build tool at all, then with webpack, then with Vite. From lesson 7 on, each topic is shown in both tools. They build on each other, so read them in order.

**Beginner**

1. [Why build tools exist](01-why-build-tools.md): script tags and globals, native modules, bare package names, the request waterfall, JSX and TypeScript, the jobs a build tool does
2. [A first webpack build](02-first-webpack-build.md): installing, zero config, `webpack.config.js`, what's inside a bundle, production mode, watch mode
3. [Loaders: teaching webpack other file types](03-webpack-loaders.md)
4. [Plugins and the dev server](04-webpack-plugins-and-dev-server.md)
5. [A first Vite project](05-first-vite-project.md)

**Intermediate**

6. [Why Vite's dev server starts fast](06-why-vite-starts-fast.md)
7. [Code splitting and lazy loading](07-code-splitting.md)
8. [Tree shaking and side effects](08-tree-shaking.md)
9. [Content hashes and caching](09-hashes-and-caching.md)
10. [Source maps](10-source-maps.md)
11. [Environment variables and modes](11-env-variables-and-modes.md)
12. [TypeScript and JSX: translating is not checking](12-typescript-and-jsx.md)
13. [Writing your own plugin](13-writing-a-plugin.md)
