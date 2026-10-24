import { GATEWAY_URL,ALLOWED_SYMBOLS } from '../lib/config.js';
import { EndpointError } from 'sdk';
export default async function(_input,ctx){
 if(!ctx?.initData?.user?.id) throw new EndpointError('Telegram authorization required');
 return {version:'0.1.0',serverless:true,defaultLanguage:'en',supportedLanguages:['en','fa','ar','tr','ru','hi'],symbols:ALLOWED_SYMBOLS,signalsConfigured:Boolean(GATEWAY_URL),features:{liveStreaming:false,mt5:false,autotrade:false,payments:false,ai:false,alerts:Boolean(GATEWAY_URL)}};
}
