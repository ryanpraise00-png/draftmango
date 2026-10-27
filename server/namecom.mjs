import { readFile } from 'node:fs/promises';
import { AIError } from './ai.mjs';
import '../web/domains-model.js';

const M = globalThis.DraftmangoDomainModel;
const baseURL = 'https://api.dev.name.com/core/v1';
export class DomainError extends AIError {}
export async function readDomainConfig(envFile = new URL('../.env', import.meta.url), environment = process.env) {
  let source = '';
  try { source = await readFile(envFile, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw new DomainError(503, 'domain_configuration', 'The domain environment file could not be read.'); }
  const local = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?(NAMECOM_[A-Z_]+|DOMAIN_MARKUP_PERCENT|DOMAIN_MIN_FEE_CENTS)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '').trim();
    local[match[1]] = value;
  }
  const get = name => String(environment[name] ?? local[name] ?? '');
  const config = { environment: get('NAMECOM_ENVIRONMENT') || 'sandbox', username: get('NAMECOM_USERNAME'), token: get('NAMECOM_API_TOKEN'), markupPercent: Number(get('DOMAIN_MARKUP_PERCENT') || 20), minFeeCents: Number(get('DOMAIN_MIN_FEE_CENTS') || 500) };
  validateConfig(config);
  return config;
}
function validateConfig(config) {
  if (config.environment !== 'sandbox') throw new DomainError(503, 'domain_environment', 'Domain search is configured for the Name.com sandbox only. Use Development/Test credentials.');
  if (!config.username || !config.token) throw new DomainError(503, 'domain_credentials', 'Add NAMECOM_USERNAME and NAMECOM_API_TOKEN to the server’s local environment file.');
  if (!config.username.endsWith('-test') || config.username.endsWith('-test-test') || /[\s:]/.test(config.username) || /\s/.test(config.token) || config.username.length > 254 || config.token.length > 256 || /^(sk-|xai-)/.test(config.token)) throw new DomainError(503, 'domain_credentials', 'Use your Name.com username with one -test suffix and its separate Development/Test token.');
  if (!Number.isFinite(config.markupPercent) || config.markupPercent < 0 || config.markupPercent > 100 || !Number.isInteger(config.minFeeCents) || config.minFeeCents < 0 || config.minFeeCents > 10000) throw new DomainError(503, 'domain_markup', 'Set DOMAIN_MARKUP_PERCENT from 0 to 100 and DOMAIN_MIN_FEE_CENTS from 0 to 10000.');
}
export function validateDomainSearch(value) {
  const result = M.searchCandidates(value?.query);
  if (result.error) throw new DomainError(400, 'domain_query', result.error);
  return result;
}
export function retailPrice(value, config) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 10000000) return null;
  const cents = Math.round((value + Number.EPSILON) * 100);
  const fee = Math.max(config.minFeeCents, Math.round(cents * config.markupPercent / 100));
  return cents + fee;
}
async function requestJSON(endpoint, config, { signal, fetchImpl, body }) {
  let response;
  try {
    response = await fetchImpl(baseURL + endpoint, {
      method: body ? 'POST' : 'GET', redirect: 'error', signal,
      headers: { Authorization: 'Basic ' + Buffer.from(config.username + ':' + config.token).toString('base64'), Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (!response.ok) {
      await response.body?.cancel();
      if ([401, 403].includes(response.status)) throw new DomainError(503, 'domain_auth', 'Name.com rejected the test credentials. Check the Development/Test token, -test username and account API access setting.');
      if (response.status === 429) throw new DomainError(429, 'domain_rate_limit', 'Name.com is limiting searches. Wait a little, then try again.');
      throw new DomainError(502, 'domain_upstream', 'Name.com could not complete this check. Please try again shortly.');
    }
    let bytes = 0; const chunks = [];
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > 262144) throw new Error('Oversized provider response');
      chunks.push(chunk);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid provider response');
    return data;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof DomainError) throw error;
    throw new DomainError(502, 'domain_upstream', 'Name.com returned an unreadable response. Please try again.');
  }
}
export async function searchDomains(input, config, { fetchImpl = fetch, signal } = {}) {
  validateConfig(config);
  const candidates = validateDomainSearch({ query: input.query }).candidates;
  const availability = await requestJSON('/domains:checkAvailability', config, { signal, fetchImpl, body: { domainNames: candidates.map(item => item.domain), purchaseType: 'registration' } });
  if (!Array.isArray(availability.results) || availability.results.length > 50) throw new DomainError(502, 'domain_upstream', 'Name.com returned incomplete availability information. Please try again.');
  const offers = await Promise.all(candidates.map(async candidate => {
    const matches = availability.results.filter(item => typeof item?.domainName === 'string' && item.domainName.toLowerCase() === candidate.domain);
    const item = matches.length === 1 ? matches[0] : null;
    const offer = { ...candidate, status: 'unknown', premium: item?.premium === true, cents: null, renewalCents: null };
    if (!item || typeof item.purchasable !== 'boolean') return offer;
    if (!item.purchasable) return { ...offer, status: 'unavailable' };
    if (item.purchaseType !== 'registration') return { ...offer, status: 'unsupported' };
    try {
      const pricing = await requestJSON('/domains/' + candidate.domain + ':getPricing?years=1', config, { signal, fetchImpl });
      const cents = retailPrice(pricing.purchasePrice, config), renewalCents = retailPrice(pricing.renewalPrice, config);
      if (cents === null || renewalCents === null) return { ...offer, status: 'price_unavailable' };
      return { ...offer, status: 'available', premium: offer.premium || pricing.premium === true, cents, renewalCents };
    } catch (error) {
      if (signal?.aborted || ['domain_auth', 'domain_rate_limit'].includes(error.code)) throw error;
      return { ...offer, status: 'price_unavailable' };
    }
  }));
  const checkedAt = new Date().toISOString();
  return { environment: 'sandbox', provider: 'name.com', currency: 'USD', years: 1, checkedAt, validUntil: new Date(Date.parse(checkedAt) + 300000).toISOString(), serviceFeeIncluded: true, offers };
}
