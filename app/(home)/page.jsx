// Draftmango home page, built from the Draftmango SaaS Automation home page (demo-automation-1).
// Markup and classes follow the template; Draftmango's scripts run it (see DraftmangoRuntime).
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import IdeaComposer from "../../components/IdeaComposer";
import Contours from "../../components/Contours";
import DraftmangoRuntime from "../../components/DraftmangoRuntime";

const muted = "font-medium text-(--custom-meta)";
const pad = "p-[clamp(1.25rem,0.9rem_+_1vw,1.75rem)]";

function Glyph({icon, colour, size = "", brand = false, className = ""}) {
  return <span className={"custom-glyph" + (size ? " custom-glyph--" + size : "") + (brand ? " custom-glyph--brand" : "") + (className ? " " + className : "")} style={colour ? {"--custom-glyph": colour} : undefined}><i className={"ph-bold " + icon}></i></span>;
}
function Node({icon, colour, brand, title, meta, ai, className = ""}) {
  return <li className={"custom-node" + (className ? " " + className : "")}>
    <Glyph icon={icon} colour={colour} brand={brand} />
    <span className="grid gap-[0.1875rem] min-w-0"><b className="custom-node-title">{title}{ai && <> <span className="custom-node-ai">AI</span></>}</b><span className="custom-node-meta">{meta}</span></span>
  </li>;
}

