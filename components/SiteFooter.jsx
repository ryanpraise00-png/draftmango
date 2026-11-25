// Draftmango's public footer, built from the Draftmango SaaS Automation headline footer.
import {Brand} from "./SiteHeader";

const news = [
  ["2026-11-24", "24 Nov", "More room to build on mobile", "/help#workspace"],
  ["2026-10-28", "28 Oct", "Sign in with Google", "/auth#mode=login"],
  ["2026-10-26", "26 Oct", "Version history for every project", "/help#data"],
];
const columns = [
  ["Product", [["Website builder", "/#idea"], ["How it works", "/#how-it-works"], ["Pricing", "/pricings"]]],
  ["Resources", [["Help centre", "/help"], ["Using the workspace", "/help#workspace"], ["Domains & publishing", "/help#domains"], ["Plans & billing", "/help#billing"]]],
  ["Company", [["About Draftmango", "/about"], ["Contact", "/help#support"], ["Terms of service", "/legal#terms"], ["Privacy", "/legal#privacy"], ["Cookies & storage", "/legal#cookies"]]],
];

export default function SiteFooter() {
  return <footer className="site-footer site-footer--dark footer-headline custom-footer isolate overflow-hidden">
    <div className="glow custom-footer-glow -bottom-72 -left-48" aria-hidden="true"></div>
    <div className="footer-main">
      <div className="container">
        <div className="custom-footer-statement grid grid-cols-[auto_minmax(2.5rem,1fr)] grid-rows-[auto_auto] max-md:grid-cols-1 mb-[clamp(4rem,3rem_+_4vw,7rem)]" data-anim="">
          <h2 className="footer-heading [grid-area:1/1] m-0 font-heading text-(length:--custom-footer-fs) font-bold leading-[0.95] tracking-[-0.055em] whitespace-nowrap max-md:whitespace-normal text-(--custom-on-dark)" data-anim="fade-up">Make it yours.</h2>
          <span className="custom-footer-wire [grid-area:1/2] mt-[calc(var(--custom-footer-fs)_*_0.74)] -mb-6 mr-[4.4rem] ml-2 max-md:hidden" aria-hidden="true"></span>
          <div className="[grid-area:2/1/3/3] max-md:[grid-area:2/1] [justify-self:end] max-md:[justify-self:start] flex flex-wrap items-center justify-end max-md:justify-start gap-y-4 gap-x-6 mt-6" data-anim="fade-up" data-anim-delay="200">
            <p className="m-0 text-[1rem] text-(--custom-on-dark-meta)">Free to start, with 500 AI credits to try.</p>
            <a href="/#idea" className="btn btn-primary btn-lg">Start free</a>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,1fr))] gap-y-12 gap-x-8">
          <div className="col-span-full lg:col-[auto] lg:pr-12" data-anim="fade-up">
            <h3 className="footer-col-title">What's new</h3>
            <ol className="custom-footer-releases grid gap-0 m-0 p-0 list-none">
              {news.map(([date, label, title, href], i) => <li key={title} className={i ? undefined : "pt-0"}>
                <span className="custom-footer-release-meta"><time dateTime={date}>{label}</time></span>
                <a href={href}>{title}</a>
              </li>)}
            </ol>
            <a href="/help" className="custom-footer-all inline-flex items-center gap-1.5 mt-5 text-[0.9375rem] font-semibold text-(--custom-on-dark)">Help centre <i className="ph ph-arrow-right" aria-hidden="true"></i></a>
          </div>
          {columns.map(([title, links], i) => <nav key={title} aria-label={title} data-anim="fade-up" data-anim-delay={String(80 + i * 60)}>
            <h3 className="footer-col-title">{title}</h3>
            <ul className="footer-links">{links.map(([label, href]) => <li key={label}><a href={href}>{label}</a></li>)}</ul>
          </nav>)}
        </div>
      </div>
    </div>
    <div className="footer-bottom">
      <div className="container footer-bottom-inner custom-footer-bottom lg:justify-start gap-y-4 gap-x-7">
        <Brand className="text-[1.25rem]" />
        <span className="custom-status custom-status--wait custom-footer-status">Launch preview</span>
        <p className="m-0 lg:ml-auto text-[0.875rem] max-w-[46rem]">&copy; 2026 DROPCIRCLE LTD, registered in England and Wales, company no. 17464240. Office 20114, 182–184 High Street North, East Ham, London, E6 2JA.</p>
      </div>
    </div>
  </footer>;
}
