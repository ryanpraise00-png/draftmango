(() => {
  const connectionError = () => new Error('The connection ended before your website was complete. Your draft is unchanged. Try again.');
  function requestError(error) {
    const result = new Error(error?.message || 'The AI could not complete this request. Your draft is unchanged.');
    result.code = error?.code;
    return result;
  }
  async function readResponse(response, onEvent = () => {}) {
    if (!response.ok || !response.headers.get('content-type')?.includes('application/x-ndjson')) {
      let result;
      try { result = await response.json(); } catch { throw connectionError(); }
      if (!response.ok || result.error) throw requestError(result.error);
      return result;
    }
    if (!response.body) throw connectionError();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) throw connectionError();
        buffer += decoder.decode(value, {stream:true});
        if (buffer.length > 8 * 1024 * 1024) throw connectionError();
        let end;
        while ((end = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0,end).trim();
          buffer = buffer.slice(end + 1);
          if (!line) continue;
          let event;
          try { event = JSON.parse(line); } catch { throw connectionError(); }
          if (event.type === 'error') throw requestError(event.error);
          if (event.type === 'result') return event.result;
          if (event.type === 'start' || event.type === 'progress') onEvent(event);
        }
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
  globalThis.DraftmangoAI = {readResponse};
})();
