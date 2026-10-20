(() => {
 window.QQSite = {
  editor: '#prompt-textarea,[contenteditable="true"][data-lexical-editor="true"],[contenteditable="true"][data-composer-markdown]',
  frame: '[data-app-shell-frame],.stage-layout',
  assistant: '[data-message-author-role="assistant"],[data-content-search-unit-key$=":assistant"]',
  messageKey: n => n.getAttribute('data-message-id') || n.getAttribute('data-chatgpt-search-message-ids') || n.getAttribute('data-content-search-unit-key') || n,
 };
})();
