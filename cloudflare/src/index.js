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

async function hmacSha256(key,data){
 const imported=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return new Uint8Array(await crypto.subtle.sign('HMAC',imported,te.encode(data)));
}
async function verifyMiniApp(initData,token){
 if(typeof initData!=='string'||initData.length>8192||!token)return null;
 const form=new URLSearchParams(initData);
 const provided=form.get('hash'),authTime=Number(form.get('auth_date'));
 if(!provided||!/^[a-fA-F0-9]{64}$/.test(provided)||!Number.isSafeInteger(authTime))return null;
 const age=Math.floor(Date.now()/1000)-authTime;
 if(age< -30||age>900)return null;
 const check=[...form.entries()].filter(([key])=>key!=='hash').sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0).map(([k,value])=>k+'='+value).join('\n');
 const secret=await hmacSha256(te.encode('WebAppData'),token);
 const signed=await hmacSha256(secret,check);
 const expected=[...signed].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(!await safeEqual(expected,provided.toLowerCase()))return null;
 try{const user=JSON.parse(form.get('user')||'null');return user&&Number.isSafeInteger(user.id)&&user.id>0?user:null;}catch(_){return null;}
}
function aiCors(origin){return {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,x-telegram-init-data','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};}
async function aiReply(request,env){
 const origin=request.headers.get('origin')||'';
 if(!env.ALLOWED_ORIGIN||origin!==env.ALLOWED_ORIGIN)return json({error:'origin_forbidden'},403);
 const cors=aiCors(origin);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return json({error:'method_not_allowed'},405,cors);
 if(!env.OPENROUTER_API_KEY||!env.OPENROUTER_MODEL||!env.TELEGRAM_BOT_TOKEN||!env.SIGNALS_DB)return json({error:'ai_not_configured'},503,cors);
 const user=await verifyMiniApp(request.headers.get('x-telegram-init-data'),env.TELEGRAM_BOT_TOKEN);
 if(!user)return json({error:'unauthorized'},401,cors);
 let req;try{req=await request.json();}catch(_){return json({error:'invalid_json'},400,cors);}
 const prompt=typeof req?.prompt==='string'?req.prompt.trim():'';
 if(!prompt||prompt.length>1800)return json({error:'invalid_prompt'},400,cors);
 const day=new Date().toISOString().slice(0,10),userId=String(user.id);
 const quota=await env.SIGNALS_DB.prepare(
  'INSERT INTO ai_usage (user_id,day,requests) VALUES (?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET requests=requests+1 WHERE requests < 20 RETURNING requests'
 ).bind(userId,day).first();
 if(!quota)return json({error:'daily_quota_reached'},429,cors);
 let upstream;
 try{
  upstream=await fetch('https://openrouter.ai/api/v1/chat/completions',{
   method:'POST',headers:{Authorization:'Bearer '+env.OPENROUTER_API_KEY,'Content-Type':'application/json'},
   body:JSON.stringify({model:env.OPENROUTER_MODEL,messages:[
    {role:'system',content:'You are DrFXQuant Mini educational trading assistant. Explain concepts and risk carefully. Do not claim real-time market data, execute trades, promise profits or fabricate live prices. Be concise; reply in the language used by the user.'},
    {role:'user',content:prompt}
   ],temperature:0.35,max_tokens:650})
  });
  if(!upstream.ok)throw new Error('provider_error');
  const data=await upstream.json();
  const answer=data?.choices?.[0]?.message?.content;
  if(typeof answer!=='string'||!answer.trim())throw new Error('invalid_response');
  return json({answer:answer.slice(0,6500),model:env.OPENROUTER_MODEL,educational:true},200,cors);
 }catch(_){return json({error:'ai_provider_unavailable'},502,cors);}
}

export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==='/api/ai')return aiReply(request,env);
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
