(function(){
  const manifest=document.createElement('link');manifest.rel='manifest';manifest.href='/manifest.webmanifest';document.head.appendChild(manifest);
  const theme=document.createElement('meta');theme.name='theme-color';theme.content='#6d5bd0';document.head.appendChild(theme);
  const apple=document.createElement('meta');apple.name='apple-mobile-web-app-capable';apple.content='yes';document.head.appendChild(apple);
  const title=document.createElement('meta');title.name='apple-mobile-web-app-title';title.content='BookCreator';document.head.appendChild(title);
  const i18n=document.createElement('script');i18n.src='/i18n.js';document.head.appendChild(i18n);
  if('serviceWorker' in navigator){const reg=()=>navigator.serviceWorker.register('/sw.js').catch(console.warn);if(document.readyState==='complete')reg();else window.addEventListener('load',reg)}
})();