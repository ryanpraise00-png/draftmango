import PageControllers from "../../../components/PageControllers";

export default function Page() {
  return <>

<svg className={"symbols"} xmlns={"http://www.w3.org/2000/svg"} aria-hidden={"true"}>
<symbol id={"mango"} viewBox={"0 0 44 48"}><path d={"M25 10C12 8 4 19 5 31c1 10 11 15 20 12 9-3 13-13 11-22-1-5-5-9-11-11Z"} fill={"currentColor"}></path><path d={"M25 12C25 4 31 1 39 3c-1 7-6 11-14 9Z"} fill={"#303c2b"}></path><path d={"M27 13c-2-4-5-7-9-8"} fill={"none"} stroke={"#303c2b"} strokeWidth={"2.4"} strokeLinecap={"round"}></path><path d={"M11 30c0-6 3-11 7-13"} fill={"none"} stroke={"#fff9e9"} strokeWidth={"2.5"} strokeLinecap={"round"}></path></symbol>
<symbol id={"arrow"} viewBox={"0 0 24 24"}><path d={"M5 12h14m-6-6 6 6-6 6"}></path></symbol>
<symbol id={"eye"} viewBox={"0 0 24 24"}><path d={"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"}></path><circle cx={"12"} cy={"12"} r={"3"}></circle></symbol>
<symbol id={"eye-off"} viewBox={"0 0 24 24"}><path d={"m3 3 18 18M10.6 5.1C17.7 4 22 12 22 12a19 19 0 0 1-3.1 3.9M6.2 6.3A22 22 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 5.4-1.5M10 10a3 3 0 0 0 4 4"}></path></symbol>
<symbol id={"check"} viewBox={"0 0 24 24"}><path d={"m5 12 4 4L19 6"}></path></symbol>
</svg>
<a className={"skip-link"} href={"#account"}>{"Skip to sign in"}</a>
<div className={"auth-layout"}>
<aside className={"welcome-panel"} aria-label={"Welcome to Draftmango"}>
<a className={"brand"} href={"/"} aria-label={"Draftmango home"}><svg className={"brand-mark"} aria-hidden={"true"}><use href={"#mango"}></use></svg><span>{"draftmango"}<span className={"brand-period"}>{"."}</span></span></a>
<div className={"welcome-content"}>
<span className={"eyebrow"}>{"YOUR NEXT PROJECT STARTS HERE"}</span>
<h1>{"Your next website."}<br />{"Built around your idea."}</h1>
<p>{"Build with AI. Refine in your workspace."}<br />{"Keep your ideas, conversations and code together."}</p>
<div className={"draft-illustration"} aria-hidden={"true"}>
<div className={"browser-bar"}><span className={"browser-dots"}><i></i><i></i><i></i></span><span>{"Website concept · Form & Field"}</span><svg className={"icon"}><use href={"#arrow"}></use></svg></div>
<div className={"showcase-site"}>
<div className={"showcase-nav"}><strong>{"form "}<em>{"&"}</em>{" field"}<span>{"®"}</span></strong><span>{"Shop    Our story    Journal"}</span><span className={"showcase-bag"}>{"Bag "}<b>{"0"}</b></span></div>
<div className={"showcase-hero"}>
<div className={"showcase-copy"}><span className={"showcase-eyebrow"}>{"LESS, BUT LOVELIER."}</span><strong>{"Objects for"}<br /><em>{"the everyday."}</em></strong><p>{"Thoughtful pieces. Everyday rituals."}</p><span className={"showcase-cta"}>{"Explore the collection "}<span>{"↗"}</span></span></div>
<div className={"showcase-photo"}><img src={"/assets/ceramics.jpg"} alt={""} width={"900"} height={"600"} /><span className={"collection-label"}>{"THE EVERYDAY COLLECTION   /   01"}</span><span className={"photo-stamp"}>{"MADE"}<br />{"TO BE"}<br />{"KEPT."}</span></div>
</div>
<div className={"showcase-values"}><span>{"✳   Made with intention"}</span><span>{"Natural materials"}</span><span>{"A little less ordinary"}</span></div>
<div className={"showcase-products"}>
<div className={"products-heading"}><strong>{"A few everyday favorites."}</strong><span>{"Shop all pieces ↗"}</span></div>
<div className={"product-grid"}><div className={"product-card"}><div className={"product-photo product-plate"}><img src={"/assets/ceramics.jpg"} alt={""} /><span>{"BEST LOVED"}</span></div><div><span>{"The everyday plate"}</span><span>{"$32"}</span></div></div><div className={"product-card"}><div className={"product-photo product-bowl"}><img src={"/assets/ceramics.jpg"} alt={""} /></div><div><span>{"The morning bowl"}</span><span>{"$28"}</span></div></div><div className={"product-card"}><div className={"product-photo product-set"}><img src={"/assets/ceramics.jpg"} alt={""} /></div><div><span>{"A little gathering"}</span><span>{"$86"}</span></div></div></div>
</div>
</div>
</div>
<div className={"brand-note"}><span className={"idea-icon"} aria-hidden={"true"}><svg className={"icon"}><use href={"#check"}></use></svg></span><div><span>{"Every detail is yours to shape."}</span><p>{"Chat, edit and preview in one workspace."}</p></div></div>
</div>
<div className={"welcome-footer"}><span>{"Draftmango · Build what you have in mind."}</span><span className={"footer-dot"} aria-hidden={"true"}></span></div>
</aside>
<main className={"account-panel"} id={"account"} tabIndex={"-1"}>
<div className={"account-top"}><a href={"/#idea"} className={"back-link"}><span aria-hidden={"true"}>{"←"}</span>{" Back to your idea"}</a><span className={"preview-badge"}>{"Draftmango account"}</span></div>
<div className={"account-body"}>
<div className={"account-content"}>
<h2 id={"form-title"}>{"Welcome back"}</h2>
<p className={"form-intro"} id={"form-intro"}>{"Sign in to Draftmango to continue your conversations and saved projects."}</p>
<form id={"auth-form"} aria-labelledby={"form-title"} aria-describedby={"form-intro"}>
<div className={"form-field"} id={"email-field"}><input id={"email"} type={"email"} autoComplete={"email"} inputMode={"email"} placeholder={" "} maxLength={"254"} required={true} /><label htmlFor={"email"}>{"Email address"}</label></div>
<div className={"email-summary"} id={"email-summary"} hidden={true}><span id={"entered-email"}></span><button type={"button"} id={"change-email"}>{"Edit"}</button></div>
<div className={"form-field"} id={"password-field"} hidden={true}><div className={"password-input"}><input id={"password"} type={"password"} autoComplete={"current-password"} placeholder={" "} maxLength={"128"} required={true} disabled={true} aria-describedby={"password-hint"} /><label htmlFor={"password"}>{"Password"}</label><button type={"button"} id={"toggle-password"} aria-label={"Show password"} aria-pressed={"false"}><svg className={"icon"} aria-hidden={"true"}><use href={"#eye"}></use></svg></button></div><p className={"field-hint"} id={"password-hint"} hidden={true}>{"Use at least 8 characters."}</p><button className={"text-button forgot-password"} type={"button"} id={"forgot-password"} hidden={true}>{"Forgot password?"}</button></div>
<button type={"submit"} className={"primary-button"} id={"submit-auth"}>{"Continue"}</button>
</form>
<p className={"switch-copy"}><span id={"switch-copy"}>{"Don’t have an account?"}</span>{" "}<button type={"button"} className={"text-button"} id={"switch-mode"}>{"Sign up"}</button></p>
<div id={"social-options"} hidden={true}>
<div className={"or-divider"}><span></span>{"OR"}<span></span></div>
<div className={"provider-list"} role={"group"} aria-label={"Social sign-in options"} aria-describedby={"social-status"}>
<button className={"provider-button"} type={"button"} data-provider={"Google"} disabled={true} aria-describedby={"social-status"}><svg viewBox={"0 0 24 24"} aria-hidden={"true"}><path fill={"#4285F4"} d={"M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"}></path><path fill={"#34A853"} d={"M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.75-5.59-4.1H3.07v2.59A10 10 0 0 0 12 22Z"}></path><path fill={"#FBBC05"} d={"M6.41 13.94a6 6 0 0 1 0-3.88V7.47H3.07a10 10 0 0 0 0 9.06l3.34-2.59Z"}></path><path fill={"#EA4335"} d={"M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.47l3.34 2.59A6 6 0 0 1 12 5.96Z"}></path></svg><span className={"provider-label"}>{"Continue with Google"}</span></button>
<button className={"provider-button"} type={"button"} data-provider={"Apple"} disabled={true} aria-describedby={"social-status"}><svg viewBox={"0 0 24 24"} aria-hidden={"true"}><path fill={"currentColor"} d={"M17.1 12.4c0-2 1.6-3 1.7-3.1-1-1.5-2.6-1.7-3.2-1.7-1.4-.2-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 7 1.1 9.3.8 1.1 1.7 2.3 2.9 2.2 1.1 0 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2-1.1 2.8-2.2a10.7 10.7 0 0 0 1.3-2.7c-.1 0-2.5-1-2.5-4ZM14.8 6.1a4.2 4.2 0 0 0 1-3c-1 .1-2.3.7-3 1.5-.7.7-1.2 1.9-1.1 2.9 1.1.1 2.3-.6 3.1-1.4Z"}></path></svg><span className={"provider-label"}>{"Continue with Apple"}</span></button>
<button className={"provider-button"} type={"button"} data-provider={"Microsoft"} disabled={true} aria-describedby={"social-status"}><svg viewBox={"0 0 24 24"} aria-hidden={"true"}><path fill={"#f25022"} d={"M2 2h9v9H2z"}></path><path fill={"#7fba00"} d={"M13 2h9v9h-9z"}></path><path fill={"#00a4ef"} d={"M2 13h9v9H2z"}></path><path fill={"#ffb900"} d={"M13 13h9v9h-9z"}></path></svg><span className={"provider-label"}>{"Continue with Microsoft"}</span></button>
<button className={"provider-button"} type={"button"} data-provider={"GitHub"} disabled={true} aria-describedby={"social-status"}><svg viewBox={"0 0 24 24"} aria-hidden={"true"}><path fill={"currentColor"} d={"M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.37-1.18-3.37-1.18-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.6 9.6 0 0 1 12 6.82c.85 0 1.71.11 2.51.34 1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.75c0 .26.18.57.69.48A10 10 0 0 0 12 2Z"}></path></svg><span className={"provider-label"}>{"Continue with GitHub"}</span></button>
</div>
<p id={"social-status"} className={"social-status"}>{"Social sign-in is coming soon. Use email to continue."}</p>
</div>
<p id={"signup-terms"} className={"signup-terms"} hidden={true}>{"By creating an account, you agree to our "}<a href={"/legal#terms"} target={"_blank"} rel={"noopener noreferrer"}>{"Terms of Service"}</a>{". Read our "}<a href={"/legal#privacy"} target={"_blank"} rel={"noopener noreferrer"}>{"Privacy Policy"}</a>{"."}</p>
<div className={"auth-feedback"} id={"auth-feedback"} role={"status"} tabIndex={"-1"} hidden={true}></div>
<noscript><p className={"noscript-note"}>{"Enable JavaScript to sign in securely."}</p></noscript>
</div>
</div>
<footer className={"account-footer"}><nav className={"legal-links"} aria-label={"Legal"}><a href={"/legal#terms"} target={"_blank"} rel={"noopener noreferrer"}>{"Terms of Service"}</a><span aria-hidden={"true"}>{"|"}</span><a href={"/legal#privacy"} target={"_blank"} rel={"noopener noreferrer"}>{"Privacy Policy"}</a></nav></footer>
</main>
</div>

<PageControllers scripts={["/project-format.js", "/dashboard-model.js", "/account-store.js", "/accounts.js", "/auth.js"]} />
</>;
}
