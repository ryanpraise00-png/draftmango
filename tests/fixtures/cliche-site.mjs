// A deliberately clichéd React site used to prove the design checks catch common AI tells.
export const clicheSite = {
  'src/main.jsx': "import React from 'react';\nimport {createRoot} from 'react-dom/client';\nimport App from './App.jsx';\nimport './styles.css';\ncreateRoot(document.getElementById('root')).render(<App />);\n",
  'src/App.jsx': `export default function App() {
  return <main>
    <section className="hero"><h1 className="grad">Unleash Next-Level Gaming</h1><p>Welcome to Dreadbyte Studios, where we elevate seamless, cutting-edge experiences.</p><a className="cta" href="#games">Explore 🚀</a></section>
    <section className="stats"><div><b>10M+</b> players</div><div><b>50+</b> games</div><div><b>★★★★★</b> rated</div></section>
    <section className="cards" id="games">{['🎮 Play','🔥 Hot','⚡ Fast'].map(t => <article key={t} className="card"><h2>{t}</h2><p>Lorem ipsum dolor sit amet.</p></article>)}</section>
    <section className="reveal"><h2>Hidden until scroll</h2><p>This never appears.</p></section>
    <div className="wide">This box is wider than the screen.</div>
    <p className="faint">Barely readable grey text on white.</p>
  </main>;
}
`,
  'src/styles.css': `body{margin:0;font-family:Arial,sans-serif;background:#fff}
.hero{padding:120px 24px;text-align:center;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff}
.grad{background:linear-gradient(90deg,#fff,#c084fc);-webkit-background-clip:text;background-clip:text;color:transparent;font-size:64px}
.cta{display:inline-block;padding:12px 24px;border-radius:999px;background:rgba(255,255,255,.2);backdrop-filter:blur(10px);color:#fff;transition:all .3s;box-shadow:0 0 40px #a855f7}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:40px}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:40px}
.card{padding:24px;border-radius:24px;background:rgba(255,255,255,.1);backdrop-filter:blur(12px);box-shadow:0 0 30px #8b5cf6}
.reveal{opacity:0}
.wide{width:1800px;background:#eee}
.faint{color:#d0d0d0}
`
};
