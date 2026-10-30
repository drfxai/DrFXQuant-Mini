import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

test('scheduled bootstrap configures webhook and Mini App menu without exposing secrets', async () => {
 const original=globalThis.fetch,requests=[];
 let current=null;
 const app='https://drfxquant-mini.drfxai.workers.dev/';
 const hook=app+'api/bot/webhook';
 const db={prepare(sql){let values=[];return {
  bind(...v){values=v;return this;},
  async first(){if(sql.startsWith('SELECT status,last_attempt'))return current;if(sql.startsWith('SELECT status,last_attempt,last_ready'))return current;return null;},
  async run(){if(sql.startsWith('INSERT INTO bot_setup_status'))current={status:values[0],last_attempt:values[1],last_ready:values[2],last_error:values[3],bot_username:values[4]};return {meta:{changes:1}};}
 };}};
 globalThis.fetch=async (url,opts) => {
  const method=String(url).split('/').pop();
  const body=JSON.parse(opts.body);
  requests.push({method,body});
  const result=method==='getMe'?{is_bot:true,username:'DrfxQuantTestBot'}:method==='getWebhookInfo'?{url:hook}:method==='getChatMenuButton'?{type:'web_app',web_app:{url:app}}:true;
  return Response.json({ok:true,result});
 };
 try{
  const env={SIGNALS_DB:db,TELEGRAM_BOT_TOKEN:'123:local-test-token',TELEGRAM_WEBHOOK_SECRET:'local-test-webhook'};
  await worker.scheduled({},env,{});
  assert.equal(current.status,'ready');
  assert.equal(requests.find(x=>x.method==='setWebhook').body.secret_token,'local-test-webhook');
  assert.equal(requests.find(x=>x.method==='setChatMenuButton').body.menu_button.web_app.url,app);
  const status=await worker.fetch(new Request(app+'api/bot/status'),env,{});
  const data=await status.json();
  assert.equal(data.ready,true);
  assert.ok(!JSON.stringify(data).includes('local-test-token'));
  await worker.scheduled({},env,{});
  assert.equal(requests.filter(x=>x.method==='setWebhook').length,1);
 }finally{globalThis.fetch=original;}
});

test('/start provides direct Telegram Mini App web_app button',async()=>{
 const original=globalThis.fetch,requests=[];
 globalThis.fetch=async (url,opts) => {
  const method=String(url).split('/').pop();
  requests.push({method,body:JSON.parse(opts.body)});
  return Response.json({ok:true,result:true});
 };
 const db={prepare(){return {bind(){return this;},async first(){return {language:'en'};}}}};
 try{
  const request=new Request('https://example.com/api/bot/webhook',{method:'POST',headers:{'content-type':'application/json','x-telegram-bot-api-secret-token':'local-test-webhook'},body:JSON.stringify({message:{chat:{id:123,type:'private'},from:{id:123},text:'/start'}})});
  const response=await worker.fetch(request,{SIGNALS_DB:db,TELEGRAM_BOT_TOKEN:'123:local-test-token',TELEGRAM_WEBHOOK_SECRET:'local-test-webhook'},{});
  assert.equal(response.status,200);
  const sent=requests.find(x=>x.method==='sendMessage');
  assert.ok(sent);
  assert.equal(sent.body.reply_markup.inline_keyboard[0][0].web_app.url,'https://drfxquant-mini.drfxai.workers.dev/');
 }finally{globalThis.fetch=original;}
});
