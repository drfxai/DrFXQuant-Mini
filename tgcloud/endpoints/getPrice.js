import { EndpointError } from 'sdk';
import { livePrice,normalizeSymbol } from '../lib/market.js';
export default async function(input,ctx){
 if(!ctx?.initData?.user?.id) throw new EndpointError('Telegram authorization required');
 const sym=normalizeSymbol(input?.symbol);
 if(!sym) throw new EndpointError('Unsupported symbol',{code:'SYMBOL'});
 const result=await livePrice(sym);
 if(result.error) throw new EndpointError('Live market data is unavailable',{code:result.error});
 return result;
}