/* ---------- Hero ---------- */
function Hero() {
  return <section id="au-hero" className="custom-section isolate overflow-clip pt-[calc(var(--header-h,5rem)_+_clamp(2.5rem,1rem_+_3.4vw,4.5rem))]" aria-labelledby="au-hero-title">
    <div className="glow-field" aria-hidden="true"><div className="glow custom-hero-glow -top-40 -left-64"></div></div>
    <Contours className="custom-hero-contours" />
    <div className="container">
      <div className="grid justify-items-center max-w-240 mx-auto text-center">
        <h1 id="au-hero-title" className="m-0 text-[clamp(3rem,1.2rem_+_6.4vw,6rem)] font-bold leading-none tracking-[-0.045em] text-balance" data-anim="fade-up" data-anim-delay="100" data-anim-duration="1200">
          Your next website, <span className={muted}>made</span>{" "}
          <span className="custom-hero-word relative inline-block">yours.<svg className="custom-hero-underline absolute left-[0.04em] top-full w-[78%] h-auto mt-[-0.02em] overflow-visible svg-draw" data-anim="" viewBox="0 0 240 28" fill="none" aria-hidden="true">
            <path pathLength="1" d="M3 6H146a8 8 0 0 1 8 8a8 8 0 0 0 8 8H224" />
            <circle pathLength="1" cx="231" cy="22" r="4.5" />
          </svg></span>
        </h1>
        <p className="max-w-144 mt-[clamp(2rem,1.6rem_+_1.4vw,2.75rem)] mb-0 mx-0 text-[clamp(1.125rem,1.05rem_+_0.3vw,1.25rem)] leading-[1.55] text-soft text-pretty" data-anim="fade-up" data-anim-delay="220">Describe your business, work through your ideas with AI, and shape a website that feels like you.</p>
        <div className="dm-hero-composer" data-anim="fade-up" data-anim-delay="320"><IdeaComposer /></div>
      </div>

      {/* The stage: one project, one request after another (home-flow.js plays it) */}
      <div className="relative mt-[clamp(3rem,1.5rem_+_3vw,4rem)]" data-anim="fade-up" data-anim-delay="460">
        <div className="custom-panel custom-hero-stage overflow-hidden" data-flow="" role="img" aria-label="A Draftmango project at work: you send a request, Draftmango reads your design and drafts the changes, then either asks you to review them or saves a new version.">
          <div className="custom-flow-bar" aria-hidden="true">
            <Glyph icon="ph-browser" size="24" className="custom-flow-mark" />
            <span className="custom-flow-name"><b>Halden Studio</b><span>Architecture studio website</span></span>
            <span className="custom-status custom-status--ok custom-flow-live">Draft</span>
            <span className="custom-flow-runs inline-flex items-baseline gap-2 ml-auto max-md:ml-0 text-(--custom-on-dark-meta) max-md:w-full">Versions saved <b className="min-w-[4.5ch] text-[0.9375rem] font-semibold text-(--custom-on-dark) text-end" data-flow-count="">11</b></span>
          </div>
          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="custom-flow relative my-[clamp(2rem,1rem_+_2vw,2.75rem)] mx-[clamp(1.25rem,0.5rem_+_2vw,2rem)] max-md:mt-6 max-md:mb-5 max-md:mx-4" aria-hidden="true">
              <svg className="block max-md:hidden w-full h-auto aspect-[784/306] overflow-visible" viewBox="0 0 784 306" fill="none" preserveAspectRatio="none">
                {[[2, "M176 54H208", true], [3, "M384 54H416", true], [4, "M504 80V162", true], [5, "M560 182H578c6 0 10-4 10-10V130c0-6 4-10 10-10H612", false], [6, "M560 182H578c6 0 10 4 10 10V234c0 6 4 10 10 10H612", true]].map(([n, d, done]) =>
                  <g key={n} className={"custom-wire" + (done ? " is-done" : "")} data-flow-wire={n}><path d={d} /><path className="custom-wire-pulse" pathLength="1" d={d} /></g>)}
              </svg>
              <ol className="custom-flow-nodes absolute max-md:static inset-0 m-0 p-0 max-md:pt-6 list-none text-[length:max(12px,calc(var(--u)_*_13))] max-md:text-[0.8125rem] max-md:grid max-md:gap-11">
                <li className="custom-node is-ok" data-flow-node="1" style={{"--x": 0, "--y": 54}}>
                  <span className="custom-node-tag absolute bottom-[calc(100%_+_0.5rem)] left-0 max-md:bottom-[calc(100%_+_0.375rem)] inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold tracking-[0.06em] uppercase text-(--custom-on-dark-meta)">You ask</span>
                  <Glyph icon="ph-chat-circle-text" colour="#5b5bd6" />
                  <span className="grid gap-[0.1875rem] min-w-0"><b className="custom-node-title">Your request</b><span className="custom-node-meta">Conversation</span></span>
                  <span className="custom-status custom-status--ok custom-node-state" data-flow-state="">Sent</span>
                </li>
                <li className="custom-node is-ok" data-flow-node="2" style={{"--x": 208, "--y": 54}}>
                  <Glyph icon="ph-squares-four" colour="#0f9488" />
                  <span className="grid gap-[0.1875rem] min-w-0"><b className="custom-node-title">Read the design</b><span className="custom-node-meta">Your website</span></span>
                  <span className="custom-status custom-status--ok custom-node-state" data-flow-state="">Read</span>
                </li>
                <li className="custom-node is-ok" data-flow-node="3" style={{"--x": 416, "--y": 54}}>
                  <Glyph icon="ph-sparkle" brand />
                  <span className="grid gap-[0.1875rem] min-w-0"><b className="custom-node-title">Draft changes <span className="custom-node-ai">AI</span></b><span className="custom-node-meta">Draftmango</span></span>
                  <span className="custom-status custom-status--ok custom-node-state" data-flow-state="">3 sections</span>
                </li>
                <li className="custom-node custom-node--path is-ok rounded-pill bg-(--custom-ink-3) max-md:py-2" data-flow-node="4" style={{"--x": 448, "--y": 182}}>
                  <Glyph icon="ph-git-fork" size="24" className="custom-glyph--plain" />
                  <span className="grid gap-[0.1875rem] min-w-0"><b className="custom-node-title">Needs review?</b></span>
                  <span className="custom-node-exit absolute py-[0.0625rem] px-1.5 text-[length:max(10px,calc(var(--u)_*_11))] font-semibold text-(--custom-on-dark-meta) bg-(--custom-ink) rounded-xs max-md:hidden custom-node-exit--yes">Yes</span>
                  <span className="custom-node-exit absolute py-[0.0625rem] px-1.5 text-[length:max(10px,calc(var(--u)_*_11))] font-semibold text-(--custom-on-dark-meta) bg-(--custom-ink) rounded-xs max-md:hidden top-[calc(100%_+_18_*_var(--u))]">No</span>
                </li>
                <li className="custom-node custom-node--branch max-md:ml-11" data-flow-node="5" style={{"--x": 612, "--y": 120}}>
                  <Glyph icon="ph-eye" colour="#d9467a" />
                  <span className="grid gap-[0.1875rem] min-w-0"><b className="custom-node-title">Review with you</b><span className="custom-node-meta">Live preview</span></span>
                  <span className="custom-status custom-node-state" data-flow-state="">Skipped</span>
                </li>
                <li className="custom-node custom-node--branch is-ok max-md:ml-11" data-flow-node="6" style={{"--x": 612, "--y": 244}}>
                  <Glyph icon="ph-clock-counter-clockwise" colour="#2f6fe4" />
                  <span className="grid gap-[0.1875rem] min-w-0"><b className="custom-node-title">Save a version</b><span className="custom-node-meta">Project history</span></span>
                  <span className="custom-status custom-status--ok custom-node-state" data-flow-state="">Saved</span>
                </li>
              </ol>
              <p className="custom-flow-toast absolute max-md:relative left-0 bottom-0 flex items-center gap-2.5 m-0 max-md:mt-6 py-2 pr-3.5 pl-2 text-[0.75rem] font-medium leading-[1.3] text-(--custom-on-dark-meta) rounded-lg" data-flow-toast="">
                <span className="custom-flow-toast-icon grid w-7 aspect-square text-[0.875rem] text-(--custom-ok) rounded-md"><i className="ph-bold ph-check"></i></span>
                <span className="custom-flow-toast-body grid gap-[0.0625rem]"><b className="text-[0.8125rem] font-semibold text-(--custom-on-dark)">Version <span data-flow-run="">#11</span></b><span><span data-flow-steps="">5 steps</span> · <span data-flow-time="">32 s</span></span></span>
              </p>
            </div>
            <div className="custom-hero-month grid gap-x-8 gap-y-5 content-start py-6 px-[clamp(1.25rem,0.5rem_+_2vw,2rem)] xl:py-[clamp(2rem,1rem_+_2vw,2.75rem)] xl:px-6 md:max-xl:grid-cols-[auto_minmax(0,1fr)] md:max-xl:items-end" aria-hidden="true">
              <div className="grid gap-3">
                <p className="m-0 text-[0.6875rem] font-semibold tracking-[0.06em] uppercase text-(--custom-on-dark-meta)">This project</p>
                <p className="m-0 flex items-center gap-2.5 text-[0.9375rem] text-(--custom-on-dark-soft)"><Glyph icon="ph-files" size="24" colour="var(--custom-ok)" />Pages</p>
                <p className="m-0 font-heading text-[3rem] font-bold leading-none tracking-[-0.045em] text-(--custom-on-dark)">11<span className="ml-1 text-[1.375rem] font-semibold tracking-[-0.02em] text-(--custom-on-dark-meta)">pages</span></p>
                <span className="custom-status custom-status--ok w-fit">1 added today</span>
              </div>
              <dl className="grid m-0 text-[0.875rem] md:max-xl:grid-cols-3 md:max-xl:gap-x-6">
                {[["Project", "Halden Studio"], ["Credits used", "214"], ["Last saved", "2 min ago"]].map(([k, v]) =>
                  <div key={k} className="flex items-baseline justify-between gap-4 py-2.5"><dt className="text-(--custom-on-dark-meta)">{k}</dt><dd className="m-0 font-semibold text-(--custom-on-dark)">{v}</dd></div>)}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>;
}

