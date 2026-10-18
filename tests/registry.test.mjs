import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../server/handler.mjs';
const origin='https://sparolab.github.io';
const catalog={topics:['SLAM'],papers:[{id:'base',title:'Existing paper'}]};
const env={GITHUB_CONTENTS_TOKEN:'test-token'};
const paper={kind:'paper',title:'새 논문 — SLAM',venue:'CVPR',year:2026,topic:'SLAM',paperUrl:'https://example.com/paper'};
function fixture(){
 let data={version:1,papers:[],teams:[]},revision=0,conflicts=0,failWrite=false,calls=[];
 const fetcher=async(url,options)=>{
  if(options.redirect==='error')throw new TypeError('Worker runtime supports only follow or manual redirects');
  calls.push({url,method:options.method||'GET'});
  assert.ok(url.startsWith('https://api.github.com/repos/sparolab/ece7128/contents/data/submissions.json'));
  if(options.method!=='PUT')return Response.json({sha:String(revision),content:Buffer.from(JSON.stringify(data)).toString('base64')});
  if(failWrite)return Response.json({}, {status:403});
  const b=JSON.parse(options.body);
  if(conflicts-->0){data.papers.push({...paper,id:'concurrent-'+revision,title:'Another paper '+revision});revision++;return Response.json({}, {status:409});}
  if(b.sha!==String(revision))return Response.json({}, {status:409});
  data=JSON.parse(Buffer.from(b.content,'base64').toString());revision++;return Response.json({commit:{sha:'x'}});
 };
 return {handle:createHandler({catalog,fetcher}),get data(){return data},get calls(){return calls},set conflicts(n){conflicts=n},set failWrite(v){failWrite=v}};
}
const req=(body,options={})=>new Request('https://server.example/api/course-registry',{method:options.method||'POST',headers:{Origin:options.origin||origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('accepts submissions without a course code; writes only metadata; retries are idempotent',async()=>{const f=fixture();let r=await f.handle(req({...paper,repo:'another/repo',pdf:'not saved'}),env);assert.equal(r.status,201);assert.equal(f.data.papers[0].title,paper.title);assert.equal(f.data.papers[0].pdf,undefined);r=await f.handle(req(paper),env);assert.equal(r.status,200);assert.equal((await r.json()).existing,true);assert.equal(f.data.papers.length,1);});
test('existing catalog title is not duplicated',async()=>{const f=fixture();assert.equal((await f.handle(req({...paper,title:' Existing   paper '}),env)).status,200);assert.equal(f.data.papers.length,0);});
test('rejects cross-origin writes before GitHub call',async()=>{const f=fixture();assert.equal((await f.handle(req(paper,{origin:'https://other.example'}),env)).status,403);assert.equal(f.calls.length,0);});
test('validates links, required fields and payload size',async()=>{const f=fixture();for(const b of [{...paper,paperUrl:'javascript:alert(1)'},{...paper,title:''},{...paper,year:0},{...paper,topic:'No'}])assert.equal((await f.handle(req(b),env)).status,400);assert.equal((await f.handle(req({...paper,summary:'x'.repeat(20000)}),env)).status,413);assert.equal(f.data.papers.length,0);});
test('optimistic concurrency preserves another submission',async()=>{const f=fixture();f.conflicts=1;assert.equal((await f.handle(req(paper),env)).status,201);assert.equal(f.data.papers.length,2);});
test('write failure is not reported as success',async()=>{const f=fixture();f.failWrite=true;assert.equal((await f.handle(req(paper),env)).status,503);assert.equal(f.data.papers.length,0);});
test('missing secrets disables registration',async()=>{const f=fixture();assert.equal((await f.handle(req(paper),{})).status,503);assert.equal(f.calls.length,0);});
test('team edit key is required; public API omits hash',async()=>{const f=fixture();const team={kind:'team',id:crypto.randomUUID(),editKey:crypto.randomUUID(),name:'Team',member1:'A',member2:'B',paperId:'base'};assert.equal((await f.handle(req(team),env)).status,201);assert.equal((await f.handle(req({...team,editKey:crypto.randomUUID()},{method:'PATCH'}),env)).status,403);assert.equal((await f.handle(req({...team,url:'https://example.com/team'},{method:'PATCH'}),env)).status,200);const r=await f.handle(new Request('https://server.example/api/course-registry'),env);const d=await r.json();assert.equal(d.teams[0].editHash,undefined);assert.equal(d.teams[0].editKey,undefined);assert.equal(d.teams[0].url,'https://example.com/team');});
test('CORS preflight admits only course origin',async()=>{const f=fixture();const r=await f.handle(new Request('https://server.example/api/course-registry',{method:'OPTIONS',headers:{Origin:origin}}),env);assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);});

test('does not follow GitHub redirects carrying credentials',async()=>{let calls=0;const h=createHandler({catalog,fetcher:async()=>{calls++;return new Response(null,{status:302,headers:{Location:'https://other.example'}})}});const r=await h(new Request('https://server.example/api/course-registry'),env);assert.equal(r.status,503);assert.equal(calls,1);});
