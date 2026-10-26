import PageControllers from "../../../components/PageControllers";

export default function Page() {
  return <>
<svg className={"symbols"} aria-hidden={"true"} xmlns={"http://www.w3.org/2000/svg"}>
<symbol id={"globe"} viewBox={"0 0 24 24"}><circle cx={"12"} cy={"12"} r={"9"}></circle><ellipse cx={"12"} cy={"12"} rx={"4"} ry={"9"}></ellipse><path d={"M3 12h18"}></path></symbol>
<symbol id={"link"} viewBox={"0 0 24 24"}><path d={"m9 15 6-6M8 17l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2-1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"} transform={"translate(1 -1)"}></path></symbol>
<symbol id={"check"} viewBox={"0 0 24 24"}><path d={"m5 12 4 4L19 6"}></path></symbol>
<symbol id={"mango"} viewBox={"0 0 44 48"}><path d={"M25 10C12 8 4 19 5 31c1 10 11 15 20 12 9-3 13-13 11-22-1-5-5-9-11-11Z"} fill={"currentColor"}></path><path d={"M25 12C25 4 31 1 39 3c-1 7-6 11-14 9Z"} fill={"#45543a"}></path><path d={"M27 13c-2-4-5-7-9-8"} fill={"none"} stroke={"#45543a"} strokeWidth={"2.4"} strokeLinecap={"round"}></path><path d={"M11 30c0-6 3-11 7-13"} fill={"none"} stroke={"#fff9e9"} strokeWidth={"2.5"} strokeLinecap={"round"}></path></symbol>
<symbol id={"home"} viewBox={"0 0 24 24"}><rect x={"3"} y={"3"} width={"7"} height={"7"} rx={"1.5"}></rect><rect x={"14"} y={"3"} width={"7"} height={"7"} rx={"1.5"}></rect><rect x={"3"} y={"14"} width={"7"} height={"7"} rx={"1.5"}></rect><rect x={"14"} y={"14"} width={"7"} height={"7"} rx={"1.5"}></rect></symbol>
<symbol id={"folder"} viewBox={"0 0 24 24"}><path d={"M3 7V4h7l2 3h9v13H3V7Z"}></path></symbol>
<symbol id={"sliders"} viewBox={"0 0 24 24"}><path d={"M5 3v6m0 4v8M12 3v11m0 4v3m7-18v3m0 4v11M2 9h6m1 5h6m1-8h6"}></path></symbol>
<symbol id={"plus"} viewBox={"0 0 24 24"}><path d={"M12 5v14M5 12h14"}></path></symbol>
<symbol id={"arrow"} viewBox={"0 0 24 24"}><path d={"M5 12h14m-5-5 5 5-5 5"}></path></symbol>
<symbol id={"up"} viewBox={"0 0 24 24"}><path d={"M12 20V4m-6 6 6-6 6 6"}></path></symbol>
<symbol id={"external"} viewBox={"0 0 24 24"}><path d={"M6 18 18 6M7 6h11v11"}></path></symbol>
<symbol id={"spark"} viewBox={"0 0 24 24"}><path d={"m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"}></path></symbol>
<symbol id={"search"} viewBox={"0 0 24 24"}><circle cx={"10.5"} cy={"10.5"} r={"6.5"}></circle><path d={"m16 16 5 5"}></path></symbol>
<symbol id={"edit"} viewBox={"0 0 24 24"}><path d={"m14 4 6 6M4 20l5-1L21 7l-5-5L4 14v6Z"}></path></symbol>
<symbol id={"close"} viewBox={"0 0 24 24"}><path d={"m6 6 12 12M6 18 18 6"}></path></symbol>
<symbol id={"menu"} viewBox={"0 0 24 24"}><path d={"M4 6h16M4 12h16M4 18h16"}></path></symbol>
<symbol id={"leaf"} viewBox={"0 0 24 24"}><path d={"M20 3C8 2 2 8 5 15s14 8 15-12ZM4 21 15 10"}></path></symbol>
<symbol id={"terminal"} viewBox={"0 0 24 24"}><rect x={"2"} y={"4"} width={"20"} height={"16"} rx={"3"}></rect><path d={"m6 9 3 3-3 3m6 0h5"}></path></symbol>
<symbol id={"download"} viewBox={"0 0 24 24"}><path d={"M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"}></path></symbol>
<symbol id={"lock"} viewBox={"0 0 24 24"}><rect x={"4"} y={"10"} width={"16"} height={"11"} rx={"2"}></rect><path d={"M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"}></path></symbol>
</svg><a className={"skip-link"} href={"#main"}>{"Skip to workspace"}</a><button id={"sidebar-scrim"} className={"sidebar-scrim"} aria-label={"Close navigation"} hidden={true}></button><aside className={"sidebar ws-sidebar"} id={"sidebar"} aria-label={"Workspace navigation"}></aside><div className={"ws-app"}><header className={"ws-mobile-header"}><button id={"open-sidebar"} className={"icon-button"} aria-label={"Open workspace navigation"} aria-expanded={"false"}><svg className={"icon"}><use href={"#menu"}></use></svg></button><a className={"brand"} href={"/dashboard"}><svg className={"brand-mark"}><use href={"#mango"}></use></svg><span>{"draftmango."}</span></a><button className={"icon-button"} id={"mobile-build-settings"} aria-label={"Open build settings"}><svg className={"icon"}><use href={"#sliders"}></use></svg></button></header><div className={"account-notice"} id={"account-notice"} role={"status"} hidden={true}></div><main id={"main"} tabIndex={"-1"}></main></div><div id={"toast"} className={"toast"} role={"status"} hidden={true}></div><noscript>{"Enable JavaScript to open your workspace."}</noscript>
<PageControllers scripts={["/project-format.js", "/workspace-model.js", "/dashboard-model.js", "/account-store.js", "/accounts.js", "/workspace-code.js", "/workspace-files.js", "/workspace-common.js", "/billing.js", "/workspace-settings.js", "/domains-model.js", "/domains.js", "/workspace-dashboard.js"]} />
</>;
}
