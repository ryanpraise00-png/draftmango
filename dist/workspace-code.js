/* Three editable source files, portable exports, and lightweight source checks. */
(() => {
  'use strict';
  const M = globalThis.DraftmangoModel;
  const names = ['index.html', 'styles.css', 'app.js'];
  function createFiles(design) {
    const document = M.renderDocument(design, {}, true);
    const css = document.match(/<style>([\s\S]*?)<\/style>/i)[1].trim();
    let depth = 0;
    const formattedCSS = css.replace(/([{};])/g, '$1\n').split('\n').map(line => {
      line = line.trim();
      if (!line) return '';
      if (line.startsWith('}')) depth = Math.max(0, depth - 1);
      const output = '  '.repeat(depth) + line;
      if (line.endsWith('{')) depth++;
      return output;
    }).filter(Boolean).join('\n');
    let html = document.replace(/<style>[\s\S]*?<\/style>/i, '<link rel="stylesheet" href="styles.css">');
    html = html.replace('</body>', '<script src="app.js" defer></script></body>').replace(/></g, '>\n<');
    depth = 0;
    html = html.split('\n').map(line => {
      if (/^<\//.test(line)) depth = Math.max(0, depth - 1);
      const output = '  '.repeat(depth) + line;
      if (/^<(?:html|head|body|div|header|main|section|nav|article|footer)(?:\s|>)/i.test(line) && !/<\//.test(line)) depth++;
      return output;
    }).join('\n');
    return {
      'index.html': html + '\n',
      'styles.css': formattedCSS + '\n',
      'app.js': '// A little room for interaction.\n// Your JavaScript runs when you choose Run preview.\n\nconsole.info("Your draft is ready to explore.");\n'
    };
  }
  const dataURL = (type, source) => `data:${type};charset=utf-8,${encodeURIComponent(source).replace(/'/g, '%27')}`;
  function buildDocument(files, images = {}) {
    let html = files['index.html'];
    const cssURL = dataURL('text/css', files['styles.css']);
    const jsURL = dataURL('text/javascript', files['app.js']);
    html = html.replace(/<link\b[^>]*>/gi, tag => tag.replace(/\bhref\s*=\s*(["'])(?:\.\/)?styles\.css\1/i, `href="${cssURL}"`));
    html = html.replace(/<script\b[^>]*>/gi, tag => tag.replace(/\bsrc\s*=\s*(["'])(?:\.\/)?app\.js\1/i, `src="${jsURL}"`));
    for (const name of ['coffee', 'ceramics']) {
      const value = images[name];
      if (typeof value === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value)) {
        html = html.replaceAll(`./assets/${name}.jpg`, value).replaceAll(`assets/${name}.jpg`, value);
        // CSS is URL-encoded above, so resolve its bundled asset references too.
        html = html.replaceAll(encodeURIComponent(`./assets/${name}.jpg`), encodeURIComponent(value));
      }
    }
    return html;
  }
  function checkFiles(files) {
    const results = [];
    const html = files['index.html'];
    const add = (ok, label, file) => results.push({ ok, label, file });
    add(/<!doctype\s+html/i.test(html), 'HTML document type', 'index.html');
    add(/<title\b[^>]*>[^<]+<\/title>/i.test(html), 'Page title', 'index.html');
    add(/<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(html), 'Responsive viewport', 'index.html');
    add(/<link\b[^>]*href\s*=\s*["'](?:\.\/)?styles\.css["']/i.test(html), 'styles.css is linked', 'index.html');
    add(/<script\b[^>]*src\s*=\s*["'](?:\.\/)?app\.js["']/i.test(html), 'app.js is linked', 'index.html');
    const ids = [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map(m => m[1]);
    add(new Set(ids).size === ids.length, 'Unique HTML IDs', 'index.html');
    const missing = [...html.matchAll(/\bhref\s*=\s*["']#([^"']+)["']/g)].filter(m => !ids.includes(m[1]));
    add(!missing.length, 'Section links have matching IDs', 'index.html');
    return results;
  }
  function highlight(source, file) {
    // Escape every source token before adding our own highlight spans.
    const token = file.endsWith('.html') ? /<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][\w:-]*|\/?>|"[^"\n]*"|'[^'\n]*'/gi
      : file.endsWith('.css') ? /\/\*[\s\S]*?\*\/|"[^"\n]*"|'[^'\n]*'|#[\da-f]{3,8}\b|--[\w-]+|\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%)?\b|[{}:;]/gi
      : /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|new|true|false|null|document|window|console|async|await)\b|\b\d+\b/g;
    let output = '', cursor = 0;
    for (const match of source.matchAll(token)) {
      output += M.escapeHtml(source.slice(cursor, match.index));
      const value = match[0];
      const kind = /^(?:<!--|\/\/|\/\*)/.test(value) ? 'comment' : /^["'`#]/.test(value) ? 'string' : /^\d/.test(value) ? 'number' : 'keyword';
      output += `<span class="syntax-${kind}">${M.escapeHtml(value)}</span>`;
      cursor = match.index + value.length;
    }
    return output + M.escapeHtml(source.slice(cursor));
  }
  globalThis.DraftmangoCode = Object.freeze({ names, createFiles, buildDocument, checkFiles, highlight });
})();