/* ---------- Kinds of website (the template's logo strip) ---------- */
const kinds = [["ph-buildings", "Architects"], ["ph-fork-knife", "Restaurants"], ["ph-t-shirt", "Fashion"], ["ph-coffee", "Cafés"], ["ph-scales", "Law firms"], ["ph-flower-lotus", "Yoga studios"], ["ph-camera", "Photographers"], ["ph-briefcase", "Consultants"], ["ph-bed", "Hotels"], ["ph-pen-nib", "Agencies"]];
function Kinds() {
  return <section id="au-logos" className="custom-section pb-[calc(var(--section-space)_*_0.75)]" aria-labelledby="au-logos-title">
    <div className="container">
      <p id="au-logos-title" className="custom-logos-title mt-0 mb-9 mx-0 text-[1.0625rem] text-center text-(--custom-meta)" data-anim="fade-up">Designs for <strong className="font-semibold text-text">every kind of website</strong></p>
    </div>
    <div className="marquee-wrap marquee-wrap--fade marquee-wrap--pause custom-logos-strip" data-anim="fade-up" data-anim-delay="120">
      <ul className="marquee gap-[clamp(3rem,2rem_+_3vw,5.5rem)] m-0 p-0 list-none" data-speed="38">
        {kinds.map(([icon, name]) => <li key={name} className="custom-logos-mark"><i className={"ph-bold " + icon} aria-hidden="true"></i>{name}</li>)}
      </ul>
    </div>
  </section>;
}

/* ---------- AI (the template's agents bento; home-flow.js plays the run) ---------- */
const agentSteps = [
  ["Read your request", 'conversation.read()', "0.4 s"],
  ["Look at your design", 'design.inspect("Architecture Studio")', "0.6 s"],
  ["Draft the services page", 'pages.create("services")', "3 sections"],
  ["Ask you to review", 'review.request("/services")', "Waiting for you"],
  ["Publish the page", 'site.publish("halden.studio")', "Queued"],
  ["Save a version", 'history.save("v12")', "Queued"],
];
function Assistant() {
  return <section id="how-it-works" className="custom-section custom-section--dark custom-agents" aria-labelledby="au-agents-title">
    <div className="glow-field" aria-hidden="true"><div className="glow custom-agents-glow -top-56 -right-48"></div></div>
    <div className="container">
      <div className="custom-head custom-head--center">
        <p className="eyebrow" data-anim="fade-up">How it works</p>
        <h2 id="au-agents-title" className="custom-title" data-anim="fade-up" data-anim-delay="80">AI that builds with you, <span className={muted}>not just for you.</span></h2>
        <p className="custom-lead" data-anim="fade-up" data-anim-delay="160">Describe what you want. Draftmango works through the changes, shows you every step, and asks before anything goes live.</p>
      </div>
      <div className="custom-agents-bento grid gap-5" data-agent="">
        <article className={"custom-panel " + pad + " custom-agents-run"} data-anim="fade-up" aria-labelledby="au-agents-run">
          <header className="custom-agents-run-bar flex flex-wrap items-center gap-3">
            <Glyph icon="ph-sparkle" size="24" brand />
            <h3 id="au-agents-run" className="custom-agents-run-name m-0 font-sans text-[0.9375rem] font-semibold tracking-[0]">Draftmango <span className="ml-2 font-medium text-(--custom-on-dark-meta)">Halden Studio</span></h3>
            <span className="custom-status custom-status--wait ml-auto" data-agent-status="">Waiting for your review</span>
          </header>
          <p className="custom-agents-goal mt-5 mb-4 mx-0 py-3.5 px-4 text-[0.9375rem] leading-[1.5] text-(--custom-on-dark) bg-(--custom-ink-2) rounded-lg"><span className="block mb-1 text-[0.6875rem] font-semibold tracking-[0.08em] uppercase text-(--custom-on-dark-meta)">Your request</span>“Add a services page with our three packages, and make the home page feel a little warmer.”</p>
          <ol className="m-0 p-0 list-none">
            {agentSteps.map(([title, call, state], i) => {
              const n = i + 1, kind = n < 4 ? "ok" : n === 4 ? "wait" : "";
              return <li key={n} className={"custom-agents-step" + (kind ? " is-" + kind : "")} data-agent-step={n}><span className="custom-agents-step-dot" aria-hidden="true"></span><span className="custom-agents-step-text"><b>{title}</b><code>{call}</code></span><span className={"custom-status" + (kind ? " custom-status--" + kind : "")} data-agent-state="">{state}</span></li>;
            })}
          </ol>
        </article>
        <article className={pad + " custom-agents-approve relative flex items-end overflow-hidden rounded-(--custom-radius-card)"} data-anim="fade-up" data-anim-delay="120" aria-labelledby="au-agents-approve">
          <img className="absolute inset-0 w-full h-full object-cover object-[62%_40%]" src="/draftmango/shots/architecture-studio-1-tall.jpg" alt="The Halden Studio website in progress" width="1200" height="1500" loading="lazy" decoding="async" />
          <div className="custom-agents-card" data-agent-approval="">
            <p className="custom-agents-card-from"><Glyph icon="ph-sparkle" size="24" brand />Draftmango asks</p>
            <h3 id="au-agents-approve" className="custom-agents-card-title">Publish the new Services page?</h3>
            <dl className="custom-agents-card-meta grid grid-cols-[repeat(3,auto)] [justify-content:start] gap-5 mt-0 mb-5 mx-0">
              <div><dt>Page</dt><dd className="whitespace-nowrap">/services</dd></div>
              <div><dt>Sections</dt><dd>3 new</dd></div>
              <div><dt>Version</dt><dd>v12</dd></div>
            </dl>
            <div className="custom-agents-card-actions" data-agent-actions="">
              <button type="button" className="btn btn-primary btn-sm" data-agent-approve="">Publish</button>
              <button type="button" className="btn btn-sm custom-agents-reject" data-agent-reject="">Keep as draft</button>
            </div>
            <p className="custom-agents-card-done" data-agent-done="" hidden><i className="ph-bold ph-check-circle" aria-hidden="true"></i>Published · your new page is live</p>
          </div>
        </article>
        <article className={"custom-panel " + pad + " min-[1100px]:col-[span_3]"} data-anim="fade-up">
          <h3 className="custom-agents-mini-title"><i className="ph ph-books" aria-hidden="true"></i>Your content</h3>
          <p className="custom-agents-mini-text">Your words, photos and notes guide every draft.</p>
          <ul className="custom-agents-docs">
            <li><i className="ph-fill ph-file-text" aria-hidden="true"></i><span>About the studio</span><small>Text</small></li>
            <li><i className="ph-fill ph-image" aria-hidden="true"></i><span>Project photos</span><small>12 images</small></li>
            <li><i className="ph-fill ph-table" aria-hidden="true"></i><span>Packages & prices</span><small>List</small></li>
          </ul>
        </article>
        <article className={"custom-panel " + pad + " min-[1100px]:col-[span_3]"} data-anim="fade-up" data-anim-delay="80">
          <h3 className="custom-agents-mini-title"><i className="ph ph-squares-four" aria-hidden="true"></i>Pages & sections</h3>
          <p className="custom-agents-mini-text">Add, remove or rearrange any part of a page.</p>
          <div className="custom-agents-tools grid grid-cols-[repeat(4,2.25rem)] gap-2.5" aria-hidden="true">
            {[["ph-house", "#0f9488"], ["ph-images", "#5b5bd6"], ["ph-article", "#1f8a5b"], ["ph-envelope-simple", "#d9467a"], ["ph-users", "#2f6fe4"], ["ph-calendar-blank", "#e08a1e"], ["ph-map-pin", "#0e7490"]].map(([icon, colour]) => <Glyph key={icon} icon={icon} colour={colour} />)}
            <span className="custom-glyph custom-glyph--plain text-[0.75rem]">+9</span>
          </div>
        </article>
        <article className={"custom-panel " + pad + " min-[1100px]:col-[span_3]"} data-anim="fade-up" data-anim-delay="160">
          <h3 className="custom-agents-mini-title"><i className="ph ph-lightning" aria-hidden="true"></i>AI credits</h3>
          <p className="custom-agents-mini-text">Each request uses credits from your plan.</p>
          <ul className="custom-agents-keys">
            <li><span>Plan</span><kbd className="custom-kbd">Basic</kbd></li>
            <li><span>This month</span><span className="custom-status custom-status--ok">786 left</span></li>
            <li><span>Allowance</span><b className="font-semibold">1,000 / month</b></li>
          </ul>
        </article>
        <article className={"custom-panel " + pad + " min-[1100px]:col-[span_3]"} data-anim="fade-up" data-anim-delay="240">
          <h3 className="custom-agents-mini-title"><i className="ph ph-brain" aria-hidden="true"></i>Project memory</h3>
          <p className="custom-agents-mini-text">Remembers the choices you have already made.</p>
          <ul className="custom-agents-memory flex-wrap">
            <li>Warm, plain tone</li>
            <li>Serif headings</li>
            <li>Prices in GBP</li>
          </ul>
        </article>
      </div>
    </div>
  </section>;
}

