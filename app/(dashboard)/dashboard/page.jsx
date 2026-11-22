import PageControllers from "../../../components/PageControllers";

// The dashboard shell, rebuilt on the Framo SaaS Automation system ("light studio"). The sidebar and every view
// (home, chats, projects, domains, stores, settings) are drawn into it by the workspace scripts.
const Icon = ({name}) => <i className={"ph ph-" + name} aria-hidden="true"></i>;

export default function Page() {
  return <>
<a className="skip-link" href="#main">Skip to workspace</a>
<div className="app-shell">
 <button id="sidebar-scrim" className="sidebar-scrim" aria-label="Close navigation" hidden={true}></button>
 <aside className="sidebar ws-sidebar" id="sidebar" aria-label="Workspace navigation"></aside>
 <div className="ws-app">
  <header className="ws-mobile-header">
   <button id="open-sidebar" className="icon-button" aria-label="Open workspace navigation" aria-expanded="false"><Icon name="list" /></button>
   <a className="brand" href="/dashboard"><img src="/assets/favicon.svg" alt="" width="22" height="25" /><span>draftmango.</span></a>
   <button className="icon-button" id="mobile-build-settings" aria-label="Open build settings"><Icon name="sliders-horizontal" /></button>
  </header>
  <div className="account-notice" id="account-notice" role="status" hidden={true}></div>
  <main id="main" tabIndex="-1"></main>
 </div>
</div>
<div id="toast" className="toast" role="status" hidden={true}></div>
<noscript>Enable JavaScript to open your workspace.</noscript>
<PageControllers scripts={["/project-format.js", "/workspace-model.js", "/dashboard-model.js", "/account-store.js", "/accounts.js", "/workspace-code.js", "/workspace-files.js", "/workspace-ai.js", "/workspace-common.js", "/billing.js", "/workspace-settings.js", "/domains-model.js", "/domains.js", "/stores.js", "/workspace-dashboard.js"]} />
</>;
}
