(() => {
  'use strict';
  const empty = () => ({ schema: 1, activeId: '', projects: [], cloud: Object.create(null) });
  const clone = value => JSON.parse(JSON.stringify(value));
  function read(serialized) {
    const model = globalThis.DraftmangoModel;
    const library = model.readStore(serialized) || empty();
    let raw; try { raw = JSON.parse(serialized); } catch { /* Empty cache. */ }
    library.cloud = Object.create(null);
    for (const project of library.projects) {
      const entry = raw?.cloud?.[project.id];
      library.cloud[project.id] = { version: Number.isSafeInteger(entry?.version) && entry.version > 0 ? entry.version : 0, dirty: entry?.dirty !== false, seq: Number.isSafeInteger(entry?.seq) ? entry.seq : 0 };
    }
    return library;
  }
  function put(library, project) {
    const index = library.projects.findIndex(p => p.id === project.id);
    if (index >= 0 && JSON.stringify(library.projects[index]) === JSON.stringify(project)) return library;
    const previous = library.cloud[project.id] || { version: 0, seq: 0 };
    library.cloud[project.id] = { version: previous.version, seq: previous.seq + 1, dirty: true };
    if (index < 0) library.projects.push(clone(project)); else library.projects[index] = clone(project);
    return library;
  }
  function merge(library, rows, newId = () => crypto.randomUUID()) {
    const remapped = Object.create(null);
    for (const row of rows) {
      const parsed = globalThis.DraftmangoModel.readStore(JSON.stringify({ schema: 1, projects: [row.document] }));
      const remote = parsed?.projects[0];
      if (!remote || remote.id !== row.id || !Number.isSafeInteger(row.version) || row.version < 1) throw new Error('A cloud project could not be read. Local drafts are safe.');
      const local = library.projects.find(p => p.id === row.id);
      const meta = library.cloud[row.id];
      if (local && meta?.dirty && meta.version !== row.version) {
        if (JSON.stringify(local) === JSON.stringify(remote)) { library.cloud[row.id] = { ...meta, version: row.version, dirty: false }; continue; }
        // Keep both directions. Never silently overwrite an unsynced draft.
        const copy = { ...clone(local), id: newId(), title: (local.title.slice(0, 44) + ' · recovered copy'), updatedAt: new Date().toISOString() };
        put(library, copy); remapped[local.id] = copy.id;
        if (library.activeId === local.id) library.activeId = copy.id;
      } else if (local && meta?.dirty) continue;
      const index = library.projects.findIndex(p => p.id === remote.id);
      if (index < 0) library.projects.push(remote); else library.projects[index] = remote;
      library.cloud[remote.id] = { version: row.version, seq: meta?.seq || 0, dirty: false };
    }
    return { library, remapped };
  }
  // Drop device copies of projects deleted on the server. Only copies that were fully
  // synced are removed; unsynced or never-uploaded drafts are always kept.
  function prune(library, remoteIds) {
    const keep = new Set(remoteIds), removed = [];
    library.projects = library.projects.filter(project => {
      const meta = library.cloud[project.id];
      const gone = !!meta && meta.version > 0 && !meta.dirty && !keep.has(project.id);
      if (gone) { removed.push(project.id); delete library.cloud[project.id]; }
      return !gone;
    });
    if (removed.includes(library.activeId)) library.activeId = library.projects[0]?.id || '';
    return { library, removed };
  }
  function acknowledge(library, id, sentSeq, version) {
    const current = library.cloud[id];
    if (current) library.cloud[id] = { ...current, version, dirty: current.seq !== sentSeq };
    return library;
  }
  function key(userId, base = 'draftmango-workspace-v1', projectRef = '') { return userId ? `${base}:account:${projectRef}:${userId}` : base; }
  globalThis.DraftmangoAccountStore = Object.freeze({ empty, read, put, merge, prune, acknowledge, key });
})();
