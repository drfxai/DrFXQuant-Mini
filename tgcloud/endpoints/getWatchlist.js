import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { watchlists } from '../schema.js';
export default async function(_input,ctx){
 const id=ctx?.initData?.user?.id;
 if(!id) throw new EndpointError('Telegram authorization required');
 const record=await db.select().from(watchlists).where(eq(watchlists.userId,id)).get();
 let symbols=[];try{symbols=JSON.parse(record?.symbols||'[]');}catch(_){}
 return {symbols:Array.isArray(symbols)?symbols:[]};
}
