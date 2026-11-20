// Header for the About, Help and Legal pages, matching the homepage navigation.
const links = [["Examples", "/#inspiration"], ["How it works", "/#how-it-works"], ["Pricing", "/pricings"], ["Help", "/help"]];

export default function DocumentHeader({current}) {
  return <header className="document-header">
    <div className="document-header-inner">
      <a className="brand" href="/" aria-label="Draftmango home"><img src="/assets/favicon.svg" width="25" height="29" alt="" /><span>draftmango<span className="brand-period">.</span></span></a>
      <nav aria-label="Site">{links.map(([label, href]) => <a key={href} href={href} aria-current={href === current ? "page" : undefined}>{label}</a>)}</nav>
      <div className="header-actions">
        <a className="header-signin" href="/auth#mode=login">Sign in</a>
        <a className="header-start" href="/#idea">Start creating</a>
      </div>
    </div>
  </header>;
}
