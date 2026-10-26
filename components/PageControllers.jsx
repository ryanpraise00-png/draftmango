'use client';
import {useEffect, useState} from 'react';

// Interop boundary while the established editor/account controllers are migrated
// to hooks. Each route has a separate document layout, so navigation tears them down.
const loaded = new Map();
function load(src) {
  if (!loaded.has(src)) loaded.set(src, new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => { loaded.delete(src); script.remove(); reject(new Error('Unable to load this page. Please reload.')); };
    document.body.appendChild(script);
  }));
  return loaded.get(src);
}
export default function PageControllers({scripts}) {
  const [error, setError] = useState('');
  const signature = JSON.stringify(scripts);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const src of JSON.parse(signature)) { if (cancelled) return; await load(src); }
    })().catch(error => { if (!cancelled) setError(error.message); });
    return () => { cancelled = true; };
  }, [signature]);
  return error ? <p role="alert">{error} <button onClick={() => location.reload()}>Reload</button></p> : null;
}
