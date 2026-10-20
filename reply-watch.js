(() => {
  // Observe controls and message identities only; never read or transmit chat text.
  const STOP = '[data-testid="stop-button"],button[aria-label="Stop generating"],button[aria-label="停止生成"],button[aria-label="Stop streaming"],button[aria-label="停止流式传输"],button[aria-label="停止响应"],button[aria-label="停止回答"],form[data-chatgpt-composer] button[aria-label="停止"],form[data-chatgpt-composer] button[aria-label="Stop"]';
  const SEND = '[data-testid="send-button"],button[aria-label="Send prompt"],button[aria-label="发送提示"],button[aria-label="发送消息"],button[aria-label="发送提示词"],form[data-chatgpt-composer] button[aria-label="发送"],form[data-chatgpt-composer] button[aria-label="Send"]';
  const ASSISTANT = window.QQSite.assistant;
  const ERROR = '[data-testid="conversation-turn-error"],[data-testid="error-message"]';
  // Current web shell creates /c/local-chatgpt%3A<uuid> before persisting it.
  // Keep legacy WEB: IDs too; ordinary conversation navigation still cancels.
  const TEMPORARY_ROUTE = /^\/c\/(?:WEB|local-chatgpt)(?::|%3A)/i;
  const key = window.QQSite.messageKey;
  const shown = node => node && node.getClientRects().length > 0;
  window.QQReplyWatch = function(onComplete, hooks = {}) {
    let run = null, timer = null;
    function reset() { run = null; clearTimeout(timer); timer = null; hooks.onCancel?.(); }
    function arm() {
      if (run && (run.sawBusy || Date.now() - run.at < 1000)) return;
      reset();
      hooks.onSend?.();
      run = { at: Date.now(), route: location.pathname, startedOnHome: location.pathname === '/', ids: new Set([...document.querySelectorAll(ASSISTANT)].map(key)), sawBusy: false, quietAt: 0 };
    }
    function scan() {
      if (!run) return;
      const route = location.pathname;
      if (route !== run.route) {
        // A new conversation goes home -> temporary ID -> persisted UUID.
        // Explicit navigation clicks and popstate still cancel the detector.
        if (run.route === '/' && route.startsWith('/c/') || run.startedOnHome && TEMPORARY_ROUTE.test(run.route) && /^\/c\/[0-9a-f-]{36}$/i.test(route)) run.route = route;
        else { reset(); return; }
      }
      if (Date.now() - run.at > 30 * 60 * 1000 || (!run.sawBusy && Date.now() - run.at > 120000)) { reset(); return; }
      if ([...document.querySelectorAll(ERROR)].some(shown)) { reset(); return; }
      const busy = [...document.querySelectorAll(STOP)].some(shown);
      if (busy) { run.sawBusy = true; run.quietAt = 0; return; }
      if (!run.sawBusy) return;
      const fresh = [...document.querySelectorAll(ASSISTANT)].filter(n => !run.ids.has(key(n)));
      if (!fresh.length || fresh.some(n => n.matches('.result-streaming,[aria-busy="true"]') || n.querySelector('.result-streaming,[aria-busy="true"]') || (n.closest('[data-talvt-turn-state]') && n.closest('[data-talvt-turn-state]').getAttribute('data-talvt-turn-state')!=='complete'))) { run.quietAt = 0; return; }
      if (!run.quietAt) run.quietAt = Date.now();
      if (Date.now() - run.quietAt < 900) { clearTimeout(timer); timer = setTimeout(scan, 950); return; }
      reset(); onComplete();
    }
    const onClick = event => {
      if (!event.isTrusted) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(STOP)) { reset(); return; }
      const link = target?.closest('a[href]');
      if (link && new URL(link.href, location.href).pathname !== location.pathname) reset();
      if(target?.closest('[data-qq-new-chat]'))reset();
      if (target?.closest(SEND)) arm();
    };
    const onKey = event => {
      if (event.isTrusted && event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.target instanceof Element && event.target.matches(window.QQSite.editor)) arm();
    };
    const onSubmit = event => { if (event.isTrusted && event.target instanceof Element && event.target.querySelector(window.QQSite.editor)) arm(); };
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('submit', onSubmit, true);
    window.addEventListener('popstate', reset);
    const observer = new MutationObserver(records => {
      if (run) for (const record of records) for (const node of record.addedNodes) {
        if (node instanceof Element && (node.matches(STOP) || node.querySelector(STOP))) run.sawBusy = true;
      }
      scan();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-busy', 'data-testid', 'aria-label', 'class','data-talvt-turn-state'] });
    const interval = setInterval(scan, 500);
    return { destroy() { reset(); observer.disconnect(); clearInterval(interval); document.removeEventListener('click', onClick, true); document.removeEventListener('keydown', onKey, true); document.removeEventListener('submit', onSubmit, true); window.removeEventListener('popstate', reset); } };
  };
})();