/* ---------- The workspace (the template's integrations wall) ---------- */
const wall = [
  [["ph-squares-four", "#2f6fe4", "Planning", "Your brief"], ["ph-devices", "#0f9488", "Responsive", "Every screen"], ["ph-chat-circle-text", "#7a5cf0", "Conversation", "AI"], ["ph-eye", "#d9467a", "Live preview", "Desktop & mobile"]],
  [["ph-brackets-curly", "#5b5bd6", "Code editor", "React source"], ["ph-columns", "#0e7490", "Split view", "Code + preview"], ["ph-clock-counter-clockwise", "#e08a1e", "History", "Every version"], ["ph-download-simple", "#475569", "Export", "Your source"]],
  [["ph-globe-simple", "#c2410c", "Your domain", "Connect"], ["ph-magnifying-glass", "#7c5cd6", "Domain search", "Buy a name"], ["ph-rocket-launch", "#1f8a5b", "Publishing", "Go live"], ["ph-google-logo", "#be185d", "Google sign-in", "Accounts"]],
  [["ph-lightning", "#2f6fe4", "AI credits", "Monthly"], ["ph-image", "#a16207", "Your images", "Assets"], ["ph-text-aa", "#0f9488", "Typography", "Designer type"], ["ph-sparkle", null, "Draftmango", "Built in"]],
];
function Workspace() {
  return <section id="au-integrations" className="custom-section custom-section--tint custom-integrations" aria-labelledby="au-integrations-title">
    <div className="container grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-12 lg:gap-[clamp(3rem,1rem_+_4vw,6rem)] items-center">
      <div className="custom-integrations-wall h-104 lg:h-144" aria-hidden="true">
        <div className="marquee-cols custom-integrations-cols grid-cols-3 sm:grid-cols-4 gap-4">
          {wall.map((col, i) => <div key={i} className={"marquee-wrap marquee-cols__col" + (i === 3 ? " hidden sm:block" : "")}>
            <div className={"marquee marquee--vertical" + (i % 2 ? " marquee--reverse" : "") + (i === 3 ? " sm:-mt-36" : "")}>
              {col.map(([icon, colour, name, small]) => <span key={name} className="custom-integrations-app"><Glyph icon={icon} colour={colour} size="44" brand={!colour} /><b>{name}</b><small>{small}</small></span>)}
            </div>
          </div>)}
        </div>
      </div>
      <div className="custom-integrations-copy -order-1 lg:order-0 grid justify-items-start gap-5">
        <p className="eyebrow" data-anim="fade-up">The workspace</p>
        <h2 id="au-integrations-title" className="custom-title m-0" data-anim="fade-up" data-anim-delay="80">Everything a website needs. <span className={muted}>One workspace.</span></h2>
        <p className="custom-lead" data-anim="fade-up" data-anim-delay="160">Pages, previews, code, domains and history in one place, so nothing gets lost between tools.</p>
        <a href="/#idea" className="custom-integrations-search flex items-center gap-3.5 w-[min(100%,28rem)] mt-3 py-4 px-5 text-[1.0625rem] bg-surface rounded-lg" data-anim="fade-up" data-anim-delay="240">
          <i className="ph ph-magnifying-glass text-[1.25rem] text-text" aria-hidden="true"></i>
          <span>Describe your website</span>
          <i className="ph ph-arrow-right custom-integrations-search-go ml-auto" aria-hidden="true"></i>
        </a>
      </div>
    </div>
  </section>;
}

