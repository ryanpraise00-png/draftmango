// The Draftmango SaaS Automation stylesheets, in the template's own order. Public pages add their own sheets, then /site.css.
export const draftmangoStyles = [
  "https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
  "/draftmango/assets/css/icons.css",
  "/draftmango/assets/css/app.css",
  "/draftmango/assets/css/vendor.css",
  "/draftmango/assets/css/demos/demo-automation-1.css",
  "/draftmango/assets/css/themes/demo-automation-1.css",
  "/draftmango/assets/css/custom.css",
];
export const publicStyles = (...pageStyles) => [...draftmangoStyles, ...pageStyles, "/site.css"];
