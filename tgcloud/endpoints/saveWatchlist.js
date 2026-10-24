import { db, EndpointError } from 'sdk';
import { watchlists } from '../schema.js';
import { normalizeSymbol } from '../lib/market.js';
export default async function(input,ctx){
 const userId=ctx?.initData?.user?.id;
 if(!userId) throw new EndpointError('Telegram authorization required');
 if(!Array.isArray(input?.symbols) || input.symbols.length>20) throw new EndpointError('Invalid watchlist',{code:'INVALID_INPUT'});
 const symbols=[...new Set(input.symbols.map(normalizeSymbol))];
 if(symbols.some(s=>!s)) throw new EndpointError('Unsupported symbol',{code:'SYMBOL'});
 await db.insert(watchlists).values({userId,symbols:JSON.stringify(symbols)})
    .onConflictDoUpdate({target:watchlists.userId,set:{symbols:JSON.stringify(symbols)}}).run();
 return {symbols};
}
