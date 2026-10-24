// DrFXQuant Mini: public TradingView webhook ingress, durable D1 inbox & bot relay.
// Source behavior adapted from legacy routes/webhooks.js; no Express/PM2/WebSocket.
// No trading execution, payments or financial balances in this gateway.
const HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const te=new TextEncoder();
function json(value,status=200,headers={}){return new Response(JSON.stringify(value),{status,headers:{...HEADERS,...headers}});}
async function sha(input){const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',te.encode(input)));return [...digest].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function safeEqual(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const x=await sha(a),y=await sha(b);let bad=0;for(let i=0;i<64;i++)bad|=x.charCodeAt(i)^y.charCodeAt(i);return bad===0;}
function finiteOptional(x){if(x===undefined||x===null||x==='')return null;const n=Number(x);return Number.isFinite(n)&&n>=0?n:null;}
function parseSignal(o){
 if(!o||typeof o!=='object'||Array.isArray(o))return null;
 const symbol=String(o.symbol||'').trim().toUpperCase(),side=String(o.side||'').trim().toLowerCase();
 const type=({long:'buy',short:'sell',buy:'buy',sell:'sell',close:'close',alert:'alert'})[side];
 if(!/^[A-Z0-9._:/-]{2,32}$/.test(symbol)||!type)return null;
 const timeframe=String(o.timeframe||'').trim().slice(0,16)||'na';
 if(!/^[A-Za-z0-9 _-]{1,16}$/.test(timeframe))return null;
 for(const name of ['price','stop_loss','take_profit'])if(o[name]!==undefined&&o[name]!==null&&o[name]!==''&&finiteOptional(o[name])===null)return null;
 return {symbol,side:type,timeframe,price:finiteOptional(o.price),stop_loss:finiteOptional(o.stop_loss),take_profit:finiteOptional(o.take_profit),strategy:String(o.strategy||'').slice(0,100)};
}
async function announce(env,signal){
 if(!env.TELEGRAM_BOT_TOKEN||!env.SIGNAL_CHANNEL_ID)return false;
 const rows=[signal.symbol+' · '+signal.side.toUpperCase(), 'TF: '+signal.timeframe];
 if(signal.price!==null)rows.push('Entry: '+signal.price);
 if(signal.stop_loss!==null)rows.push('SL: '+signal.stop_loss);
 if(signal.take_profit!==null)rows.push('TP: '+signal.take_profit);
 rows.push('TradingView alert · Not financial advice');
 const response=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:env.SIGNAL_CHANNEL_ID,text:rows.join('\n'),disable_web_page_preview:true})
 });
 if(!response.ok)return false;
 const data=await response.json();
 return Boolean(data.ok);
}
async function relayPending(env){
 if(!env.TELEGRAM_BOT_TOKEN||!env.SIGNAL_CHANNEL_ID)return;
 const now=Date.now();
 const results=await env.SIGNALS_DB.prepare('SELECT * FROM signals WHERE delivered_at IS NULL AND lease_until < ? AND attempts < 12 ORDER BY created_at ASC LIMIT 10').bind(now).all();
 for(const signal of results.results||[]){
   // Claim before making network request. Retries are at-least-once (not exactly-once).
   const leased=await env.SIGNALS_DB.prepare('UPDATE signals SET lease_until=?,attempts=attempts+1 WHERE id=? AND delivered_at IS NULL AND lease_until < ?').bind(now+60000,signal.id,now).run();
   if(!leased.meta?.changes)continue;
   let ok=false;try{ok=await announce(env,signal);}catch(_){ok=false;}
   if(ok)await env.SIGNALS_DB.prepare('UPDATE signals SET delivered_at=? WHERE id=? AND delivered_at IS NULL').bind(new Date().toISOString(),signal.id).run();
 }
}
async function ingest(request,env,ctx){
 if(!env.TRADINGVIEW_WEBHOOK_SECRET)return json({error:'webhook_not_configured'},503);
 const len=Number(request.headers.get('content-length')||0);
 if(len>32768)return json({error:'payload_too_large'},413);
 const raw=await request.text();
 if(te.encode(raw).length>32768)return json({error:'payload_too_large'},413);
 let o;try{o=JSON.parse(raw);}catch(_){return json({error:'invalid_json'},400);}
 if(!await safeEqual(o?.secret,env.TRADINGVIEW_WEBHOOK_SECRET))return json({error:'unauthorized'},401);
 const normalized=parseSignal(o);
 if(!normalized)return json({error:'invalid_signal'},400);
 // Same payload in same minute produces the same ID; re-sent next minute is new.
 // Hash excludes shared secret, and no secret is persisted.
 const dedupePayload=JSON.stringify(normalized);
 const id=await sha(dedupePayload+'|'+Math.floor(Date.now()/60000));
 const row=await env.SIGNALS_DB.prepare('INSERT OR IGNORE INTO signals (id,symbol,side,timeframe,price,stop_loss,take_profit,strategy,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
 .bind(id,normalized.symbol,normalized.side,normalized.timeframe,normalized.price,normalized.stop_loss,normalized.take_profit,normalized.strategy,new Date().toISOString()).run();
 if(row.meta?.changes)ctx.waitUntil(relayPending(env).catch(()=>{}));
 return json({accepted:Boolean(row.meta?.changes),duplicate:!Boolean(row.meta?.changes)},202);
}
async function listSignals(request,env){
 const u=new URL(request.url);const parsed=Number(u.searchParams.get('limit')||15);
 const limit=Number.isFinite(parsed)?Math.max(1,Math.min(30,Math.floor(parsed))):15;
 const results=await env.SIGNALS_DB.prepare('SELECT symbol,side,timeframe,price,stop_loss,take_profit,strategy,created_at FROM signals ORDER BY created_at DESC LIMIT ?').bind(limit).all();
 return json({signals:results.results||[]});
}
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==='/health'&&request.method==='GET')return json({ok:true,service:'DrFXQuant Mini Gateway',version:'0.1.0'});
  if(url.pathname==='/api/webhooks/tradingview'){
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    if(!env.SIGNALS_DB)return json({error:'storage_unavailable'},503);
    return ingest(request,env,ctx);
  }
  if(url.pathname==='/api/signals'){
    if(request.method!=='GET')return json({error:'method_not_allowed'},405);
    if(!env.SIGNALS_DB)return json({error:'storage_unavailable'},503);
    return listSignals(request,env);
  }
  return json({error:'not_found'},404);
 },
 async scheduled(_event,env,_ctx){if(env.SIGNALS_DB)await relayPending(env);}
};
