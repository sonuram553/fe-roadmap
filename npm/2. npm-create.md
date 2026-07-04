# npm create — Command Explained

`npm create` is a shorthand for `npm init` that runs a package initializer (a `create-*` package) without installing it permanently. It uses `npx` under the hood.

### How npm init relates to npx

In modern versions of npm, `npm init <name>` actually triggers `npx` under the hood. When you run:

```bash
npm init react-app
# or
npm create react-app
```

npm internally converts that to:

```bash
npx create-react-app
```

It looks for a package named `create-<name>`, downloads it temporarily, runs it to scaffold your project, then discards it.

---

## Syntax

```bash
npm create <initializer> [project-name] -- [options]
```

The `--` separates npm's own flags from the flags passed to the initializer.

---

## How npm create Resolves the Package

`npm create` automatically prepends `create-` to the initializer name:

```bash
npm create vite         →  npx create-vite
npm create vite@latest  →  npx create-vite@latest
npm create react-app    →  npx create-react-app
```

---

## Creating React with Vite

```bash
npm create vite@latest my-app -- --template react
```

**What happens step by step:**

1. `npm create vite@latest` → runs `npx create-vite@latest`
2. `my-app` → project folder name
3. `-- --template react` → passes `--template react` to `create-vite`

### Available React Templates

| Template | Description |
|---|---|
| `react` | React + JavaScript |
| `react-ts` | React + TypeScript |
| `react-swc` | React + JavaScript + SWC (faster compiler) |
| `react-swc-ts` | React + TypeScript + SWC |

### Interactive Mode

Omit the template flag and Vite prompts you to choose a framework and variant:

```bash
npm create vite@latest my-app
```

```
? Select a framework: › - Use arrow-keys. Return to submit.
❯   Vanilla
    Vue
    React
    ...

? Select a variant: › - Use arrow-keys. Return to submit.
❯   TypeScript
    TypeScript + SWC
    JavaScript
    JavaScript + SWC
```

### Skip Prompts with a Template Flag

```bash
# React + TypeScript, no prompts
npm create vite@latest my-app -- --template react-ts

# React + JavaScript, no prompts
npm create vite@latest my-app -- --template react
```

---

## Creating React with Webpack (Create React App)

```bash
npm create react-app my-app
```

CRA uses **webpack** internally (Babel + webpack + webpack-dev-server).

```bash
# TypeScript template
npm create react-app my-app -- --template typescript
```

> **Note:** CRA is no longer actively maintained. The React team now recommends Vite or framework-based setups (Next.js, Remix).

---

## npm create vs npx

These are equivalent:

```bash
npm create vite@latest my-app -- --template react
npx create-vite@latest my-app --template react
```

`npm create` is just a convenience wrapper — it prepends `create-` and forwards the rest to `npx`.

---

## Vite vs Create React App (Webpack)

| | Vite | Create React App (Webpack) |
|---|---|---|
| Bundler | Vite (esbuild + Rollup) | Webpack |
| Dev server start | ~300ms | 10–30s |
| HMR speed | Near instant | Slower on large apps |
| Config file | `vite.config.js` | Ejected or via CRACO |
| Maintenance | Active | Unmaintained |

---

## Summary

- `npm create` = `npm init` = runs a `create-*` package via `npx`
- Use `@latest` to always get the newest version
- Pass `-- --template <name>` to skip interactive prompts
- Prefer **Vite** over CRA for new React projects
