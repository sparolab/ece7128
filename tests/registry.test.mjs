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
test('preserves optional author, affiliation and keyword metadata',async()=>{const f=fixture();const r=await f.handle(req({...paper,authors:'Alice Park, Bob Cho',affiliations:'Inha University; ETH Zurich',keywords:'LiDAR, loop closure'}),env);assert.equal(r.status,201);assert.deepEqual(f.data.papers[0].authors,['Alice Park','Bob Cho']);assert.deepEqual(f.data.papers[0].affiliations,['Inha University','ETH Zurich']);assert.deepEqual(f.data.papers[0].keywords,['LiDAR','loop closure']);});
test('rejects oversized metadata without writing',async()=>{const f=fixture();assert.equal((await f.handle(req({...paper,authors:'A'.repeat(3001)}),env)).status,400);assert.equal(f.data.papers.length,0);});

test('proposal can be submitted before a project page; links and server timestamps survive reload',async()=>{
 const f=fixture(),team={kind:'team',id:crypto.randomUUID(),editKey:crypto.randomUUID(),name:'Proposal team',member1:'A',member2:'B',paperId:'base',proposalUrl:'https://youtu.be/abcdefghijk'};
 const created=await f.handle(req(team),env);assert.equal(created.status,201);
 const saved=(await created.json()).team;assert.equal(saved.url,'');assert.equal(saved.proposalUrl,team.proposalUrl);assert.ok(Date.parse(saved.proposalSubmittedAt));assert.equal(saved.proposalUpdatedAt,saved.proposalSubmittedAt);
 const reload=await f.handle(new Request('https://server.example/api/course-registry'),env);assert.equal((await reload.json()).teams[0].proposalUrl,team.proposalUrl);
 const {proposalUrl,...legacy}=team;
 const changed=await f.handle(req({...legacy,url:'https://example.com/project'},{method:'PATCH'}),env);assert.equal(changed.status,200);
 assert.equal(f.data.teams[0].proposalUrl,proposalUrl);assert.equal(f.data.teams[0].proposalSubmittedAt,saved.proposalSubmittedAt);assert.equal(f.data.teams[0].proposalUpdatedAt,saved.proposalUpdatedAt);
 const updated=await f.handle(req({...team,proposalUrl:'https://www.youtube.com/watch?v=lmnopqrstuv',url:'https://example.com/project',proposalSubmittedAt:'forged'},{method:'PATCH'}),env);assert.equal(updated.status,200);
 assert.equal(f.data.teams[0].proposalSubmittedAt,saved.proposalSubmittedAt);assert.equal(f.data.teams[0].url,'https://example.com/project');assert.equal(f.data.teams.length,1);
 const removed=await f.handle(req({...team,proposalUrl:''},{method:'PATCH'}),env);assert.equal(removed.status,200);assert.equal(f.data.teams[0].proposalUrl,'');assert.equal(f.data.teams[0].proposalSubmittedAt,null);
});
test('existing teams can add a proposal; unauthorized and unsafe changes do not overwrite it',async()=>{
 const f=fixture(),team={kind:'team',id:crypto.randomUUID(),editKey:crypto.randomUUID(),name:'Existing team',member1:'A',member2:'B',paperId:'base',url:'https://example.com/project'};
 await f.handle(req(team),env);
 const withProposal={...team,proposalUrl:'https://youtu.be/abcdefghijk'};
 assert.equal((await f.handle(req(withProposal,{method:'PATCH'}),env)).status,200);
 for(const proposalUrl of ['javascript:alert(1)','data:text/html,test','https://user:password@example.com','x'.repeat(2001)])assert.equal((await f.handle(req({...team,proposalUrl},{method:'PATCH'}),env)).status,400);
 assert.equal((await f.handle(req({...withProposal,editKey:crypto.randomUUID(),proposalUrl:''},{method:'PATCH'}),env)).status,403);
 assert.equal(f.data.teams[0].proposalUrl,withProposal.proposalUrl);assert.equal(f.data.teams[0].url,team.url);
 f.failWrite=true;assert.equal((await f.handle(req({...team,proposalUrl:''},{method:'PATCH'}),env)).status,503);assert.equal(f.data.teams[0].proposalUrl,withProposal.proposalUrl);
});

