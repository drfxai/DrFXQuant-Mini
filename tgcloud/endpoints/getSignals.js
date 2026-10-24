import { EndpointError } from 'sdk';
import { publicSignals } from '../lib/signals.js';
export default async function(input,ctx){
 if(!ctx?.initData?.user?.id) throw new EndpointError('Telegram authorization required');
 const result=await publicSignals(input?.limit);
 if(result.unavailable) throw new EndpointError('Signals gateway unavailable',{code:'GATEWAY_UNAVAILABLE'});
 return result;
}
