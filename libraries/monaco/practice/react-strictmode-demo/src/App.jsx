import { useEffect, useState } from 'react';
import { monaco } from './monaco-setup.js';
import { NaiveEditor, FixedEditor } from './editors.jsx';

// Re-reads the numbers twice a second, so they stay current
// without the editors having to report anything.
function useCounts() {
  const read = () => ({
    naiveBox: document.querySelectorAll('#naive > .monaco-editor').length,
    fixedBox: document.querySelectorAll('#fixed > .monaco-editor').length,
    editors: monaco.editor.getEditors().length,
    models: monaco.editor.getModels().length,
  });
  const [counts, setCounts] = useState(read);
  useEffect(() => {
    const timer = setInterval(() => setCounts(read()), 500);
    return () => clearInterval(timer);
  }, []);
  return counts;
}

export function App() {
  const [shown, setShown] = useState(true);
  const counts = useCounts();

  return (
    <main>
      <h1>Monaco in React: the StrictMode double mount</h1>
      <p>
        Both components create an editor in <code>useEffect</code>. Only the right one disposes it in a cleanup. Open
        the console to see Monaco complain about the left one.
      </p>

      <button onClick={() => setShown((s) => !s)}>{shown ? 'Unmount both' : 'Mount both again'}</button>

      <p className="totals">
        Editors alive on the page: <strong>{counts.editors}</strong> · Models alive: <strong>{counts.models}</strong>
      </p>

      <div className="columns">
        <section>
          <h2>NaiveEditor (no cleanup)</h2>
          <p>
            Editors in this box: <strong className={counts.naiveBox > 1 ? 'bad' : ''}>{counts.naiveBox}</strong>
          </p>
          {shown && <NaiveEditor id="naive" />}
        </section>

        <section>
          <h2>FixedEditor (disposes in cleanup)</h2>
          <p>
            Editors in this box: <strong>{counts.fixedBox}</strong>
          </p>
          {shown && <FixedEditor id="fixed" />}
        </section>
      </div>
    </main>
  );
}
