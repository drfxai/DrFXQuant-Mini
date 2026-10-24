import { db, EndpointError } from 'sdk';
import { settings } from '../schema.js';
export default async function(input,ctx){
 const userId=ctx?.initData?.user?.id;
 if(!userId) throw new EndpointError('Telegram authorization required');
 const language=input?.language;
 if(!['en','fa','ar','tr','ru','hi'].includes(language)) throw new EndpointError('Unsupported language',{code:'LANG'});
 await db.insert(settings).values({userId,language})
   .onConflictDoUpdate({target:settings.userId,set:{language}}).run();
 return {language};
}
