export default function DocumentLayout({children, styles, bodyProps}) {
  return <html lang="en" suppressHydrationWarning>
    <head>
      <meta name="theme-color" content="#fafafa" />
      <meta name="referrer" content="same-origin" />
      <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
      <link rel="preload" href="/assets/inter.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      {styles.map(href => <link key={href} rel="stylesheet" href={href} />)}
    </head>
    <body {...bodyProps}>{children}</body>
  </html>;
}
