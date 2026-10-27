/* Shared validation for sandbox searches and local domain drafts. */
(() => {
  'use strict';
  const storageKey = 'draftmango-domain-drafts-v1';
  const endings = Object.freeze([
    { tld: 'com', description: 'The familiar favorite.' },
    { tld: 'co', description: 'A little shorter. Just as you.' },
    { tld: 'studio', description: 'For people who make things.' },
    { tld: 'design', description: 'Let your creativity lead.' }
  ]);
  function normalizeDomain(value, allowWord = false) {
    const domain = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (!domain || domain.length > 253 || /[^a-z0-9.-]/.test(domain)) return null;
    const labels = domain.split('.');
    if ((!allowWord && labels.length < 2) || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
    if (labels.length > 1 && !/^[a-z]{2,63}$/.test(labels.at(-1))) return null;
    return domain;
  }
  function searchCandidates(value) {
    const query = normalizeDomain(value, true);
    if (!query || query.split('.').length > 2) return { error: 'Enter a name like slowdays or slowdays.com. Use letters, numbers and hyphens.', candidates: [] };
    const [name, requested] = query.split('.');
    if (requested && !endings.some(item => item.tld === requested)) return { error: 'Search currently supports .com, .co, .studio and .design. Try one of those endings.', candidates: [] };
    return { query, error: '', candidates: [...endings].sort((a, b) => Number(b.tld === (requested || 'com')) - Number(a.tld === (requested || 'com'))).map(item => ({ ...item, domain: `${name}.${item.tld}` })) };
  }
  function readDrafts(serialized) {
    let data;
    try { data = JSON.parse(serialized); } catch { return []; }
    if (!Array.isArray(data)) return [];
    const seen = new Set();
    return data.slice(0, 100).flatMap(item => {
      if (!item || typeof item !== 'object') return [];
      const domain = normalizeDomain(item.domain);
      if (!domain || seen.has(domain) || !['purchase', 'connect'].includes(item.kind)) return [];
      seen.add(domain);
      return [{ domain, kind: item.kind, projectId: typeof item.projectId === 'string' ? item.projectId.slice(0, 120) : '', autoRenew: item.kind === 'purchase' && item.autoRenew === true, state: 'draft' }];
    }).slice(0, 30);
  }
  function upsertDraft(serialized, draft) {
    const candidate = readDrafts(JSON.stringify([draft]))[0];
    if (!candidate) throw new Error('Enter a valid domain before saving.');
    const current = readDrafts(serialized);
    if (current.length >= 30 && !current.some(item => item.domain === candidate.domain)) throw new Error('You have 30 domain drafts. Remove one before adding another.');
    return [candidate, ...current.filter(item => item.domain !== candidate.domain)];
  }
  function canUseCustomDomain(plan) { return plan === 'basic' || plan === 'pro'; }
  globalThis.DraftmangoDomainModel = Object.freeze({ storageKey, normalizeDomain, searchCandidates, readDrafts, upsertDraft, canUseCustomDomain });
})();
