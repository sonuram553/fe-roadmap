# React StrictMode demo

A runnable version of [lesson 11](../../11-monaco-in-react.md) §2 and §3: the same Monaco component written without and with a `useEffect` cleanup, side by side, under React's `StrictMode`.

```bash
npm install
npm run dev
```

On load, the left box holds two editors stacked on top of each other, and the console shows `Element already has context attribute: box`. The right box holds one.

Then click **Unmount both** and **Mount both again** a few times and watch "Editors alive on the page". Each mount/unmount cycle leaves two more editors behind from the left component, even though its box is gone from the page:

```
initial      editors 3, models 3
unmount      editors 2, models 2
mount        editors 5, models 5
unmount      editors 4, models 4
mount        editors 7, models 7
```

To see that StrictMode only makes the bug visible and doesn't cause it, remove `<StrictMode>` in `src/main.jsx`. The left box then shows one editor, but the unmount/mount button still leaks one editor per cycle.
