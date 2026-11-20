// Draftmango's public header, built from the Framo SaaS Automation navbar.
// Framo's main.js runs the menus, the mobile panel and the hide-on-scroll reveal.
const build = [
  ["Template library", "/templates", "ph-squares-four", "var(--color-primary)", "100 designer-made websites to start from."],
  ["AI conversation", "/#how-it-works", "ph-sparkle", "#7a5cf0", "Describe a change, then review the result."],
  ["Code editor", "/help#workspace", "ph-brackets-curly", "#0f9488", "Edit your site's React source directly."],
  ["Preview modes", "/help#workspace", "ph-devices", "#2f6fe4", "Check every page on desktop and mobile."],
];
const launch = [
  ["Publishing", "/help#domains", "ph-rocket-launch", "#d9467a", "Put your website online when it is ready."],
  ["Custom domains", "/help#domains", "ph-globe-simple", "#c98a12", "Connect your domain or buy a new one."],
  ["Project history", "/help#data", "ph-clock-counter-clockwise", "#5b5bd6", "Every saved version of your project."],
  ["Source export", "/help#exports", "ph-download-simple", "oklch(from var(--color-secondary-base) calc(l + 0.15) c h)", "Take a copy of your code at any time."],
];
const help = [
  ["Help centre", "/help", "ph-lifebuoy"],
  ["Domains & publishing", "/help#domains", "ph-globe-simple"],
  ["Plans & billing", "/help#billing", "ph-credit-card"],
  ["About Draftmango", "/about", "ph-info"],
];

function Service([label, href, icon, colour, caption]) {
  const id = "dm-menu-" + label.toLowerCase().replace(/\W+/g, "-");
  return <div key={label} className="megamenu-service" style={{"--custom-glyph": colour}}>
    <a href={href} className="megamenu-item" aria-describedby={id}><span className="megamenu-icon" aria-hidden="true"><i className={"ph-bold " + icon}></i></span>{label}</a>
    <p id={id} className="megamenu-caption">{caption}</p>
  </div>;
}

export function Brand({className = ""}) {
  return <a href="/" className={"brand dm-brand " + className} aria-label="Draftmango home">
    <img src="/assets/favicon.svg" alt="" width="24" height="28" />
    <span>draftmango.</span>
  </a>;
}

export default function SiteHeader({current = "/"}) {
  const link = (href, label) => <a href={href} className={"nav-link" + (current === href ? " active" : "")} aria-current={current === href ? "page" : undefined}>{label}</a>;
  return <header className="site-header header-transparent header-ink header-reveal" data-header="">
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-inner container">
        <Brand />
        <ul className="nav-links" role="list">
          <li>{link("/", "Home")}</li>
          <li className="nav-megamenu nav-megamenu--services nav-megamenu--grid nav-megamenu--icons custom-menu-platform">
            <button className="nav-link">Product <i className="ph ph-caret-down transition-transform duration-200"></i></button>
            <div className="megamenu-panel" data-lenis-prevent="">
              <div className="megamenu-inner container">
                <div className="megamenu-col megamenu-services">
                  <div className="megamenu-col-title">Build</div>
                  {build.map(Service)}
                </div>
                <div className="megamenu-col megamenu-services">
                  <div className="megamenu-col-title">Launch</div>
                  {launch.map(Service)}
                </div>
                <a href="/templates" className="custom-menu-promo flex flex-col gap-1.5 p-5 text-(--custom-on-dark-soft) bg-(--custom-ink) rounded-xl">
                  <span className="custom-menu-promo-art dm-menu-promo-art relative block flex-1 min-h-28 mb-5 rounded-lg overflow-hidden" aria-hidden="true">
                    <img src="/framo/shots/architecture-studio-1-wide.jpg" alt="" width="1440" height="900" loading="lazy" decoding="async" />
                  </span>
                  <span className="font-heading text-[1.25rem] font-bold tracking-[-0.03em] text-(--custom-on-dark)">100 templates</span>
                  <span className="text-[0.9375rem] leading-[1.45]">Studios, restaurants, shops and more.</span>
                  <span className="custom-menu-promo-link inline-flex items-center gap-1.5 pt-3.5 text-[0.9375rem] font-semibold text-(--custom-on-dark)">Browse templates <i className="ph ph-arrow-right" aria-hidden="true"></i></span>
                </a>
                <div className="megamenu-col megamenu-foot">
                  <p className="megamenu-foot-note">Design, conversation and code in one workspace.</p>
                  <a href="/#how-it-works" className="megamenu-item btn-link-arrow"><span className="link-arrow" aria-hidden="true"></span>How it works</a>
                </div>
              </div>
            </div>
          </li>
          <li>{link("/templates", "Templates")}</li>
          <li>{link("/pricings", "Pricing")}</li>
          <li className="nav-cascade">
            <button className="nav-link">Help <i className="ph ph-caret-down transition-transform duration-200"></i></button>
            <div className="cascade-panel custom-menu-resources">
              {help.map(([label, href, icon]) => <a key={label} href={href} className="cascade-item"><i className={"ph " + icon} aria-hidden="true"></i>{label}</a>)}
            </div>
          </li>
        </ul>
        <div className="nav-actions">
          <div className="nav-meta"></div>
          <a href="/auth#mode=login" className="custom-nav-login py-2 px-3.5 text-[0.9375rem] font-semibold whitespace-nowrap max-xl:hidden">Log in</a>
          <a href="/#idea" className="btn btn-primary px-5 max-[480px]:hidden">Start free</a>
          <button className="hamburger" data-toggle="" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open navigation menu">
            <i className="ph ph-list text-xl nav-toggle-open" aria-hidden="true"></i>
            <i className="ph ph-x text-xl nav-toggle-close" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      <div id="mobile-nav" className="mobile-nav" data-mobile-nav="" data-lenis-prevent="" role="dialog" aria-modal="true" aria-label="Site navigation">
        <div className="nav-panel-menu">
          <div data-mobile-links=""></div>
          <div className="nav-panel-cta flex custom-panel-cta gap-2.5 mt-6">
            <a href="/auth#mode=login" className="btn btn-outline-dark flex-1 justify-center">Log in</a>
            <a href="/#idea" className="btn btn-primary flex-1 justify-center">Start free</a>
          </div>
        </div>
      </div>
    </nav>
  </header>;
}
