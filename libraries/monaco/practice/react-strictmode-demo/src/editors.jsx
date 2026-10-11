import { useEffect, useRef } from 'react';
import { monaco } from './monaco-setup.js';

// Lesson 11 §2: no cleanup. Under StrictMode the effect runs twice,
// so this box ends up with two editors in it.
export function NaiveEditor({ id }) {
  const boxRef = useRef(null);
  useEffect(() => {
    monaco.editor.create(boxRef.current, { value: 'SELECT 1;', language: 'sql' });
  }, []);
  return <div id={id} ref={boxRef} className="box" />;
}

// Lesson 11 §3: same thing, plus a cleanup that disposes the editor.
export function FixedEditor({ id }) {
  const boxRef = useRef(null);
  useEffect(() => {
    const editor = monaco.editor.create(boxRef.current, { value: 'SELECT 1;', language: 'sql' });
    return () => editor.dispose();
  }, []);
  return <div id={id} ref={boxRef} className="box" />;
}
