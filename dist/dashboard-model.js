/* Shared navigation and local preferences. No account credentials belong here. */
(() => {
  'use strict';
  const storageKey = 'draftmango-workspace-v1';
  const preferencesKey = 'draftmango-preferences-v1';
  function readPreferences(serialized) {
    let value;
    try { value = JSON.parse(serialized); } catch { /* Use defaults. */ }
    value = value && typeof value === 'object' ? value : {};
    return {
      name: typeof value.name === 'string' ? value.name.trim().slice(0, 60) : '',
      starter: 'auto', // Every project starts from a blank site; legacy starter choices are ignored.
      color: ['auto', 'warm', 'citrus', 'sage', 'rose', 'ink'].includes(value.color) ? value.color : 'auto',
      device: ['auto', 'desktop', 'tablet', 'mobile'].includes(value.device) ? value.device : 'auto'
    };
  }
  function builderDestination(idea, template = 'auto', color = 'auto') {
    const prompt = String(idea || '').trim().slice(0, 1200);
    if (!prompt) return '/dashboard';
    const params = new URLSearchParams({ idea: prompt });
    if (template === 'blank') params.set('template', 'blank');
    if (['warm', 'citrus', 'sage', 'rose', 'ink'].includes(color)) params.set('color', color);
    return '/workspace#' + params.toString();
  }
  function accountDestination(params) {
    if (!params.get('project') && !params.get('idea') && ['basic','pro'].includes(params.get('plan'))) return '/dashboard#settings/billing';
    return params.get('project') && !params.get('idea') ? projectDestination(params.get('project')) : builderDestination(params.get('idea'), params.get('template'), params.get('color'));
  }
  function projectDestination(id) {
    return '/workspace#' + new URLSearchParams({ project: id }).toString();
  }
  function selectProject(library, id) {
    return library?.projects.find(project => project.id === id) || null;
  }
  globalThis.DraftmangoDashboard = Object.freeze({ storageKey, preferencesKey, readPreferences, builderDestination, accountDestination, projectDestination, selectProject });
})();
