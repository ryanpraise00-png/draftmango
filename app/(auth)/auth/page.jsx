import BrandMark from "../../../components/BrandMark";
import PageControllers from "../../../components/PageControllers";

export default function Page() {
  return <>

<svg className={"symbols"} xmlns={"http://www.w3.org/2000/svg"} aria-hidden={"true"}>
<symbol id={"arrow"} viewBox={"0 0 24 24"}><path d={"M5 12h14m-6-6 6 6-6 6"}></path></symbol>
<symbol id={"eye"} viewBox={"0 0 24 24"}><path d={"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"}></path><circle cx={"12"} cy={"12"} r={"3"}></circle></symbol>
<symbol id={"eye-off"} viewBox={"0 0 24 24"}><path d={"m3 3 18 18M10.6 5.1C17.7 4 22 12 22 12a19 19 0 0 1-3.1 3.9M6.2 6.3A22 22 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 5.4-1.5M10 10a3 3 0 0 0 4 4"}></path></symbol>
<symbol id={"check"} viewBox={"0 0 24 24"}><path d={"m5 12 4 4L19 6"}></path></symbol>
</svg>
<a className={"skip-link"} href={"#account"}>{"Skip to sign in"}</a>
<div className={"auth-layout"}>
<aside className={"welcome-panel"} aria-label={"Welcome to Draftmango"}>
<a className={"brand"} href={"/"} aria-label={"Draftmango home"}><BrandMark /><span className="dm-wordmark">draftmango.</span></a>
<div className={"welcome-content"}>
<span className={"eyebrow"}>{"YOUR NEXT PROJECT STARTS HERE"}</span>
<h1>{"Your next website."}<br />{"Built around your idea."}</h1>
<p>{"Build with AI. Refine in your workspace."}<br />{"Keep your ideas, conversations and code together."}</p>
<div className={"draft-illustration"} aria-hidden={"true"}>
<div className={"browser-bar"}><span className={"browser-dots"}><i></i><i></i><i></i></span><span>{"Architecture Studio · template preview"}</span><svg className={"icon"}><use href={"#arrow"}></use></svg></div>
<div className={"showcase-site sample-showcase"}><img src="/framo/shots/architecture-studio-1-wide.jpg" alt="The Architecture Studio template home page" width="1440" height="900" loading="lazy" decoding="async"/></div>
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
<div className={"provider-list"} role={"group"} aria-label={"Social sign-in options"}>
<button className={"provider-button"} type={"button"} id={"google-signin"} data-provider={"Google"}><svg viewBox={"0 0 24 24"} aria-hidden={"true"}><path fill={"#4285F4"} d={"M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"}></path><path fill={"#34A853"} d={"M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.75-5.59-4.1H3.07v2.59A10 10 0 0 0 12 22Z"}></path><path fill={"#FBBC05"} d={"M6.41 13.94a6 6 0 0 1 0-3.88V7.47H3.07a10 10 0 0 0 0 9.06l3.34-2.59Z"}></path><path fill={"#EA4335"} d={"M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.47l3.34 2.59A6 6 0 0 1 12 5.96Z"}></path></svg><span className={"provider-label"}>{"Continue with Google"}</span></button>
</div>
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
