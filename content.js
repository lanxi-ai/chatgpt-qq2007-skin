(() => {
 if(window.__qqLevelMounted)return;window.__qqLevelMounted=true;
 const html=document.documentElement;const host=document.createElement('div');host.id='qq-level-panel';const frame=document.createElement('div');frame.id='qq-retro-chrome';
 const logo=chrome.runtime.getURL('assets/chatgpt-logo.png');
 frame.innerHTML=`<div class="qq-titlebar"><div class="qq-brand"><img alt="" src="${logo}"><span>ChatGPT</span></div><div class="qq-window-tools"><button class="qq-emojis" title="表情与颜文字" aria-label="打开表情面板">☺</button><button class="qq-decor" title="装扮中心" aria-label="打开装扮中心">✦</button><button class="qq-paint" title="等级与换肤设置" aria-label="打开换肤设置">⚙</button><button class="qq-exit" title="恢复原版界面" aria-label="恢复原版界面">×</button></div></div>`;
 const assetsStyle=document.createElement('style');assetsStyle.id='qq-retro-assets';assetsStyle.textContent=`html{--qq-wallpaper:url("${chrome.runtime.getURL('assets/sky.png')}");--qq-logo:url("${logo}")}`;
 let stopped=false,pending=false;
 async function send(command,value){const r=await chrome.runtime.sendMessage({type:'QQ_LEVEL_COMMAND',command,value});if(!r?.ok)throw Error(r?.error||'连接失败');render(r.state);}
 const panel=new window.QQLevelPanel(host,send);const replyWatch=window.QQReplyWatch(()=>panel.replyComplete(),{onSend:panel.cancelReplyWait,onCancel:panel.cancelReplyWait});frame.querySelector('.qq-decor').onclick=()=>panel.openDecor();frame.querySelector('.qq-emojis').onclick=()=>panel.openEmojis();frame.querySelector('.qq-paint').onclick=()=>panel.openSettings();frame.querySelector('.qq-exit').onclick=()=>send('ENABLED',false);
 function render(state){panel.render(state);if(state.enabled)html.dataset.qqTheme=state.theme;else delete html.dataset.qqTheme;}
 function markSuggestions(){
  // Only recognize the built-in suggestion controls; never inspect conversation text.
  for(const btn of document.querySelectorAll('main button[aria-label="关闭建议"],main button[aria-label="Dismiss suggestion"],main button[aria-label="Close suggestion"],main button[aria-label="对该建议不感兴趣"],main button[aria-label="Not interested in this suggestion"]')){
   let row=btn.closest('li,[role="listitem"]')||btn.parentElement;
   for(let i=0;i<3&&row&&!row.querySelector('form')&&row.querySelectorAll('button').length<2;i++)row=row.parentElement;
   if(!row||row.querySelector('form')||row.closest('form')||row.querySelector('[contenteditable="true"],textarea'))continue;
   const list=row.closest('ul,ol,[role="list"]');
   (list&&!list.querySelector('form,textarea,[contenteditable="true"]')?list:row).classList.add('qq-home-suggestion');
  }
 }
 function mount(){
  const shell=document.querySelector('[data-app-shell-frame]');
  html.dataset.qqShell=shell?'app':'legacy';
  const sidebar=document.querySelector('#app-shell-sidebar')||document.querySelector('#stage-slideover-sidebar');
  const nav=shell?sidebar?.querySelector('nav[role="navigation"]'):sidebar?.querySelector('nav:not(#stage-sidebar-tiny-bar)');
  const box=nav?.getBoundingClientRect();
  const open=shell?shell.getAttribute('data-app-shell-sidebar-open')==='true':!!box&&sidebar.getBoundingClientRect().width>180;
  const usable=nav&&open&&box.width>180&&box.right>180&&box.left<innerWidth&&innerWidth>760;
  if(usable){
   if(shell){if(host.parentElement!==nav)nav.prepend(host);}
   else if(host.parentElement!==nav.parentElement)nav.before(host);
   host.dataset.placement='sidebar';
   html.style.setProperty('--qq-settings-left',Math.min(Math.max(box.right+12,12),innerWidth-330)+'px');
  }else{
   const bar=frame.querySelector('.qq-titlebar');if(host.parentElement!==bar)bar.querySelector('.qq-window-tools').before(host);host.dataset.placement='compact';
   html.style.setProperty('--qq-settings-left',Math.max(12,innerWidth-340)+'px');
  }
  if(!assetsStyle.isConnected)document.head.append(assetsStyle);if(!frame.isConnected)document.body.append(frame);
  for(const el of document.querySelectorAll('[data-qq-greeting]'))el.removeAttribute('data-qq-greeting');
  const headings=[...document.querySelectorAll('main h1')].filter(el=>el.getClientRects().length&&!el.closest('[inert]')&&getComputedStyle(el).visibility!=='hidden');
  const start=location.pathname==='/'&&headings.length>0;html.classList.toggle('qq-start',start);
  const workSelected=[...document.querySelectorAll('[role=radio][aria-checked=true],[role=tab][aria-selected=true],input[type=radio]:checked,[aria-label="撰写器模式"] button[aria-pressed=true]')].some(el=>/工作|work/i.test((el.getAttribute('aria-label')||'')+' '+(el.value||'')+' '+(el.closest('label')?.textContent||el.textContent)));
  const home=!shell&&start&&headings.length===1&&!workSelected&&!document.querySelector('main [role=tablist]')&&new URLSearchParams(location.search).get('temporary-chat')!=='true';
  html.classList.toggle('qq-home',home);if(home)headings[0].setAttribute('data-qq-greeting','');markSuggestions();
  // Tag only native new-chat controls. Do not inspect conversation text.
  for(const button of sidebar?.querySelectorAll('button')||[])if(/^(新聊天|New chat)$/i.test(button.getAttribute('aria-label')||button.textContent.trim()))button.setAttribute('data-qq-new-chat','');
 }
 async function heartbeat(){if(stopped||pending)return;pending=true;try{mount();await send('SNAPSHOT');}catch(e){panel.error('扩展已更新，请刷新网页');if(!chrome.runtime?.id){stopped=true;replyWatch.destroy();panel.destroy();delete html.dataset.qqTheme;}}finally{pending=false;}}
 chrome.runtime.onMessage.addListener(m=>{if(m.type==='QQ_LEVEL_STATE'){render(m.state);mount();}});mount();heartbeat();setInterval(heartbeat,5000);let mountTimer;new MutationObserver(()=>{clearTimeout(mountTimer);mountTimer=setTimeout(mount,80);}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-checked','aria-selected','aria-pressed','data-app-shell-sidebar-open','data-slate-sidebar-peeking']});window.addEventListener('resize',mount);document.addEventListener('visibilitychange',heartbeat);
})();
