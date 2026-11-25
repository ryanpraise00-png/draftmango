"use client";
import {useEffect} from "react";

// Runs the licensed template interaction scripts under Draftmango branding (entrance effects, header, tabs, marquees,
// Alpine, counters) on a page whose markup comes from a Draftmango template.
// The scripts change classes and text in place, so they load only after React
// has hydrated the page; loading them earlier causes hydration mismatches.
const added = new Map();
function add(src) {
  if (!added.has(src)) added.set(src, new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => { added.delete(src); script.remove(); reject(new Error("Could not load " + src)); };
    document.body.appendChild(script);
  }));
  return added.get(src);
}

// main.js starts its features on DOMContentLoaded, which has already fired by the
// time it loads here. While it runs, a DOMContentLoaded listener is called at once.
async function addMain(src) {
  if (added.has(src)) return added.get(src);
  const original = document.addEventListener;
  document.addEventListener = function (type, listener, options) {
    if (type === "DOMContentLoaded") { queueMicrotask(() => listener.call(document, new Event(type))); return; }
    return original.call(this, type, listener, options);
  };
  try { await add(src); } finally { document.addEventListener = original; }
}

export default function DraftmangoRuntime({demo}) {
  useEffect(() => {
    (async () => {
      await add("/draftmango/assets/js/entrance.js");
      await add("/draftmango/assets/js/vendor.js");
      await addMain("/draftmango/assets/js/main.js");
      if (demo) await add(demo);
    })().catch(error => {
      // Without the scripts the page still reads correctly: show every entrance-animated element.
      console.error(error);
      document.querySelectorAll("[data-anim]").forEach(el => el.classList.add("visible", "anim-done"));
    });
  }, [demo]);
  return null;
}
