import { GATEWAY_URL } from './config.js';
// DrFXQuant Mini — no demo market prices, no client-side credentials.
const tg=window.Telegram?.WebApp;
tg?.ready?.(); tg?.expand?.();
const $=id=>document.getElementById(id);
const symbols=['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'];
const messages={
 fa:{tabAI:'دستیار AI',aiTitle:'دستیار تحلیلی AI',aiHint:'پاسخ‌ها آموزشی‌اند، نه سیگنال قطعی یا توصیه مالی. گفتگو ذخیره نمی‌شود.',aiLabel:'سؤال شما',ask:'پرسیدن از AI',aiOff:'AI هنوز پیکربندی نشده است.',aiBusy:'درحال دریافت پاسخ...',connecting:'اتصال...',market:'MARKET CONTROL CENTER',headline:'بازار را هوشمندتر دنبال کنید.',lead:'پنل اختصاصی تحلیل، قیمت واقعی و هشدارهای معاملاتی؛ در داخل تلگرام.',mode:'حالت اجرا',tabMarket:'بازار',tabSignals:'سیگنال‌ها',tabWatch:'واچ‌لیست',tabAccount:'حساب',liveQuotes:'قیمت‌های واقعی بازار',refresh:'بروزرسانی',chart:'نمودار پیشرفته',chartDesc:'برای بررسی چارت کامل و ابزارهای تکنیکال، نماد موردنظر را باز کنید.',alerts:'هشدارهای TradingView',favorites:'نمادهای منتخب',watchHelp:'نمادهای موردنظر را انتخاب و ذخیره کنید.',save:'ذخیره واچ‌لیست',account:'حساب تلگرام',userId:'شناسه کاربر',appVersion:'نسخه',execution:'اجرای سرورلس',disabled:'بخش‌های غیرفعال در نسخه اولیه',disabledDesc:'پخش زنده، معامله خودکار، MT5، پرداخت و AI تا تکمیل اتصال امن فعال نیستند.',disclaimer:'اطلاعات آموزشی؛ توصیه مالی نیست.',connected:'متصل',unavailable:'ناموجود',wait:'درحال دریافت قیمت واقعی...',noFeed:'داده زنده در دسترس نیست؛ قیمت تخمینی نمایش داده نمی‌شود.',noSignals:'سیگنال تاییدشده‌ای ثبت نشده است.',signalOff:'Gateway سیگنال هنوز تنظیم نشده است.',saved:'واچ‌لیست ذخیره شد.',notAuthorized:'این پنل را از داخل تلگرام و ربات مرتبط باز کنید.',fetchError:'ارتباط با سرویس برقرار نشد.'},
 en:{tabAI:'AI Assistant',aiTitle:'AI Analysis Assistant',aiHint:'Educational explanations only, not investment advice. This chat is not stored.',aiLabel:'Your question',ask:'Ask AI',aiOff:'AI gateway is not configured.',aiBusy:'Generating a response...',connecting:'Connecting...',market:'MARKET CONTROL CENTER',headline:'Trade with a clearer view.',lead:'A focused dashboard for real prices, analysis and verified signal alerts — inside Telegram.',mode:'Runtime',tabMarket:'Markets',tabSignals:'Signals',tabWatch:'Watchlist',tabAccount:'Account',liveQuotes:'Observed market prices',refresh:'Refresh',chart:'Advanced charts',chartDesc:'Open a full TradingView chart for technical analysis and drawings.',alerts:'TradingView alerts',favorites:'My watchlist',watchHelp:'Choose symbols, then save your preferences.',save:'Save watchlist',account:'Telegram account',userId:'User ID',appVersion:'Version',execution:'Serverless runtime',disabled:'Not enabled in this foundation',disabledDesc:'Live streaming, automated trading, MT5, payments and AI remain disabled until secured integrations are completed.',disclaimer:'Educational information; not financial advice.',connected:'Connected',unavailable:'Unavailable',wait:'Fetching actual market observations...',noFeed:'Market feed unavailable. No estimated prices shown.',noSignals:'No verified signals received.',signalOff:'Signals gateway is not configured yet.',saved:'Watchlist saved.',notAuthorized:'Open this panel from its Telegram bot.',fetchError:'Service connection failed.'}
};
let locale='fa';let profile=null;let watch=new Set(['BTCUSDT','ETHUSDT']);
const tr=k=>messages[locale][k]||k;
function applyLocale(){document.documentElement.lang=locale;document.documentElement.dir=locale==='fa'?'rtl':'ltr';document.querySelectorAll('[data-i18n]').forEach(x=>x.textContent=tr(x.dataset.i18n));$('lang').textContent=locale==='fa'?'EN':'فا';}
function api(name,data={}){return new Promise((resolve,reject)=>{if(!tg?.Serverless?.call){reject(new Error('TELEGRAM_REQUIRED'));return;}tg.Serverless.call(name,data,(e,v)=>e?reject(new Error(e.message||'ERROR')):resolve(v));});}
function setConnection(ok){$('connection').innerHTML='';const dot=document.createTextNode(ok?'● ':'○ ');const span=document.createElement('span');span.textContent=ok?tr('connected'):tr('unavailable');$('connection').append(dot,span);}
function watchButtons(){const root=$('watch-options');root.replaceChildren();for(const sym of symbols){const b=document.createElement('button');b.className='watch-option'+(watch.has(sym)?' selected':'');b.type='button';b.textContent=sym.replace('USDT',' / USDT');b.setAttribute('aria-pressed',watch.has(sym));b.onclick=()=>{watch.has(sym)?watch.delete(sym):watch.add(sym);watchButtons();};root.append(b);}}
function charts(){const root=$('chart-links');root.replaceChildren();for(const sym of symbols){const a=document.createElement('a');a.textContent=sym.replace('USDT','/USDT')+' ↗';a.href='https://www.tradingview.com/chart/?symbol=BINANCE%3A'+encodeURIComponent(sym);a.target='_blank';a.rel='noopener noreferrer';root.append(a);}}
function renderPrice(sym,data){const box=document.createElement('div');box.className='quote-card';const name=document.createElement('div');name.className='asset';name.textContent=sym.replace('USDT',' / USDT');const price=document.createElement('div');price.className='price';const stamp=document.createElement('div');stamp.className='stamp';const source=document.createElement('div');source.className='source';if(data?.error){price.textContent='—';stamp.textContent=tr('noFeed');}else{price.textContent=new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(data.price);stamp.textContent=new Date(data.observedAt).toLocaleTimeString(locale==='fa'?'fa-IR':'en-US');source.textContent=data.source+' · indicative';}box.append(name,price,stamp,source);return box;}
async function loadMarket(){const root=$('quotes');root.replaceChildren();$('market-note').textContent=tr('wait');const data=await Promise.all(symbols.map(async s=>{try{return await api('getPrice',{symbol:s});}catch(_){return {error:true};}}));data.forEach((p,i)=>root.append(renderPrice(symbols[i],p)));$('market-note').textContent=data.every(v=>v.error)?tr('noFeed'):'';}
function signalCard(s){const div=document.createElement('article');div.className='signal-card';const top=document.createElement('div');top.className='signal-top';const title=document.createElement('strong');title.textContent=String(s.symbol||'—');const side=document.createElement('span');const value=String(s.side||'').toLowerCase();side.className='side '+(value==='buy'?'buy':'sell');side.textContent=value.toUpperCase();const meta=document.createElement('small');meta.textContent=[s.timeframe,s.created_at].filter(Boolean).join(' · ');top.append(title,side);div.append(top,meta);return div;}
async function loadSignals(){const root=$('signal-list');root.replaceChildren();try{const d=await api('getSignals',{limit:20});$('signal-state').textContent=!d.configured?tr('signalOff'):d.signals.length?'':tr('noSignals');(d.signals||[]).forEach(s=>root.append(signalCard(s)));}catch(_){$('signal-state').textContent=tr('fetchError');}}
async function loadUser(){try{profile=await api('getProfile');locale=['fa','en'].includes(profile.language)?profile.language:'fa';applyLocale();$('display-name').textContent=profile.firstName||'Telegram user';$('username').textContent=profile.username?'@'+profile.username:'Telegram';$('user-id').textContent=String(profile.id);$('avatar').textContent=(profile.firstName||'D').slice(0,1).toUpperCase();setConnection(true);}catch(_){setConnection(false);$('market-note').textContent=tr('notAuthorized');}try{const saved=await api('getWatchlist');watch=new Set(saved.symbols||[]);watchButtons();}catch(_){}}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(n=>n.classList.toggle('active',n===b));document.querySelectorAll('[data-panel]').forEach(n=>n.classList.toggle('visible',n.dataset.panel===b.dataset.tab));if(b.dataset.tab==='signals')loadSignals();}));

