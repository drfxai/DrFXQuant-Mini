import { fetch } from 'sdk';
import { ALLOWED_SYMBOLS } from './config.js';

export function normalizeSymbol(value) {
  const cleaned = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  return ALLOWED_SYMBOLS.includes(cleaned) ? cleaned : null;
}
export async function livePrice(symbol) {
  const selected = normalizeSymbol(symbol);
  if (!selected) return {error:'UNSUPPORTED_SYMBOL'};
  // Real upstream observation only. Never substitute a fabricated price.
  const url = 'https://api.binance.com/api/v3/ticker/price?symbol=' + encodeURIComponent(selected);
  try {
    const response = await fetch(url);
    if (!response.ok) return {error:'MARKET_FEED_UNAVAILABLE'};
    const body = await response.json();
    const price = Number(body.price);
    if (body.symbol !== selected || !Number.isFinite(price) || price <= 0) return {error:'MARKET_FEED_INVALID'};
    return {symbol:selected,price,observedAt:Date.now(),source:'Binance public REST',indicative:true};
  } catch (_) {
    return {error:'MARKET_FEED_UNAVAILABLE'};
  }
}
