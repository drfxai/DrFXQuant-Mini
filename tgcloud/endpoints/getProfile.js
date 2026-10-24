import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { settings } from '../schema.js';
export default async function(_input,ctx){
  const u=ctx?.initData?.user;
  if(!u?.id) throw new EndpointError('Telegram authorization required');
  const saved=await db.select().from(settings).where(eq(settings.userId,u.id)).get();
  return {id:u.id,firstName:String(u.first_name||''),username:String(u.username||''),language:saved?.language||'en',source:'telegram'};
}
