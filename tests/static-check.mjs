import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const dirs=['tgcloud','cloudflare/src','web','docs'];
const files=[];
for(const dir of dirs){const walk=d=>{for(const x of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,x.name);if(x.isDirectory())walk(p);else files.push(p);}};walk(path.join(root,dir));}
for(const p of files){
 assert.ok(!/\.(key|pem|pfx|p12|crt|zip|db)$/i.test(p),'private/binary file in repo: '+p);
 if(p.endsWith('.js'))execFileSync(process.execPath,['--check',p]);
 if(p.includes('/tgcloud/')&&p.endsWith('.js')){
  const body=fs.readFileSync(p,'utf8');
  assert.ok(!/\b(require\s*\(|process\.env\b|node:|from ['"](?:express|pg|socket\.io|mediasoup))/.test(body),'Node-only import in telegram runtime '+p);
 }
}
assert.ok(fs.readFileSync(path.join(root,'web/index.html'),'utf8').includes('telegram-web-app.js'));
assert.ok(fs.readFileSync(path.join(root,'web/app.js'),'utf8').includes("Serverless.call"));
assert.ok(fs.readFileSync(path.join(root,'tgcloud/endpoints/getProfile.js'),'utf8').includes('ctx?.initData?.user'));
console.log('PASS: '+files.length+' files checked (syntax, runtime constraints, secrets, Mini App contract).');
