// Footer shared by the public pages. UK trading disclosures (company name,
// number, place of registration and registered office) appear on every page.
const columns = [
  ["Product", [["Examples", "/#inspiration"], ["How it works", "/#how-it-works"], ["Pricing", "/pricings"]]],
  ["Company", [["About", "/about"], ["Help", "/help"], ["Contact", "/about#company"]]],
  ["Legal", [["Terms of service", "/legal#terms"], ["Privacy", "/legal#privacy"], ["Cookies & storage", "/legal#cookies"]]],
];

export default function PublicFooter() {
  return <footer className="public-footer">
    <div className="public-footer-main">
      <div className="public-footer-brand">
        <a className="brand" href="/" aria-label="Draftmango home"><img src="/assets/favicon.svg" width="25" height="29" alt="" /><span>draftmango<span className="brand-period">.</span></span></a>
        <p>Build what you have in mind.</p>
      </div>
      {columns.map(([title, links]) => <nav key={title} aria-label={title}>
        <h2>{title}</h2>
        <ul>{links.map(([label, href]) => <li key={href}><a href={href}>{label}</a></li>)}</ul>
      </nav>)}
    </div>
    <div className="public-footer-legal">
      <p className="company-disclosure">Draftmango is operated by <a href="/about#company">DROPCIRCLE LTD</a>, registered in England and Wales, company no. 17464240. Registered office: Office 20114, 182–184 High Street North, East Ham, London, E6 2JA, United Kingdom.</p>
      <span>© 2026 DROPCIRCLE LTD</span>
    </div>
  </footer>;
}
