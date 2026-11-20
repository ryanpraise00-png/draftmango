// The Framo SaaS Automation stylesheets, in the template's own order. Public pages add their own sheets, then /site.css.
export const framoStyles = [
  "https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
  "/framo/assets/css/icons.css",
  "/framo/assets/css/app.css",
  "/framo/assets/css/vendor.css",
  "/framo/assets/css/demos/demo-automation-1.css",
  "/framo/assets/css/themes/demo-automation-1.css",
  "/framo/assets/css/custom.css",
];
export const publicStyles = (...pageStyles) => [...framoStyles, ...pageStyles, "/site.css"];
