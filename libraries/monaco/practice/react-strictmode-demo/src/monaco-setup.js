// Same worker setup as lesson 1 §2, cut down to the general worker:
// this demo only uses SQL, which needs no specialist worker.
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';

self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  },
};

export { monaco };