function appendAI(text,role){
 const bubble=document.createElement('div');
 bubble.className='ai-bubble '+role;bubble.textContent=text;$('ai-thread').append(bubble);
 bubble.scrollIntoView({block:'nearest'});return bubble;
}
$('ai-form').addEventListener('submit',async(event)=>{
 event.preventDefault();
 const message=$('ai-prompt').value.trim();
 if(!message)return;
 if(!GATEWAY_URL){$('ai-status').textContent=tr('aiOff');return;}
 if(!tg?.initData){$('ai-status').textContent=tr('notAuthorized');return;}
 $('ai-send').disabled=true;$('ai-status').textContent=tr('aiBusy');
 appendAI(message,'user');$('ai-prompt').value='';
 try{
  const res=await fetch(GATEWAY_URL.replace(/\/$/,'')+'/api/ai',{
   method:'POST',headers:{'Content-Type':'application/json','x-telegram-init-data':tg.initData},
   body:JSON.stringify({prompt:message})
  });
  if(!res.ok)throw new Error('HTTP '+res.status);
  const data=await res.json();
  if(typeof data.answer!=='string')throw new Error('No answer');
  appendAI(data.answer,'assistant');$('ai-status').textContent='';
 }catch(_){$('ai-status').textContent=tr('fetchError');}
 finally{$('ai-send').disabled=false;}
});

$('lang').onclick=async()=>{locale=locale==='fa'?'en':'fa';applyLocale();watchButtons();if(profile)try{await api('saveSettings',{language:locale});}catch(_){ } };
$('refresh').onclick=loadMarket;$('refresh-signals').onclick=loadSignals;
$('save-watch').onclick=async()=>{const b=$('save-watch');b.disabled=true;try{await api('saveWatchlist',{symbols:[...watch]});$('watch-state').textContent=tr('saved');}catch(_){$('watch-state').textContent=tr('fetchError');}finally{b.disabled=false;}};
applyLocale();watchButtons();charts();await loadUser();await loadMarket();
