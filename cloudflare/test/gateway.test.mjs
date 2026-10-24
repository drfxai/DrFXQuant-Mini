import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
function mockDb(){
 const rows=new Map();
 return {rows,prepare(query){
  let vals=[];
  return {bind(...v){vals=v;return this;},async run(){
   if(query.startsWith('INSERT OR IGNORE')){
    if(rows.has(vals[0]))return {meta:{changes:0}};
    rows.set(vals[0],{id:vals[0],symbol:vals[1],side:vals[2],timeframe:vals[3],price:vals[4],stop_loss:vals[5],take_profit:vals[6],strategy:vals[7],created_at:vals[8],delivered_at:null,attempts:0,lease_until:0});return {meta:{changes:1}};
   }
   if(query.startsWith('UPDATE signals SET lease_until=')){const row=rows.get(vals[1]);if(!row||row.delivered_at||row.lease_until>=vals[2])return {meta:{changes:0}};row.lease_until=vals[0];row.attempts++;return {meta:{changes:1}};}
   if(query.startsWith('UPDATE signals SET delivered_at=')){const row=rows.get(vals[1]);if(!row)return {meta:{changes:0}};row.delivered_at=vals[0];return {meta:{changes:1}};}
   throw new Error('unexpected run SQL: '+query);
  },async all(){
   if(query.startsWith('SELECT * FROM signals'))return {results:[...rows.values()].filter(r=>!r.delivered_at&&r.lease_until<vals[0]&&r.attempts<12).slice(0,10)};
   if(query.startsWith('SELECT symbol,side,timeframe'))return {results:[...rows.values()].reverse().slice(0,vals[0]).map(({id,delivered_at,attempts,lease_until,...r})=>r)};
   throw new Error('unexpected all SQL: '+query);
  }};
 }};
}
const req=(body)=>new Request('https://gateway.test/api/webhooks/tradingview',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
test('unauthorized alert is rejected before persistence',async()=>{
 const db=mockDb(),ctx={waitUntil(){}};
 const r=await worker.fetch(req({secret:'incorrect',symbol:'BTCUSDT',side:'buy'}),{SIGNALS_DB:db,TRADINGVIEW_WEBHOOK_SECRET:'really-long-secret'},ctx);
 assert.equal(r.status,401);assert.equal(db.rows.size,0);
});
test('valid alert persists, replay is ignored, public list excludes secret',async()=>{
 const db=mockDb(),ctx={waitUntil(){}},env={SIGNALS_DB:db,TRADINGVIEW_WEBHOOK_SECRET:'really-long-secret'};
 const payload={secret:'really-long-secret',symbol:'BTCUSDT',side:'long',timeframe:'15m',price:100};
 let r=await worker.fetch(req(payload),env,ctx);assert.equal(r.status,202);assert.equal((await r.json()).accepted,true);
 r=await worker.fetch(req(payload),env,ctx);assert.equal((await r.json()).duplicate,true);assert.equal(db.rows.size,1);
 r=await worker.fetch(new Request('https://gateway.test/api/signals?limit=5'),env,ctx);
 const result=await r.json();assert.equal(result.signals[0].side,'buy');assert.ok(!JSON.stringify(result).includes('really-long-secret'));
});
test('malformed signal is rejected',async()=>{
 const db=mockDb(),ctx={waitUntil(){}},env={SIGNALS_DB:db,TRADINGVIEW_WEBHOOK_SECRET:'really-long-secret'};
 const r=await worker.fetch(req({secret:'really-long-secret',symbol:'BTCUSDT',side:'buy',price:'not-real'}),env,ctx);assert.equal(r.status,400);
});
