import { GATEWAY_URL } from './config.js';
import { LANGUAGES, DEFAULT_LANGUAGE, localeOrDefault, directionFor, translate } from './i18n.js';

// Telegram Mini App: UI translations only. No fake market prices or client-side secrets.
const tg = window.Telegram?.WebApp;
tg?.ready?.();
tg?.expand?.();
const $ = id => document.getElementById(id);
const SYMBOLS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'];
const INTL_LOCALES = { en:'en-US', fa:'fa-IR', ar:'ar', tr:'tr-TR', ru:'ru-RU', hi:'hi-IN' };

let locale = DEFAULT_LANGUAGE;
let profile = null;
let connected = false;
let prices = null;
let signals = null;
let selected = new Set();
let languageRequest = 0;
const tr = key => translate(locale, key);

function setMessage(id,key) {
 const el = $(id);
 if (!el) return;
 el.dataset.stateKey = key || '';
 el.textContent = key ? tr(key) : '';
}
function changeLocale(next) {
 locale = localeOrDefault(next);
 document.documentElement.lang = locale;
 document.documentElement.dir = directionFor(locale);
 $('language-select').value = locale;
 document.querySelectorAll('[data-i18n]').forEach(el => {el.textContent = tr(el.dataset.i18n);});
 document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {el.placeholder = tr(el.dataset.i18nPlaceholder);});
 document.querySelectorAll('[data-i18n-aria]').forEach(el => {el.setAttribute('aria-label',tr(el.dataset.i18nAria));});
 document.querySelectorAll('[data-state-key]').forEach(el => {if(el.dataset.stateKey)el.textContent=tr(el.dataset.stateKey);});
 setConnection(connected);
 renderQuotes();
 renderSignals();
 renderWatchlist();
}
function api(endpoint,input={}) {
 return new Promise((resolve,reject)=>{
  if(!tg?.Serverless?.call){reject(new Error('TELEGRAM_REQUIRED'));return;}
  try{tg.Serverless.call(endpoint,input,(error,value)=>error?reject(new Error(error.message||'ERROR')):resolve(value));}
  catch(error){reject(error);}
 });
}
function setConnection(value) {
 connected = Boolean(value);
 const el = $('connection');
 el.replaceChildren();
 const dot = document.createElement('span');
 dot.textContent=connected?'● ':'○ ';
 dot.style.color=connected?'#59e0a4':'#ffcc62';
 const status=document.createElement('span');
 status.textContent=tr(connected?'connected':'unavailable');
 el.append(dot,status);
}
function renderWatchlist() {
 const root=$('watch-options');root.replaceChildren();
 for(const symbol of SYMBOLS) {
  const button=document.createElement('button');
  button.type='button';
  button.className='watch-option'+(selected.has(symbol)?' selected':'');
  button.textContent=symbol.replace('USDT',' / USDT');
  button.setAttribute('aria-pressed',String(selected.has(symbol)));
  button.onclick=()=>{selected.has(symbol)?selected.delete(symbol):selected.add(symbol);renderWatchlist();};
  root.append(button);
 }
}
function chartLinks() {
 const root=$('chart-links');root.replaceChildren();
 for(const symbol of SYMBOLS) {
  const a=document.createElement('a');
  a.textContent=symbol.replace('USDT',' / USDT')+' ↗';
  a.href='https://www.tradingview.com/chart/?symbol=BINANCE%3A'+encodeURIComponent(symbol);
  a.target='_blank';a.rel='noopener noreferrer';
  root.append(a);
 }
}
function renderQuotes() {
 if(!prices)return;
 const root=$('quotes');root.replaceChildren();
 for(let i=0;i<SYMBOLS.length;i++){
  const data=prices[i];
  const box=document.createElement('div');box.className='quote-card';
  const asset=document.createElement('div');asset.className='asset';asset.dir='ltr';asset.textContent=SYMBOLS[i].replace('USDT',' / USDT');
  const price=document.createElement('div');price.className='price';price.dir='ltr';
  const when=document.createElement('div');when.className='stamp';
  const source=document.createElement('div');source.className='source';
  if(data?.error || typeof data?.price!=='number' || !Number.isFinite(data.price)){
   price.textContent='—';when.textContent=tr('noFeed');
  }else{
   price.textContent=new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(data.price);
   const formatted=new Intl.DateTimeFormat(INTL_LOCALES[locale],{hour:'2-digit',minute:'2-digit'}).format(new Date(data.observedAt));
   when.textContent=tr('observation')+': '+formatted;
   source.textContent=data.source+' · '+tr('indicative');
  }
  box.append(asset,price,when,source);root.append(box);
 }
}
async function loadMarket() {
 setMessage('market-note','wait');
 const response=await Promise.all(SYMBOLS.map(async symbol=>{try{return await api('getPrice',{symbol});}catch(_){return {error:true};}}));
 prices=response;renderQuotes();
 setMessage('market-note',response.every(d=>d.error)?'noFeed':'');
}
function renderSignals() {
 if(!signals)return;
 const root=$('signal-list');root.replaceChildren();
 if(!signals.configured)setMessage('signal-state','signalOff');
 else if(!Array.isArray(signals.signals)||!signals.signals.length)setMessage('signal-state','noSignals');
 else setMessage('signal-state','signalNote');
 for(const item of signals.signals||[]){
  const card=document.createElement('article');card.className='signal-card';
  const top=document.createElement('div');top.className='signal-top';
  const name=document.createElement('strong');name.dir='auto';name.textContent=String(item.symbol||'—');
  const side=document.createElement('span');
  const code=String(item.side||'').toLowerCase();
  side.className='side '+(code==='buy'?'buy':'sell');side.textContent=tr(['buy','sell','close','alert'].includes(code)?code:'alert');
  const timestamp=document.createElement('small');
  timestamp.dir='auto';
  const safeTime=item.created_at&&Number.isFinite(Date.parse(item.created_at))
   ?new Intl.DateTimeFormat(INTL_LOCALES[locale],{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.created_at))
   :String(item.created_at||'');
  timestamp.textContent=[item.timeframe,safeTime].filter(Boolean).join(' · ');
  top.append(name,side);card.append(top,timestamp);root.append(card);
 }
}
async function loadSignals() {
 setMessage('signal-state','wait');
 try{signals=await api('getSignals',{limit:20});renderSignals();}
 catch(_){signals=null;$('signal-list').replaceChildren();setMessage('signal-state','fetchError');}
}
async function loadUser() {
 try{
  profile=await api('getProfile');
  // An explicitly saved preference takes priority; new users default to English.
  changeLocale(localeOrDefault(profile?.language));
  $('display-name').textContent=profile.firstName||tr('noName');
  $('username').textContent=profile.username?'@'+profile.username:'Telegram';
  $('user-id').textContent=String(profile.id);
  $('avatar').textContent=(profile.firstName||'D').slice(0,1).toUpperCase();
  setConnection(true);
 }catch(_){
  setConnection(false);
  setMessage('market-note','notAuthorized');
 }
 try{
  const watch=await api('getWatchlist');
  if(Array.isArray(watch.symbols))selected=new Set(watch.symbols.filter(x=>SYMBOLS.includes(x)));
  renderWatchlist();
 }catch(_){}
}

