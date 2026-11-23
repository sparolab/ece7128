// Fixed repository and path: browser requests cannot select another destination.
const REPOSITORY = 'sparolab/ece7128';
const FILE = 'data/submissions.json';
const ORIGIN = 'https://sparolab.github.io';
const encoder = new TextEncoder();
const key = s => s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
const memberKey=s=>key(s).replace(/\s+/g,'');
const isMember=s=>!['','vacancy','미정','없음','tbd'].includes(memberKey(s));
const publicTeam=({editHash,submissionHistory,...team})=>team;
const encode = s => btoa(Array.from(encoder.encode(s), b => String.fromCharCode(b)).join(''));
const decode = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
async function hash(s) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s))),b=>b.toString(16).padStart(2,'0')).join(''); }
function text(value,max,required=true) {
 if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))throw new Error('입력 항목과 길이를 확인해 주세요.');
 return value.trim();
}
function entries(value,maxItems,maxLength,separator){
 if(value==null||value==='')return [];
 const values=Array.isArray(value)?value:text(value,maxLength,false).split(separator);
 if(values.length>maxItems)throw new Error('입력 항목과 길이를 확인해 주세요.');
 const result=[...new Set(values.map(v=>text(v,300,false)).filter(Boolean))];
 if(result.join('; ').length>maxLength)throw new Error('입력 항목과 길이를 확인해 주세요.');
 return result;
}
function url(value,required=false){
 const s=text(value??'',2000,required);if(!s)return '';
 try{const u=new URL(s);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw new Error();return u.href;}catch{throw new Error('http 또는 https 링크를 입력해 주세요.');}
}
function publicData(data){return {capabilities:{proposalSubmissions:true,separateSubmissions:true},papers:data.papers,teams:data.teams.map(publicTeam)};}
export function createHandler({catalog,fetcher=fetch,allowedOrigin=ORIGIN}){
 return async function handle(request,env){
  const origin=request.headers.get('Origin');
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
  if(origin===allowedOrigin){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='Content-Type';headers['Access-Control-Allow-Methods']='GET, POST, PATCH, OPTIONS';}
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(request.method==='OPTIONS')return new Response(null,{status:origin===allowedOrigin?204:403,headers});
  if(!['GET','POST','PATCH'].includes(request.method))return reply({error:'지원하지 않는 요청입니다.'},405);
  if(!env.GITHUB_CONTENTS_TOKEN)return reply({error:'등록 기능을 준비 중입니다. 아직 저장되지 않았습니다.'},503);
  const ghHeaders={'Authorization':`Bearer ${env.GITHUB_CONTENTS_TOKEN}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','User-Agent':'ECE7128-Course-Registry'};
  const endpoint=`https://api.github.com/repos/${REPOSITORY}/contents/${FILE}`;
  async function read(){
   const r=await fetcher(endpoint+'?ref=main',{headers:ghHeaders,redirect:'manual'});
   if(!r.ok){console.error('registry-read-status',r.status);throw new Error('저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');}
   const file=await r.json();const data=JSON.parse(decode(file.content));
   if(data.version!==1||!Array.isArray(data.papers)||!Array.isArray(data.teams))throw new Error('저장된 목록 형식을 확인해야 합니다.');
   return {sha:file.sha,data};
  }
  try{
   if(request.method==='GET')return reply(publicData((await read()).data));
   if(origin!==allowedOrigin)return reply({error:'수업 페이지에서 등록해 주세요.'},403);
   if(!request.headers.get('Content-Type')?.includes('application/json'))return reply({error:'잘못된 입력 형식입니다.'},415);
   const raw=await request.text();if(encoder.encode(raw).length>16000)return reply({error:'입력 내용이 너무 깁니다.'},413);
   let b;try{b=JSON.parse(raw);}catch{return reply({error:'입력 내용을 읽을 수 없습니다.'},400);}
   if(!b||typeof b!=='object'||Array.isArray(b))return reply({error:'잘못된 입력 형식입니다.'},400);
   let paper,team,editHash,submission;
   if(b.kind==='paper'&&request.method==='POST'){
    const title=text(b.title,500),venue=text(b.venue,100),year=Number(b.year),topic=text(b.topic,100);
    if(!Number.isInteger(year)||year<1900||year>2100||!catalog.topics.includes(topic))return reply({error:'발표 연도와 연구 주제를 확인해 주세요.'},400);
    const authors=entries(b.authors,100,3000,/[,;\n]+/),affiliations=entries(b.affiliations,40,3000,/[;\n]+/),keywords=entries(b.keywords,40,1000,/[,;\n]+/);
    paper={authors,affiliations,keywords,id:'student-'+(await hash(key(title))).slice(0,24),title,venue,year,topic,tags:[topic],prerequisites:[],links:[],paperUrl:url(b.paperUrl,true),projectUrl:url(b.projectUrl),codeUrl:url(b.codeUrl),summary:text(b.summary??'',2000,false),createdAt:new Date().toISOString()};
   }else if(b.kind==='submission'&&request.method==='PATCH'){
    if(!['proposal','project'].includes(b.submissionType))return reply({error:'제출 항목을 확인해 주세요.'},400);
    submission={id:text(b.id,80),type:b.submissionType,submitter:text(b.submitter,80),url:url(b.submissionUrl,true)};
   }else if(b.kind==='team'){
    const id=text(b.id,80),editKey=text(b.editKey,128);
    if(!/^[a-z0-9-]{20,80}$/i.test(id)||!/^[-a-z0-9]{32,128}$/i.test(editKey))return reply({error:'팀 수정 키를 확인해 주세요.'},400);
    editHash=await hash(editKey);
    team={id,name:text(b.name,80),members:[text(b.member1,80),text(b.member2,80)],paperId:text(b.paperId,100),editHash};
    if(Object.hasOwn(b,'url'))team.url=url(b.url);
    if(Object.hasOwn(b,'proposalUrl'))team.proposalUrl=url(b.proposalUrl);
   }else return reply({error:'지원하지 않는 요청입니다.'},400);
   const requestedTeam=team;
   for(let attempt=0;attempt<4;attempt++){
    const {sha,data}=await read();let result;
    if(paper){
     const duplicate=[...catalog.papers,...data.papers].find(p=>key(p.title)===key(paper.title));
     if(duplicate)return reply({paper:duplicate,existing:true});
     if(data.papers.filter(p=>p.createdAt?.slice(0,10)===paper.createdAt.slice(0,10)).length>=500)return reply({error:'오늘 등록 가능한 수를 초과했습니다. 담당자에게 알려 주세요.'},429);
     data.papers.push(paper);result={paper};
    }else if(submission){
     const i=data.teams.findIndex(t=>t.id===submission.id);
     if(i<0)return reply({error:'팀을 찾을 수 없습니다. 목록을 새로고침해 주세요.'},404);
     const current=data.teams[i];
     if(!current.members.some(n=>isMember(n)&&memberKey(n)===memberKey(submission.submitter)))return reply({error:'선택한 팀에 등록된 본인 이름을 입력해 주세요.'},400);
     const field=submission.type==='proposal'?'proposalUrl':'url',now=new Date().toISOString();
     if(current[field]===submission.url)return reply({team:publicTeam(current),existing:true});
     const history=[...(current.submissionHistory||[]),{type:submission.type,previousUrl:current[field]||'',url:submission.url,submitter:submission.submitter,at:now}];
     const updated={...current,[field]:submission.url,submissionHistory:history};
     if(submission.type==='proposal'){
      updated.proposalSubmittedAt=current.proposalSubmittedAt||(current.proposalUrl?null:now);
      updated.proposalUpdatedAt=now;
     }else{updated.projectSubmittedAt=current.projectSubmittedAt||now;updated.projectUpdatedAt=now;}
     data.teams[i]=updated;result={team:publicTeam(updated)};
    }else{
     team={...requestedTeam};
     const selected=[...catalog.papers,...data.papers].find(p=>p.id===team.paperId);
     if(!selected)return reply({error:'리스트에서 논문을 선택해 주세요.'},400);
     const i=data.teams.findIndex(t=>t.id===team.id);
     if(i>=0&&data.teams[i].editHash!==editHash)return reply({error:'이 팀의 수정 키가 필요합니다.'},403);
     if(request.method==='PATCH'&&i<0)return reply({error:'팀을 찾을 수 없습니다.'},404);
     if(request.method==='POST'&&i>=0){return reply({team:publicTeam(data.teams[i]),existing:true});}
     const realMembers=team.members.filter(isMember).map(memberKey);
     if(new Set(realMembers).size!==realMembers.length)return reply({error:'동일한 학생을 두 번 입력할 수 없습니다.'},400);
     const overlap=data.teams.find(t=>t.id!==team.id&&t.members.some(n=>isMember(n)&&realMembers.includes(memberKey(n))));
     if(overlap)return reply({error:'이미 팀에 등록된 학생이 있습니다. 기존 팀을 선택해 제출하세요. 팀원·논문 변경은 담당 교수에게 알려 주세요.',existingTeamId:overlap.id},409);
     const previous=i>=0?data.teams[i]:null;
     const proposalUrl=team.proposalUrl??previous?.proposalUrl??'';
     const now=new Date().toISOString();
     team={...previous,...team,url:team.url??previous?.url??'',proposalUrl,paperTitle:selected.title,createdAt:previous?.createdAt||now};
     if(proposalUrl!==(previous?.proposalUrl||'')){
      team.proposalSubmittedAt=proposalUrl?(previous?.proposalSubmittedAt||now):null;
      team.proposalUpdatedAt=proposalUrl?now:null;
     }
     if(i<0)data.teams.push(team);else data.teams[i]=team;
     result={team:publicTeam(team)};
    }
    const content=JSON.stringify(data,null,2)+'\n';
    if(encoder.encode(content).length>900000)return reply({error:'목록 저장 공간을 정리해야 합니다. 담당자에게 알려 주세요.'},507);
    const r=await fetcher(endpoint,{method:'PUT',headers:{...ghHeaders,'Content-Type':'application/json'},redirect:'manual',body:JSON.stringify({message:paper?'Update course paper list':submission?`Update course ${submission.type} submission`:'Update course team list',content:encode(content),sha,branch:'main'})});
    if(r.status===409)continue;
    if(!r.ok)return reply({error:'저장하지 못했습니다. 입력 내용을 유지한 채 다시 시도해 주세요.'},503);
    return reply(result,request.method==='POST'?201:200);
   }
   return reply({error:'다른 등록과 겹쳤습니다. 잠시 후 다시 시도해 주세요.'},409);
  }catch(e){
   const m=e instanceof Error?e.message:'';
   console.error('registry-error',m.replace(/github_pat_[A-Za-z0-9_]+/g,'[redacted]').slice(0,300));
   const validation=m.startsWith('입력 항목')||m.startsWith('http 또는');
   return reply({error:validation?m:'목록에 연결하지 못했습니다. 입력 내용은 저장되지 않았습니다.'},validation?400:503);
  }
 };
}
