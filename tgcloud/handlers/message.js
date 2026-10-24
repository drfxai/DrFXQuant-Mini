import { api } from 'sdk';
import { livePrice, normalizeSymbol } from '../lib/market.js';
import { publicSignals } from '../lib/signals.js';

const HELP = 'DrFXQuant Mini\n\n/start — welcome\n/help — commands\n/price BTCUSDT — live spot observation\n/signals — latest published alerts\n\nOpen the Mini App from the bot menu once configured. AI chat, trading and payments are not enabled in this foundation release.';
function fmtPrice(n){ return n.toLocaleString('en-US',{maximumFractionDigits:8}); }

export default async function(message) {
  if (!message?.chat?.id || typeof message.text !== 'string') return;
  const chatId = message.chat.id;
  // Avoid replying in unrelated group conversations.
  if (message.chat.type !== 'private' && !message.text.startsWith('/')) return;
  const cmd = message.text.trim().split(/\s+/);
  const op = (cmd[0]||'').split('@')[0].toLowerCase();
  if (op === '/start' || op === '/help') {
    await api.sendMessage({chat_id:chatId,text:HELP}); return;
  }
  if (op === '/price') {
    const symbol = normalizeSymbol(cmd[1]);
    if (!symbol) { await api.sendMessage({chat_id:chatId,text:'Use /price BTCUSDT (also ETHUSDT, SOLUSDT, BNBUSDT).'}); return; }
    const p = await livePrice(symbol);
    const text = p.error ? 'Market data unavailable. No price will be estimated.' : symbol + ' · ' + fmtPrice(p.price) + ' USDT\nSource: '+p.source+'\nObservation: '+new Date(p.observedAt).toISOString()+'\nIndicative spot quote, not an execution price.';
    await api.sendMessage({chat_id:chatId,text}); return;
  }
  if (op === '/signals') {
    const data = await publicSignals(5);
    if (!data.configured) { await api.sendMessage({chat_id:chatId,text:'Signals gateway is not configured yet.'}); return; }
    if (data.unavailable) { await api.sendMessage({chat_id:chatId,text:'Signal service temporarily unavailable.'}); return; }
    if (!data.signals.length) { await api.sendMessage({chat_id:chatId,text:'No verified signals available yet.'}); return; }
    const lines = data.signals.map(s=>s.symbol+' · '+String(s.side||'').toUpperCase()+' · '+s.timeframe+'\n'+s.created_at).join('\n\n');
    await api.sendMessage({chat_id:chatId,text:'Latest alerts (not trading advice):\n\n'+lines.slice(0,3500)});return;
  }
  if (message.chat.type === 'private') await api.sendMessage({chat_id:chatId,text:'Use /help to see available commands.'});
}