document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
 document.querySelectorAll('[data-tab]').forEach(tab=>tab.classList.toggle('active',tab===button));
 document.querySelectorAll('[data-panel]').forEach(panel=>panel.classList.toggle('visible',panel.dataset.panel===button.dataset.tab));
 if(button.dataset.tab==='signals')loadSignals();
}));

$('language-select').addEventListener('change',async event=>{
 const requested=localeOrDefault(event.target.value);
 const requestNumber=++languageRequest;
 changeLocale(requested);
 setMessage('watch-state','');
 if(!profile)return;
 try{
  await api('saveSettings',{language:requested});
  if(requestNumber===languageRequest)setMessage('watch-state','languageSaved');
 }catch(_){
  if(requestNumber===languageRequest)setMessage('watch-state','updateFailed');
 }
});

function addAIMessage(text,role) {
 const bubble=document.createElement('div');
 bubble.className='ai-bubble '+role;
 bubble.textContent=text;
 bubble.dir='auto';
 $('ai-thread').append(bubble);
 bubble.scrollIntoView({block:'nearest'});
}
$('ai-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const prompt=$('ai-prompt').value.trim();
 if(!prompt)return;
 if(!GATEWAY_URL){setMessage('ai-status','aiOff');return;}
 if(!tg?.initData){setMessage('ai-status','notAuthorized');return;}
 $('ai-send').disabled=true;setMessage('ai-status','aiBusy');
 addAIMessage(prompt,'user');$('ai-prompt').value='';
 try {
  const response=await fetch(GATEWAY_URL.replace(/\/$/,'')+'/api/ai',{
   method:'POST',headers:{'Content-Type':'application/json','x-telegram-init-data':tg.initData},
   body:JSON.stringify({prompt})
  });
  if(!response.ok)throw new Error('UPSTREAM_ERROR');
  const result=await response.json();
  if(typeof result.answer!=='string')throw new Error('MISSING_ANSWER');
  addAIMessage(result.answer,'assistant');setMessage('ai-status','');
 }catch(_){setMessage('ai-status','fetchError');}
 finally{$('ai-send').disabled=false;}
});

$('refresh').onclick=loadMarket;
$('refresh-signals').onclick=loadSignals;
$('save-watch').onclick=async()=>{
 $('save-watch').disabled=true;
 try{
  const saved=await api('saveWatchlist',{symbols:[...selected]});
  if(Array.isArray(saved?.symbols))selected=new Set(saved.symbols);
  renderWatchlist();setMessage('watch-state','saved');
 }catch(_){setMessage('watch-state','saveFailed');}
 finally{$('save-watch').disabled=false;}
};

changeLocale(DEFAULT_LANGUAGE);
renderWatchlist();
chartLinks();
await loadUser();
await loadMarket();