/* ---------- Build your way (Visual / Code tabs) ---------- */
const k = "custom-code-k", f = "custom-code-f", s = "custom-code-s", c = "text-(--custom-on-dark-meta) italic";
const code = [
  [[c, "// src/pages/Home.jsx · the hero section"]],
  [[k, "export default function"], [null, " "], [f, "Hero"], [null, "() {"]],
  [[null, "  "], [k, "return"], [null, " ("]],
  [[null, "    <section className="], [s, '"hero"'], [null, ">"]],
  [[null, "      <p className="], [s, '"eyebrow"'], [null, ">Hayes Valley, San Francisco</p>"]],
  [[null, "      <h1>Seasonal cooking, <em>quietly</em> done.</h1>"]],
  [[null, "      <a className="], [s, '"btn btn-primary"'], [null, " href="], [s, '"/reservations"'], [null, ">"]],
  [[null, "        Reserve a table"]],
  [[null, "      </a>"]],
  [[null, "    </section>"]],
  [[null, "  )"]],
  [[null, "}"]],
];
function Build() {
  return <section id="au-build" className="custom-section custom-build" aria-labelledby="au-build-title">
    <div className="container grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-12 lg:gap-[clamp(3rem,1rem_+_4vw,6rem)]">
      <div className="custom-build-copy">
        <h2 id="au-build-title" className="custom-title" data-anim="fade-up">No code when you want it. <span className={muted}>Code when you need it.</span></h2>
        <p className="custom-lead mt-6" data-anim="fade-up" data-anim-delay="100">Ask for changes in plain words, or open the same page as React source. It is one project either way.</p>
        <ul className="check-list check-list--primary custom-build-list gap-3 mt-8" data-anim="fade-up" data-anim-delay="180">
          <li><i className="ph-bold ph-check" aria-hidden="true"></i>Describe a change and check it in the live preview</li>
          <li><i className="ph-bold ph-check" aria-hidden="true"></i>Edit any page as React source, in Preview, Code or Split view</li>
          <li><i className="ph-bold ph-check" aria-hidden="true"></i>Save versions as you go, and export your source at any time</li>
        </ul>
      </div>
      <div className="custom-build-stage">
        <figure className="custom-build-photo w-[min(72%,24rem)] my-0 mr-0 ml-auto">
          <img className="block w-full aspect-[4/5] object-cover object-[40%_50%] rounded-(--custom-radius-photo)" src="/draftmango/shots/restaurant-1-tall.jpg" alt="A restaurant website with a warm dining room and the line Seasonal cooking, quietly done" width="1200" height="1500" loading="lazy" decoding="async" />
        </figure>
        <div className="custom-panel custom-build-card w-[min(100%,40rem)] mt-[clamp(-18rem,-40vw,-8rem)] overflow-hidden tabs tabs-segmented" x-data="tablist()" data-anim="fade-up" data-anim-delay="120">
          <div className="custom-build-bar flex flex-wrap items-center justify-between gap-3 py-3.5 pr-4 pl-5">
            <span className="custom-build-step inline-flex items-center gap-2.5 text-[0.875rem]"><Glyph icon="ph-browser" size="24" brand /><b className="font-semibold text-(--custom-on-dark)">Home · Hero section</b></span>
            <div className="tabs-nav gap-0.5 p-[0.1875rem] bg-(--custom-ink-2)" role="tablist" aria-label="Edit the section as" x-bind="list">
              <button type="button" className="tab-btn is-active gap-1.5 py-1.5 px-3.5 text-[0.8125rem]" role="tab" id="au-build-t1" aria-controls="au-build-p1" aria-selected="true" x-bind="tab"><i className="ph ph-eye" aria-hidden="true"></i>Preview</button>
              <button type="button" className="tab-btn gap-1.5 py-1.5 px-3.5 text-[0.8125rem]" role="tab" id="au-build-t2" aria-controls="au-build-p2" aria-selected="false" tabIndex={-1} x-bind="tab"><i className="ph ph-brackets-curly" aria-hidden="true"></i>Code</button>
            </div>
          </div>
          <div className="tabs-panels mt-0">
            <div className="tabs-panel is-active p-[clamp(1.5rem,1rem_+_1.6vw,2.5rem)]" role="tabpanel" id="au-build-p1" aria-labelledby="au-build-t1" x-bind="panel">
              <ol className="custom-build-nodes" aria-label="Sections on the page">
                <Node icon="ph-list" colour="#5b5bd6" title="Header" meta="Navigation" className="is-ok" />
                <Node icon="ph-image" brand title="Hero" meta="Editing" className="custom-node--active" />
                <Node icon="ph-fork-knife" colour="#2f6fe4" title="Menu highlights" meta="3 dishes" />
              </ol>
              <dl className="custom-build-fields grid text-[0.8125rem] bg-(--custom-ink-2) rounded-lg">
                {[["Text", "heading", "Seasonal cooking, quietly done."], ["Text", "button", "Reserve a table"], ["Image", "background", "dining-room.jpg"], ["Style", "mood", "Warm", true]].map(([dt, name, value, hot]) =>
                  <div key={name}><dt>{dt}</dt><dd>{name}</dd><dd className={"custom-build-value" + (hot ? " custom-build-value--hot text-(--custom-pop-text)" : "")}>{value}</dd></div>)}
              </dl>
              <p className="flex flex-wrap items-center gap-3 mt-5 mb-0 mx-0 text-[0.8125rem] text-(--custom-on-dark-meta)"><span className="custom-status custom-status--ok">Preview updated</span><span>Saved 2 s ago · version 12</span></p>
            </div>
            <div className="tabs-panel custom-build-code" role="tabpanel" id="au-build-p2" aria-labelledby="au-build-t2" x-bind="panel">
              <div className="code-block" data-code-block="" data-lenis-prevent-touch="">
                <pre className="m-0 pt-7 pb-8 px-7 overflow-x-auto text-[0.8125rem] leading-[1.75] text-(--custom-on-dark)"><code>{code.map((line, i) => <span key={i}>{line.map(([cls, text], j) => cls ? <span key={j} className={cls}>{text}</span> : text)}{"\n"}</span>)}</code></pre>
                <button className="code-copy top-4 right-4" data-copy="" type="button" aria-label="Copy code"><i className="ph ph-copy" aria-hidden="true"></i><span data-copy-label="" aria-live="polite">Copy</span></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>;
}

