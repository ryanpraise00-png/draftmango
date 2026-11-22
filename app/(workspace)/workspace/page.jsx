import PageControllers from "../../../components/PageControllers";

// The builder, rebuilt on the Framo SaaS Automation system ("light studio"): one top bar across the chat and
// canvas, the chat on paper with espresso progress cards, the site in a browser window on contour paper and an
// espresso console. Every id, data- attribute and hook class the workspace scripts use is kept.
const Icon = ({name, bold}) => <i className={(bold ? "ph-bold" : "ph") + " ph-" + name} aria-hidden="true"></i>;

export default function Page() {
  return <>
<a className="skip-link" href="#site-canvas">Skip to website preview</a>
<div className="builder-shell navigation-collapsed">
<button id="navigation-scrim" className="navigation-scrim" aria-label="Close navigation" hidden={true}></button>
<aside className="project-sidebar" id="project-sidebar" aria-label="Workspace navigation" inert={true}>
 {/* Initial content, wired at startup; the shared sidebar (workspace-common.js) replaces it. */}
 <div className="ws-brand-row"><a className="brand" href="/dashboard" aria-label="Draftmango workspace"><img src="/assets/favicon.svg" alt="" width="22" height="25" /><span>draftmango.</span></a><button id="close-navigation" className="icon-button" aria-label="Close navigation"><Icon name="x" bold /></button></div>
 <div id="sidebar-projects"></div>
 <button className="text-button" id="help-button"><Icon name="question" />Workspace guide</button>
 <a className="account-link" href="/dashboard#settings/profile"><span className="avatar" id="sidebar-avatar">D</span><span><strong id="sidebar-name">Your workspace</strong><small>Account settings</small></span></a>
</aside>
<main className="workspace-layout" data-mobile-view="editor">

<header className="app-bar">
 <div className="project-heading">
  <button id="toggle-navigation" className="icon-button" aria-label="Open workspace navigation" aria-controls="project-sidebar" aria-expanded="false"><Icon name="list" /></button>
  <button className="project-button" id="project-menu" aria-haspopup="dialog"><span id="project-title">Your draft</span><Icon name="caret-down" /></button>
  <span className="draft-badge">Draft</span>
 </div>
 <div className="preview-toolbar">
  <button className="icon-button mobile-back" data-mobile-view="editor" aria-label="Back to conversation"><Icon name="arrow-left" /></button>
  <div className="view-tabs" role="group" aria-label="Canvas view">
   <button data-view="preview" className="is-active" aria-pressed="true"><Icon name="eye" /><span>Preview</span></button>
   <button data-view="code" aria-pressed="false"><Icon name="brackets-curly" /><span>Code</span></button>
   <button data-view="split" aria-pressed="false"><Icon name="columns" /><span>Split</span></button>
  </div>
  <div className="canvas-actions">
   <button className="button run-button" id="run-preview" aria-label="Run preview"><Icon name="play" /><span>Run</span></button>
   <button className="button primary" id="export-site" aria-label="Export site"><Icon name="download-simple" /><span>Export</span></button>
  </div>
 </div>
</header>

<aside className="editor-panel" aria-label="Project conversation and design">
 <nav className="panel-tabs" aria-label="Project tools">
  <button className="is-active" data-panel="build" aria-pressed="true"><Icon name="chats-circle" />Build</button>
  <button data-panel="design" aria-pressed="false"><Icon name="sliders-horizontal" />Design</button>
  <button data-panel="history" aria-pressed="false"><Icon name="clock-counter-clockwise" />History<span className="history-dot" hidden={true}></span></button>
 </nav>
 <div className="mobile-switch" role="group" aria-label="Workspace view">
  <button data-mobile-view="editor" className="is-active" aria-pressed="true"><Icon name="chats-circle" />Conversation</button>
  <button data-mobile-view="preview" aria-pressed="false"><Icon name="eye" />Preview</button>
 </div>

 <section className="panel panel-build" id="panel-build" aria-label="Build your website">
  <div className="conversation" id="conversation" role="log" aria-label="Design conversation" aria-live="polite" aria-relevant="additions"></div>
  <div className="composer-area">
   <div className="ai-feedback" id="ai-feedback" hidden={true}><p id="ai-message" role="status" aria-live="polite"></p><button type="button" id="retry-ai" hidden={true}>Try again</button></div>
   <button className="generate-site" id="generate-site" hidden={true}>Generate website <Icon name="arrow-up-right" /></button>
   <form className="composer" id="chat-form">
    <label className="sr-only" htmlFor="chat-input">Message Draftmango</label>
    <textarea id="chat-input" rows="2" maxLength="12000" placeholder="Describe your website, or ask for a change…" required={true}></textarea>
    <div className="composer-bottom">
     <span className="composer-hint" aria-hidden="true"></span>
     <button type="submit" className="send-button" aria-label="Send message"><i className="ph-bold ph-arrow-up send-icon" aria-hidden="true"></i><span className="stop-icon" aria-hidden="true"></span></button>
    </div>
   </form>
   <p className="prototype-caption"><button type="button" id="ai-connection">Checking AI connection…</button><span>Enter to send · Shift + Enter for a new line</span></p>
  </div>
 </section>

 <section className="panel panel-design" id="panel-design" aria-labelledby="design-title" hidden={true}>
  <div className="panel-heading"><h2 id="design-title">Design</h2></div>
  <div className="custom-code-note" id="custom-code-note" hidden={true}><strong>You’re shaping this draft in code.</strong><p>Visual controls use the original layout. Your code stays in History if you return.</p><button className="button button-quiet" id="reset-code">Return to visual design</button></div>
  <form className="design-form" id="design-form"><fieldset id="design-fields">
   <div className="control-group"><div className="control-title">Starting point <span>01</span></div><label htmlFor="template-select">Website style</label><select id="template-select"><option value="blank">Blank site</option></select></div>
   <div className="control-group"><div className="control-title">Appearance <span>02</span></div>
    <div className="palette-options" id="palette-options" role="group" aria-label="Color palettes"></div>
    <div className="field-row"><div><label htmlFor="font-select">Headings</label><select id="font-select"><option value="serif">Editorial serif</option><option value="sans">Bold sans</option></select></div><div><label htmlFor="corners-select">Corners</label><select id="corners-select"><option value="soft">Rounded</option><option value="sharp">Square</option></select></div></div>
    <div className="field-row"><div><label htmlFor="spacing-select">Spacing</label><select id="spacing-select"><option value="relaxed">Comfortable</option><option value="compact">Compact</option></select></div><div><label htmlFor="hero-size-select">Hero type</label><select id="hero-size-select"><option value="balanced">Balanced</option><option value="large">Large</option></select></div></div>
   </div>
   <div className="control-group"><div className="control-title">Content <span>03</span></div>
    <label htmlFor="brand-input">Brand name</label><input id="brand-input" maxLength="60" required={true} />
    <label htmlFor="heading-input">Your headline</label><textarea id="heading-input" rows="3" maxLength="180" required={true}></textarea>
    <label htmlFor="description-input">Description</label><textarea id="description-input" rows="4" maxLength="600" required={true}></textarea>
    <label htmlFor="button-input">Button text</label><input id="button-input" maxLength="60" required={true} />
   </div>
   <div className="control-group"><div className="control-title">Sections <span>04</span></div>
    <label className="toggle-row"><span>Our story<small>Introduce your business or project.</small></span><input type="checkbox" id="section-story" /><span className="switch" aria-hidden="true"></span></label>
    <label className="toggle-row"><span>The collection<small>Show the work, products, or possibilities.</small></span><input type="checkbox" id="section-collection" /><span className="switch" aria-hidden="true"></span></label>
    <label className="toggle-row"><span>Say hello<small>Help visitors get in touch.</small></span><input type="checkbox" id="section-contact" /><span className="switch" aria-hidden="true"></span></label>
   </div>
   <div className="design-footer"><button type="submit" className="button primary">Apply your changes <Icon name="arrow-right" /></button><span>Changes are saved in version history.</span></div>
  </fieldset></form>
 </section>

 <section className="panel panel-history" id="panel-history" aria-labelledby="history-title" hidden={true}>
  <div className="panel-heading"><h2 id="history-title">Version history</h2></div>
  <p className="panel-description">Review and restore earlier versions of this website.</p>
  <div id="history-list" className="history-list"></div>
  <div className="history-note"><Icon name="info" /><p>Restoring a version keeps later versions available. A new change from there starts a new direction.</p></div>
 </section>
</aside>

<section className="preview-panel" id="site-canvas" aria-label="Website canvas" tabIndex="-1">
 <div className="workbench" id="workbench" data-view="preview">
  <section className="code-view" id="code-view" aria-label="Editable website files" hidden={true}>
   <aside className="file-explorer">
    <div className="explorer-title"><span>Files</span><span>3</span></div>
    <label className="file-search"><Icon name="magnifying-glass" /><input type="search" id="file-search" placeholder="Find a file…" aria-label="Find a file" /></label>
    <div id="file-list" className="file-list"></div>
    <p id="no-files" hidden={true}>No matching files.</p>
    <div className="asset-note"><span>assets/</span></div>
   </aside>
   <div className="source-pane">
    <div className="file-tabs" role="group" aria-label="Open source files" id="file-tabs"></div>
    <div className="source-toolbar"><button id="toggle-files" className="icon-button" aria-label="Toggle file explorer" aria-expanded="true"><Icon name="sidebar-simple" /></button><span id="source-path">index.html</span><button className="icon-button" id="copy-code" aria-label="Copy current file" title="Copy current file"><Icon name="copy" /></button></div>
    <div className="code-editor" id="code-editor"><div className="line-gutter" aria-hidden="true"><pre id="line-numbers">1</pre></div><div className="source-scroll" id="source-scroll"><pre className="source-highlight" aria-hidden="true"><code id="source-highlight"></code></pre><textarea id="source-input" aria-label="Edit index.html" wrap="off" spellCheck="false" autoCapitalize="off" autoComplete="off" autoCorrect="off" maxLength="500000"></textarea></div></div>
    <div className="editor-status"><span id="editor-mode">HTML</span><span id="cursor-position">Ln 1, Col 1</span><span>UTF-8</span></div>
   </div>
  </section>
  <div className="canvas-view" id="canvas-view">
   <div className="canvas-controls">
    <div className="device-picker" role="group" aria-label="Preview device">
     <button data-device="responsive" className="is-active" aria-pressed="true" aria-label="Responsive preview" title="Responsive · fits the panel"><Icon name="arrows-horizontal" /></button>
     <button data-device="desktop" aria-pressed="false" aria-label="Desktop preview" title="Desktop · 1280 px"><Icon name="desktop" /></button>
     <button data-device="tablet" aria-pressed="false" aria-label="Tablet preview" title="Tablet · 768 px"><Icon name="device-tablet" /></button>
     <button data-device="mobile" aria-pressed="false" aria-label="Mobile preview" title="Mobile · 390 px"><Icon name="device-mobile" /></button>
    </div>
    <span className="canvas-location" id="canvas-project-name">Your draft</span>
    <div className="preview-tools">
     <button className="icon-button" id="refresh-preview" aria-label="Refresh preview" title="Refresh preview"><Icon name="arrow-clockwise" /></button>
     <button className="icon-button" id="open-preview" aria-label="Open preview in a new tab" title="Open preview in a new tab"><Icon name="arrow-square-out" /></button>
     <label className="zoom-control"><span className="sr-only">Preview zoom</span><select id="zoom-select"><option value="fit">Fit</option><option value="0.5">50%</option><option value="0.75">75%</option><option value="1">100%</option></select></label>
    </div>
   </div>
   <div className="preview-pending" id="preview-pending" hidden={true}>Code draft saved. Run to update the preview.<button id="run-pending">Run preview</button></div>
   <div className="canvas-stage" id="canvas-stage"><div className="frame-wrap" id="frame-wrap"><iframe id="website-frame" title="Your website preview" sandbox="allow-scripts" referrerPolicy="no-referrer"></iframe></div></div>
   <div className="canvas-footer"><span id="frame-size">Responsive · 100%</span><button id="canvas-design-shortcut">Design settings <Icon name="arrow-right" /></button></div>
  </div>
 </div>
 <section className="diagnostics" id="diagnostics" aria-label="Preview diagnostics">
  <div className="diagnostic-tabs">
   <button data-diagnostic="console" aria-expanded="false"><Icon name="terminal-window" />Console <span id="console-count">0</span></button>
   <button data-diagnostic="checks" aria-expanded="false"><Icon name="warning-circle" />Checks <span id="check-count">—</span></button>
   <button className="icon-button" id="close-diagnostics" aria-label="Close diagnostics" hidden={true}><Icon name="caret-down" /></button>
  </div>
  <div className="diagnostic-content" id="diagnostic-content" hidden={true}><div id="console-output" role="log" aria-label="Preview console"></div><div id="check-output" hidden={true}></div></div>
 </section>
 <footer className="workbench-status"><span id="preview-status"><i></i>Preview ready</span><span className="save-status" id="save-status" role="status"><span></span>Saved in this browser</span><div className="undo-actions"><button className="icon-button" id="undo" aria-label="Undo last change" title="Undo last change" disabled={true}><Icon name="arrow-u-up-left" /></button><button className="icon-button" id="redo" aria-label="Redo change" title="Redo change" disabled={true}><Icon name="arrow-u-up-right" /></button></div></footer>
</section>

</main>
</div>

<dialog id="projects-dialog" aria-labelledby="projects-title">
 <div className="dialog-heading"><h2 id="projects-title">Your projects</h2><button className="icon-button" data-close-dialog={true} aria-label="Close projects"><Icon name="x" bold /></button></div>
 <p className="dialog-intro">Open a saved project or rename the current one.</p>
 <form id="rename-form" className="rename-form"><label htmlFor="project-name-input">Current project name</label><div><input id="project-name-input" maxLength="60" required={true} /><button type="submit" className="button primary">Rename</button></div></form>
 <div id="project-list" className="project-list"></div>
 <a className="new-project" href="/dashboard#new"><Icon name="plus" bold />New website</a>
</dialog>
<dialog id="ai-dialog" aria-labelledby="ai-title">
 <div className="dialog-heading"><h2 id="ai-title">Build with <span data-ai-name={true}>GPT</span></h2><button className="icon-button" data-close-dialog={true} aria-label="Close AI setup"><Icon name="x" bold /></button></div>
 <p className="dialog-intro" id="ai-setup-status">Checking your local connection…</p>
 <div className="ai-setup-copy"><p>Your key lives in <code>.env</code> in the Draftmango folder, beside <code>serve.mjs</code>. Set <code id="ai-key-variable">OPENAI_API_KEY</code> and save the file.</p><p>Switch models in the conversation composer. <code id="ai-model-variable">OPENAI_MODEL</code> sets this provider’s default in .env. Saving a key takes effect on your next request.</p><p>Generating sends your prompt, recent conversation and current website files to <span data-ai-service={true}>OpenAI</span>. API usage is billed to your <span data-ai-service={true}>OpenAI</span> account. Projects use your connected Draftmango account.</p></div>
 <button type="button" className="button primary" id="check-ai">Check connection</button>
</dialog>
<dialog id="help-dialog" aria-labelledby="help-title">
 <div className="dialog-heading"><h2 id="help-title">Workspace guide</h2><button className="icon-button" data-close-dialog={true} aria-label="Close workspace guide"><Icon name="x" bold /></button></div>
 <p className="dialog-intro">Build, edit and manage your website from one workspace.</p>
 <div className="guide-items">
  <div><Icon name="chats-circle" /><div><strong>Build with AI</strong><p>Describe your website or a change in your own words. Draftmango asks one question at a time, proposes a short plan, and builds once you approve it. Each applied change stays in History.</p></div></div>
  <div><Icon name="brackets-curly" /><div><strong>Edit your code</strong><p>Edit React components, CSS and JavaScript. Drafts save as you type; Run applies them and creates a version in History. Ctrl/Cmd + S also runs the preview, which is isolated from your account.</p></div></div>
  <div><Icon name="sliders-horizontal" /><div><strong>Design settings</strong><p>Change the name, words, palette and layout in Design, and check desktop, tablet and phone sizes.</p></div></div>
  <div><Icon name="clock-counter-clockwise" /><div><strong>Version history</strong><p>Undo, redo or restore an earlier version. Projects sync to your account when the account service is available.</p></div></div>
  <div><Icon name="rocket-launch" /><div><strong>Export and publish</strong><p>Download your React source as a ZIP or a compiled HTML snapshot, or publish the saved site on a Draftmango address.</p></div></div>
 </div>
 <button className="button primary guide-cta" data-close-dialog={true}>Got it <Icon name="arrow-right" /></button>
</dialog>
<div id="toast" className="toast" role="status" hidden={true}></div>
<noscript><div className="noscript">This workspace needs JavaScript to preview and edit your draft. <a href="/">Return to the homepage.</a></div></noscript>

<PageControllers scripts={["/project-format.js", "/templates-model.js", "/conversation.js", "/builder-flow.js", "/builder-prompts.js", "/workspace-assets.js", "/workspace-model.js", "/workspace-code.js", "/workspace-files.js", "/dashboard-model.js", "/workspace-ai.js", "/account-store.js", "/accounts.js", "/workspace-common.js", "/workspace.js", "/publishing.js", "/workspace-extra.js"]} />
</>;
}
