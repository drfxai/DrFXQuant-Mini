import { api, db } from 'sdk';
import { eq } from 'sdk/db';
import { settings } from '../schema.js';
import { livePrice, normalizeSymbol } from '../lib/market.js';
import { publicSignals } from '../lib/signals.js';
import { BOT_LANGUAGES, botLocale, botText } from '../lib/bot-i18n.js';

function fmtPrice(n){return n.toLocaleString('en-US',{maximumFractionDigits:8});}
async function getLanguage(userId){
 if(!userId)return 'en';
 try{
  const saved=await db.select().from(settings).where(eq(settings.userId,userId)).get();
  return botLocale(saved?.language);
 }catch(_){return 'en';}
}
async function send(chatId,text){await api.sendMessage({chat_id:chatId,text});}

export default async function(message){
 if(!message?.chat?.id || typeof message.text!=='string')return;
 const chatId=message.chat.id;
 if(message.chat.type!=='private' && !message.text.startsWith('/'))return;
 const userId=message.from?.id;
 const tokens=message.text.trim().split(/\s+/);
 const op=(tokens[0]||'').split('@')[0].toLowerCase();
 let language=await getLanguage(userId);
 const t=key=>botText(language,key);
 if(op==='/language'){
  const requested=String(tokens[1]||'').trim().toLowerCase();
  if(!BOT_LANGUAGES.includes(requested)){await send(chatId,t('languageUsage'));return;}
  if(!userId){await send(chatId,t('languageError'));return;}
  try{
   await db.insert(settings).values({userId,language:requested})
      .onConflictDoUpdate({target:settings.userId,set:{language:requested}}).run();
   language=requested;
   await send(chatId,t('languageSaved'));
  }catch(_){await send(chatId,t('languageError'));}
  return;
 }
 if(op==='/start'||op==='/help'){await send(chatId,t('help'));return;}
 if(op==='/price'){
  const symbol=normalizeSymbol(tokens[1]);
  if(!symbol){await send(chatId,t('priceUsage'));return;}
  const data=await livePrice(symbol);
  if(data.error){await send(chatId,t('noFeed'));return;}
  const text=symbol+' · '+fmtPrice(data.price)+' USDT\n'+t('source')+': '+data.source+'\n'+t('observation')+': '+new Date(data.observedAt).toISOString()+'\n'+t('indicative');
  await send(chatId,text);return;
 }
 if(op==='/signals'){
  const result=await publicSignals(5);
  if(!result.configured){await send(chatId,t('signalOff'));return;}
  if(result.unavailable){await send(chatId,t('signalsUnavailable'));return;}
  if(!result.signals.length){await send(chatId,t('noSignals'));return;}
  const lines=result.signals.map(s=>s.symbol+' · '+String(s.side||'').toUpperCase()+' · '+s.timeframe+'\n'+s.created_at).join('\n\n');
  await send(chatId,t('signalTitle')+'\n\n'+lines.slice(0,3500));return;
 }
 if(message.chat.type==='private')await send(chatId,t('helpShort'));
}