/* ---------- Project history (the template's run history, with one retry) ---------- */
const versions = [
  ["v12", "ph-sparkle", null, "Add a services page", "ok", "Published", "11", "Draftmango", "2 min ago"],
  ["v11", "ph-palette", "#d9467a", "Warmer home page colours", "ok", "Saved", "10", "Draftmango", "9 min ago"],
  ["v10", "ph-brackets-curly", "#0f9488", "Edit the hero in code", "wait", "In review", "10", "You", "21 min ago"],
];
const older = [
  ["v8", "ph-images", "#5b5bd6", "Add project photos", "ok", "Saved", "10", "You", "Yesterday"],
  ["v7", "ph-squares-four", "#2f6fe4", "Start from Architecture Studio", "ok", "Saved", "10", "You", "Yesterday"],
];
function Row([version, icon, colour, change, kind, status, pages, by, when]) {
  return <tr key={version}><td>{version}</td><td><Glyph icon={icon} colour={colour} size="24" brand={!colour} />{change}</td><td><span className={"custom-status custom-status--" + kind}>{status}</span></td><td>{pages}</td><td>{by}</td><td>{when}</td></tr>;
}
const retry = "{ s: 'fail', retry() { if (this.s !== 'fail') return; this.s = 'run'; setTimeout(() => { this.s = 'ok' }, 1400) } }";
function History() {
  return <section id="au-observe" className="custom-section custom-section--dark custom-observe" aria-labelledby="au-observe-title">
    <div className="container">
      <div className="custom-head custom-head--row">
        <h2 id="au-observe-title" className="custom-title" data-anim="fade-up">See every version. <span className={muted}>Fix any step.</span></h2>
        <p className="custom-observe-hints flex flex-wrap gap-y-3 gap-x-6 m-0 text-[0.9375rem] text-(--custom-on-dark-meta)" data-anim="fade-up" data-anim-delay="120"><span>Every save is kept, so you can always go back.</span></p>
      </div>
      <div className="custom-panel overflow-hidden" data-anim="fade-up" data-anim-delay="160" x-data={retry} {...{"x-on:keydown.r": "retry()"}}>
        <div className="custom-observe-bar flex flex-wrap items-center gap-y-2.5 gap-x-3 py-4 px-5">
          <h3 className="my-0 mr-3 ml-0 font-sans text-[0.9375rem] font-semibold tracking-[0]">Project history</h3>
          <span className="custom-observe-filter">Halden Studio <i className="ph ph-caret-down" aria-hidden="true"></i></span>
          <span className="custom-observe-filter">Last 7 days <i className="ph ph-caret-down" aria-hidden="true"></i></span>
          <span className="ml-auto text-[0.8125rem] text-(--custom-on-dark-meta)">12 versions · 11 pages</span>
        </div>
        <div className="custom-observe-scroll overflow-x-auto" data-lenis-prevent-touch="">
          <table className="custom-observe-table w-full min-w-184 text-[0.875rem] text-(--custom-on-dark-soft)">
            <thead><tr>{["Version", "Change", "Status", "Pages", "By", "When"].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>
              {versions.map(Row)}
              <tr className="custom-observe-open" {...{"x-bind:class": "{ 'is-fixed': s === 'ok' }"}}>
                <td>v9</td>
                <td><Glyph icon="ph-globe-simple" colour="#c2410c" size="24" />Publish to halden.studio</td>
                <td>
                  <span className="custom-status custom-status--fail" x-show="s === 'fail'">Failed</span>
                  <span className="custom-status custom-status--run" x-show="s === 'run'" x-cloak="">Retrying</span>
                  <span className="custom-status custom-status--ok" x-show="s === 'ok'" x-cloak="">Published</span>
                </td>
                <td>10</td>
                <td>You</td>
                <td>1 hr ago</td>
              </tr>
              <tr className="custom-observe-detail">
                <td className="pt-0 pb-6 px-5 whitespace-normal" colSpan={6}>
                  <div className="custom-observe-error flex gap-3 pt-4 pb-5 px-0" x-show="s !== 'ok'">
                    <i className="ph-bold ph-warning-circle flex-none text-[1.25rem] text-(--custom-fail)" aria-hidden="true"></i>
                    <p className="m-0 text-[0.9375rem] leading-[1.5] text-(--custom-on-dark-soft)"><b className="font-semibold text-(--custom-on-dark)">Step 3 · Check the domain</b> could not find the DNS record yet. New records can take a little while to appear; retry once they are in place.</p>
                  </div>
                  <div className="custom-observe-error flex gap-3 pt-4 pb-5 px-0 custom-observe-error--ok" x-show="s === 'ok'" x-cloak="">
                    <i className="ph-bold ph-check-circle flex-none text-[1.25rem] text-(--custom-ok)" aria-hidden="true"></i>
                    <p className="m-0 text-[0.9375rem] leading-[1.5] text-(--custom-on-dark-soft)"><b className="font-semibold text-(--custom-on-dark)">Retried from step 3</b> — the domain is connected and your site is live on halden.studio.</p>
                  </div>
                  <ol className="custom-observe-steps flex flex-wrap gap-2 m-0 p-0 list-none">
                    <li className="is-ok"><b>Build the site</b><span>4.1 s</span></li>
                    <li className="is-ok"><b>Check pages</b><span>10 / 10</span></li>
                    <li className="is-fail" {...{"x-bind:class": "{ 'is-ok': s === 'ok', 'is-run': s === 'run', 'is-fail': s === 'fail' }"}}><b>Check the domain</b><span x-text="s === 'ok' ? '0.8 s' : (s === 'run' ? 'Running' : 'DNS')">DNS</span></li>
                    <li {...{"x-bind:class": "s === 'ok' ? 'is-ok' : ''"}}><b>Publish</b><span x-text="s === 'ok' ? '2.3 s' : 'Skipped'">Skipped</span></li>
                    <li {...{"x-bind:class": "s === 'ok' ? 'is-ok' : ''"}}><b>Save a version</b><span x-text="s === 'ok' ? '0.2 s' : 'Skipped'">Skipped</span></li>
                  </ol>
                  <div className="custom-observe-actions flex flex-wrap items-center gap-3 mt-5">
                    <button type="button" className="btn btn-primary btn-sm" {...{"x-on:click": "retry()"}} {...{"x-bind:disabled": "s !== 'fail'"}}><i className="ph-bold ph-arrow-clockwise mr-1.5" aria-hidden="true"></i>Retry step</button>
                    <a href="/help#domains" className="btn btn-sm btn-outline-light">Domain help</a>
                    <span className="text-[0.875rem] text-(--custom-on-dark-meta)">or press <kbd className="custom-kbd">R</kbd></span>
                  </div>
                </td>
              </tr>
              {older.map(Row)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>;
}

/* ---------- Numbers ---------- */
function Numbers() {
  const items = [["500", "", "", "AI credits to try, free"], ["0", "$", "", "to start your first site"]];
  return <section id="au-metrics" className="custom-section custom-metrics" aria-labelledby="au-metrics-title">
    <div className="container">
      <div className="custom-panel custom-metrics-panel isolate overflow-clip p-[clamp(2rem,1rem_+_3.4vw,4.5rem)]" data-anim="fade-up">
        <div className="glow-field" aria-hidden="true"><div className="glow custom-metrics-glow -bottom-72 left-[30%]"></div></div>
        <h2 id="au-metrics-title" className="custom-metrics-title mt-0 mb-[clamp(2.5rem,1.5rem_+_2.4vw,4rem)] mx-0 text-[1.25rem] tracking-[-0.02em] text-(--custom-on-dark)">Draftmango <span className="font-medium text-(--custom-on-dark-meta)">in numbers</span></h2>
        <dl className="custom-metrics-list relative grid grid-cols-2 gap-y-12 gap-x-8 m-0">
          {items.map(([value, prefix, suffix, label]) => <div key={label} className="counter custom-metrics-item">
            <dt className="counter-label">{label}</dt>
            <dd className="custom-figure"><span className="counter-number" data-counter={value} data-prefix={prefix || undefined} data-suffix={suffix || undefined}>{prefix}{Number(value).toLocaleString("en-GB")}{suffix}</span></dd>
          </div>)}
        </dl>
        <p className="custom-small text-[0.9375rem] leading-[1.5] text-(--custom-meta) mt-[clamp(2.5rem,1.5rem_+_2vw,3.5rem)]">Free plan credits are a one-time allowance for trying Draftmango.</p>
      </div>
    </div>
  </section>;
}

/* ---------- Ownership (the template's security band) ---------- */
const owned = [
  ["ph-file-code", "Your source code", "Every project is editable React. Export a copy whenever you like."],
  ["ph-clock-counter-clockwise", "Version history", "Go back to any saved version of your project."],
  ["ph-globe-simple", "Your own domain", "Connect a domain you own, or buy one through Draftmango on a paid plan."],
  ["ph-lock-simple", "Private until published", "Your project stays in your account until you choose to publish it."],
  ["ph-user-circle", "Simple sign-in", "Use your email and a password, or continue with Google."],
  ["ph-info", "Clear about what is ready", "Draftmango is in launch preview. The Help centre lists what works today."],
];
function Ownership() {
  return <section id="au-security" className="custom-section custom-section--dark custom-security" aria-labelledby="au-security-title">
    <Contours className="custom-security-contours" />
    <div className="container grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 lg:gap-[clamp(3rem,1rem_+_4vw,6rem)]">
      <div className="custom-security-copy grid justify-items-start [align-content:start] gap-5">
        <p className="eyebrow" data-anim="fade-up">Yours to keep</p>
        <h2 id="au-security-title" className="custom-title m-0" data-anim="fade-up" data-anim-delay="80">Your website, <span className={muted}>from the first draft.</span></h2>
        <p className="custom-lead" data-anim="fade-up" data-anim-delay="160">You stay in control of your project, your code and your domain.</p>
        <ul className="custom-security-badges flex flex-wrap gap-2 mt-2 mb-3 mx-0 p-0 list-none" data-anim="fade-up" data-anim-delay="220" aria-label="Included">
          <li>React source</li>
          <li>Version history</li>
          <li>Custom domains</li>
        </ul>
        <a href="/help" className="custom-link text-(--custom-on-dark)" data-anim="fade-up" data-anim-delay="280">Visit the Help centre <i className="ph ph-arrow-right text-(--custom-pop)" aria-hidden="true"></i></a>
      </div>
      <ul className="custom-security-items grid grid-cols-1 md:grid-cols-2 gap-x-12 m-0 p-0 list-none">
        {owned.map(([icon, title, text], i) => <li key={title} data-anim="fade-up" data-anim-delay={i % 3 ? String((i % 3) * 80) : undefined}><i className={"ph " + icon} aria-hidden="true"></i><h3>{title}</h3><p>{text}</p></li>)}
      </ul>
    </div>
  </section>;
}

/* ---------- Pricing (plans from the Pricing page) ---------- */
const signup = plan => "'/auth#mode=signup&plan=" + plan + "&billing=' + (annual ? 'yearly' : 'monthly')";
function Feature({children}) { return <li className="pricing-feature"><i className="pricing-feature-icon ph ph-check" aria-hidden="true"></i>{children}</li>; }
function Pricing() {
  return <section id="au-pricing" className="custom-section custom-pricing" aria-labelledby="au-pricing-title" x-data="{ annual: false }">
    <div className="container">
      <div className="custom-head custom-head--center">
        <h2 id="au-pricing-title" className="custom-title" data-anim="fade-up">Simple plans. <span className={muted}>Room to grow.</span></h2>
      </div>
      <div className="custom-pricing-controls flex flex-wrap items-center justify-center gap-y-6 gap-x-12 mt-[calc(var(--custom-head-space)_*_-0.4)] mb-(--custom-head-space)" data-anim="fade-up">
        <div className="pricing-billing bg-surface">
          <button type="button" className="pricing-billing-label is-active" {...{"x-bind:class": "{ 'is-active': !annual }"}} {...{"x-on:click": "annual = false"}}>Monthly</button>
          <label className="form-toggle">
            <input type="checkbox" x-model="annual" aria-label="Yearly billing" />
            <span className="form-toggle-track"><span className="form-toggle-thumb"></span></span>
          </label>
          <button type="button" className="pricing-billing-label" {...{"x-bind:class": "{ 'is-active': annual }"}} {...{"x-on:click": "annual = true"}}>Yearly</button>
          <span className="badge custom-pricing-save font-semibold text-text">Save up to 33%</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pt-4 dm-pricing-grid">
        <div className="pricing-card custom-pricing-card" data-anim="fade-up">
          <span className="pricing-plan">Free</span>
          <p className="pricing-desc">Explore the builder and your first idea.</p>
          <div className="pricing-price"><span className="pricing-currency">$</span><span className="pricing-amount">0</span><span className="pricing-period">/ month</span></div>
          <hr className="pricing-divider" />
          <ul className="pricing-features">
            <Feature>500 AI credits to try</Feature>
            <Feature>One website on a Draftmango subdomain</Feature>
            <Feature>Editable code and project history</Feature>
            <Feature>Source export</Feature>
          </ul>
          <div className="pricing-cta"><a href="/auth#mode=signup&plan=free&billing=monthly" className="btn btn-ghost btn-block custom-btn-ghost">Start free</a></div>
        </div>
        <div className="pricing-card pricing-card--featured custom-pricing-card" data-anim="fade-up" data-anim-delay="80">
          <span className="pricing-popular">For your first website</span>
          <span className="pricing-plan">Basic</span>
          <p className="pricing-desc">For your personal or business website.</p>
          <div className="pricing-price"><span className="pricing-currency">$</span><span className="pricing-amount" x-text="annual ? 10 : 15">15</span><span className="pricing-period">/ month</span></div>
          <hr className="pricing-divider" />
          <ul className="pricing-features">
            <Feature>1,000 AI credits a month</Feature>
            <Feature>Connect your custom domain</Feature>
            <Feature>Buy a domain through Draftmango</Feature>
            <Feature>Everything in Free</Feature>
          </ul>
          <div className="pricing-cta"><a href="/auth#mode=signup&plan=basic&billing=monthly" {...{"x-bind:href": signup("basic")}} className="btn btn-primary btn-block">Choose Basic</a></div>
        </div>
        <div className="pricing-card custom-pricing-card custom-pricing-card--ink text-(--custom-on-dark-soft) bg-(--custom-ink)" data-anim="fade-up" data-anim-delay="160">
          <span className="pricing-plan">Pro</span>
          <p className="pricing-desc text-(--custom-on-dark-soft)">More room for your growing projects.</p>
          <div className="pricing-price"><span className="pricing-currency">$</span><span className="pricing-amount" x-text="annual ? 30 : 39">39</span><span className="pricing-period">/ month</span></div>
          <hr className="pricing-divider bg-(--custom-line-dark)" />
          <ul className="pricing-features">
            <Feature>3,000 AI credits a month</Feature>
            <Feature>Up to three websites</Feature>
            <Feature>Custom domains for each site</Feature>
            <Feature>One shared pool of credits</Feature>
          </ul>
          <div className="pricing-cta"><a href="/auth#mode=signup&plan=pro&billing=monthly" {...{"x-bind:href": signup("pro")}} className="btn btn-block btn-outline-light">Choose Pro</a></div>
        </div>
      </div>
      <p className="custom-pricing-note flex items-center justify-center gap-2 mt-10 mb-0 mx-0 text-soft text-center"><i className="ph ph-info text-[1.25rem] text-primary-ink" aria-hidden="true"></i><span><span x-text="annual ? 'Billed once a year. AI credits refresh monthly.' : 'Billed monthly.'">Billed monthly.</span> Launch pricing preview: choosing a plan does not charge you yet. Prices in USD, before tax. <a href="/pricings">Compare plans</a></span></p>
    </div>
  </section>;
}

export default function Page() {
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <SiteHeader current="/" />
    <main id="main">
      <Hero />
      <Kinds />
      <Assistant />
      <Workspace />
      <Build />
      <History />
      <Numbers />
      <Ownership />
      <Pricing />
    </main>
    <SiteFooter />
    <button data-back-top="" aria-label="Back to top" className="back-to-top fixed bottom-8 right-8 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer border-0 text-white bg-primary shadow-token-lg z-sticky"><i className="ph ph-arrow-up" aria-hidden="true"></i></button>
    <DraftmangoRuntime demo="/home-flow.js" />
  </>;
}
