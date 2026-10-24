import { fetch } from 'sdk';
import { GATEWAY_URL } from './config.js';

export async function publicSignals(limit=15) {
  if (!GATEWAY_URL) return {configured:false,signals:[]};
  const safeLimit = Math.min(30,Math.max(1,Number(limit)||15));
  try {
    const res = await fetch(GATEWAY_URL.replace(/\/$/,'') + '/api/signals?limit=' + safeLimit);
    if (!res.ok) throw new Error('HTTP_' + res.status);
    const data = await res.json();
    if (!Array.isArray(data.signals)) throw new Error('BAD_RESPONSE');
    return {configured:true,signals:data.signals.slice(0,safeLimit)};
  } catch (_) {
    return {configured:true,unavailable:true,signals:[]};
  }
}