test('separate submissions work without a browser edit key and cannot change team identity',async()=>{
 const f=fixture(),team={kind:'team',id:crypto.randomUUID(),editKey:crypto.randomUUID(),name:'Existing',member1:'Alice Park',member2:'Bob Cho',paperId:'base'};
 await f.handle(req(team),env);
 const body={kind:'submission',id:team.id,submissionType:'proposal',submitter:' Alice  Park ',submissionUrl:'https://youtu.be/abcdefghijk',name:'Tampered',member1:'Other',paperId:'other',url:'https://wrong.example'};
 const r=await f.handle(req(body,{method:'PATCH'}),env);assert.equal(r.status,200);const result=(await r.json()).team;
 assert.equal(result.name,team.name);assert.deepEqual(result.members,[team.member1,team.member2]);assert.equal(result.paperId,'base');assert.equal(result.url,'');assert.equal(result.proposalUrl,body.submissionUrl);assert.equal(result.editHash,undefined);assert.equal(result.submissionHistory,undefined);
 assert.equal(f.data.teams.length,1);assert.equal(f.data.teams[0].submissionHistory.length,1);
 assert.equal((await f.handle(req(body,{method:'PATCH'}),env)).status,200);assert.equal(f.data.teams[0].submissionHistory.length,1);
 const project={...body,submissionType:'project',submitter:'Bob Cho',submissionUrl:'https://example.com/team'};
 assert.equal((await f.handle(req(project,{method:'PATCH'}),env)).status,200);assert.equal(f.data.teams[0].proposalUrl,body.submissionUrl);assert.equal(f.data.teams[0].url,project.submissionUrl);
 for(const bad of [{...body,submitter:'Unknown'},{...body,submissionType:'identity'},{...body,submissionUrl:'javascript:alert(1)'}])assert.equal((await f.handle(req(bad,{method:'PATCH'}),env)).status,400);
 assert.equal((await f.handle(req({...body,id:crypto.randomUUID()},{method:'PATCH'}),env)).status,404);
 assert.equal((await f.handle(req(body,{method:'PATCH',origin:'https://other.example'}),env)).status,403);
 f.failWrite=true;assert.equal((await f.handle(req({...body,submissionUrl:'https://youtu.be/lmnopqrstuv'},{method:'PATCH'}),env)).status,503);assert.equal(f.data.teams[0].proposalUrl,body.submissionUrl);
});
test('same students cannot create duplicate teams even with another ID, name or member order',async()=>{
 const f=fixture(),team={kind:'team',id:crypto.randomUUID(),editKey:crypto.randomUUID(),name:'Original',member1:'Alice Park',member2:'Bob Cho',paperId:'base'};
 await f.handle(req(team),env);
 const duplicate={...team,id:crypto.randomUUID(),editKey:crypto.randomUUID(),name:'Changed team',member1:'BobCho',member2:'Alice Park'};
 let r=await f.handle(req(duplicate),env);assert.equal(r.status,409);assert.equal((await r.json()).existingTeamId,team.id);assert.equal(f.data.teams.length,1);
 r=await f.handle(req({...duplicate,member1:'New Student'}),env);assert.equal(r.status,409);assert.equal(f.data.teams.length,1);
 r=await f.handle(req({...duplicate,member1:'New Student',member2:'New Student'}),env);assert.equal(r.status,400);
});
test('team identity edits preserve links submitted from another browser',async()=>{
 const f=fixture(),team={kind:'team',id:crypto.randomUUID(),editKey:crypto.randomUUID(),name:'Team',member1:'A',member2:'B',paperId:'base'};
 await f.handle(req(team),env);
 for(const [submissionType,submissionUrl] of [['proposal','https://youtu.be/test'],['project','https://example.com/project']])assert.equal((await f.handle(req({kind:'submission',id:team.id,submitter:'A',submissionType,submissionUrl},{method:'PATCH'}),env)).status,200);
 assert.equal((await f.handle(req({...team,name:'Updated'},{method:'PATCH'}),env)).status,200);
 assert.equal(f.data.teams[0].proposalUrl,'https://youtu.be/test');assert.equal(f.data.teams[0].url,'https://example.com/project');
});
