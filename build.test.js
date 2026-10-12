import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,writeFile,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
test('build só publica chave pública e rejeita configuração incompleta ou privilegiada',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'camila-build-'));
 try{await mkdir(join(dir,'public'));await writeFile(join(dir,'public/index.html'),'fixture');
 const run=(url,key)=>spawnSync(process.execPath,[new URL('./build.js',import.meta.url).pathname],{cwd:dir,env:{...process.env,SUPABASE_URL:url,SUPABASE_PUBLISHABLE_KEY:key},encoding:'utf8'});
 assert.equal(run('','').status,0);
 assert.notEqual(run('https://fixture.supabase.co','').status,0);
 assert.notEqual(run('https://fixture.supabase.co','sb_secret_forbidden').status,0);
 const privileged='x.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.x';
 assert.notEqual(run('https://fixture.supabase.co',privileged).status,0);
 assert.notEqual(run('http://fixture.supabase.co','sb_publishable_test').status,0);
 assert.equal(run('https://fixture.supabase.co','sb_publishable_test').status,0);
 assert.ok((await readFile(join(dir,'dist/config.js'),'utf8')).includes('sb_publishable_test'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
