import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import FramoRuntime from "../../../components/FramoRuntime";
import TemplateLibrary from "../../../components/TemplateLibrary";
export default function Page(){return <><SiteHeader current="/templates"/><main id="main"><section className="custom-ph dm-page-hero"><div className="container"><p className="dm-eyebrow">THE TEMPLATE LIBRARY</p><h1 className="custom-ph-title">Find a design.<br/><span className="custom-ph-key">Make it yours.</span></h1><p className="custom-lead">100 complete designs, crafted by people. Explore the collection and choose the starting point for your next website.</p></div></section><section className="custom-section"><div className="container"><TemplateLibrary/></div></section></main><SiteFooter/><FramoRuntime/></>;}
