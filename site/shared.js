'use strict';
let communityTeams=[],editingTeam=null,communityReady=false,paperRequestId=crypto.randomUUID(),teamRequestId=crypto.randomUUID();
const pf=$('#paper-form'),tf=$('#team-form');
const submissionForms={proposal:$('#proposal-form'),project:$('#project-form')};
const API=window.COURSE_CONFIG?.apiBase;
let editKeys={};try{editKeys=JSON.parse(localStorage.getItem('ece7128-team-keys')||'{}')}catch{}
let registrationReady=false;
function setRegistrationReady(ready){registrationReady=ready;for(const form of [pf,tf,...Object.values(submissionForms)]){form.querySelector('[type=submit]').disabled=!ready;form.querySelector('.form-status').textContent=ready?'':'등록 기능을 준비 중입니다. 논문 리스트는 이용할 수 있습니다.';}}
let newEditKey=crypto.randomUUID()+crypto.randomUUID();
function applyEditAccess(){communityTeams.forEach(t=>t.canEdit=!!editKeys[t.id]);}

$('#paper-topic').innerHTML=data.topics.map(t=>`<option>${esc(t)}</option>`).join('');
function rebuildOptions(){
 const v=$('#venue').value,y=$('#year').value;
 $('#venue').innerHTML='<option value="">전체 학회</option>'+[...new Set(papers.map(p=>p.venue))].sort().map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');$('#venue').value=v;
 $('#year').innerHTML='<option value="">전체 연도</option>'+[...new Set(papers.map(p=>p.year))].sort((a,b)=>b-a).map(x=>`<option>${x}</option>`).join('');$('#year').value=y;
 document.querySelectorAll('[data-topic]').forEach(b=>b.querySelector('span').textContent=papers.filter(p=>!b.dataset.topic||p.tags.includes(b.dataset.topic)).length);
 $('#total-count').textContent=papers.length;
 paperOptions();render();
}
function paperOptions(selected=$('#team-paper').value){
 const q=$('#team-paper-search').value.toLowerCase().trim();
 const visible=papers.filter(p=>p.id===selected||!q||`${p.title} ${p.venue} ${p.year}`.toLowerCase().includes(q)).sort((a,b)=>b.year-a.year||a.title.localeCompare(b.title));
 $('#team-paper').innerHTML='<option value="">논문을 선택하세요</option>'+visible.map(p=>`<option value="${esc(p.id)}">[${esc(p.venue)} ${p.year}] ${esc(p.title)}</option>`).join('');
 $('#team-paper').value=selected;showSelected();
}
function showSelected(){const p=papers.find(p=>p.id===$('#team-paper').value);$('#selected-paper').textContent=p?p.title:'';}
window.selectTeamPaper=id=>{$('#team-registration').open=true;$('#team-paper-search').value='';paperOptions(id);tf.scrollIntoView({behavior:'smooth',block:'start'});};
$('#team-paper-search').oninput=()=>paperOptions();$('#team-paper').onchange=showSelected;
function proposalDate(value){const date=new Date(value);return value&&!Number.isNaN(date.getTime())?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(date):'';}
function hasLegacyVideo(t){try{return ['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(new URL(t.url).hostname.toLowerCase());}catch{return false;}}
function renderTeams(){
 $('#team-count').textContent=communityTeams.length;
 $('#proposal-count').textContent=`전체 ${communityTeams.length}팀 · Proposal 링크 등록 ${communityTeams.filter(t=>t.proposalUrl).length}팀 · 영상 미등록 ${communityTeams.filter(t=>!t.proposalUrl&&!hasLegacyVideo(t)).length}팀`;
 $('#team-projects').innerHTML=communityTeams.length?communityTeams.map(t=>`<article class="paper"><div class="paper-top"><span class="venue-badge">${esc(t.name)}</span><span class="origin">${t.members.map(esc).join(' · ')}</span></div><h3>${esc(t.paperTitle)}</h3><p class="proposal-status ${t.proposalUrl?'submitted':'pending'}">${t.proposalUrl?'Proposal 제출됨':hasLegacyVideo(t)?'영상 링크 등록됨':'Proposal 미제출'}${t.proposalUpdatedAt?`<span>최근 등록·수정 ${esc(proposalDate(t.proposalUpdatedAt))}</span>`:''}</p><div class="team-actions">${link(t.proposalUrl,'Proposal 영상 보기')}${link(t.url,hasLegacyVideo(t)?'기존 영상 보기':'팀 프로젝트 페이지')}<a href="template.html?paper=${encodeURIComponent(t.paperId)}">학생 페이지 양식 ↗</a><button class="quiet" data-submit-proposal="${esc(t.id)}">${t.proposalUrl?'Proposal 수정':'Proposal 제출'}</button><button class="quiet" data-submit-project="${esc(t.id)}">프로젝트 페이지 제출</button>${t.canEdit?`<button class="quiet" data-edit="${esc(t.id)}">팀 정보 수정</button>`:''}</div></article>`).join(''):'<div class="empty"><h3>아직 등록된 팀이 없습니다.</h3><p>팀원과 발표 논문을 정하고 첫 팀을 등록해 보세요.</p></div>';
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{const t=communityTeams.find(t=>t.id===b.dataset.edit);editingTeam=t.id;tf.elements.name.value=t.name;tf.elements.member1.value=t.members[0];tf.elements.member2.value=t.members[1];window.selectTeamPaper(t.paperId);tf.querySelector('[type=submit]').textContent='변경 내용 저장 →';$('#cancel-edit').hidden=false;tf.querySelector('.form-status').textContent='';});
 document.querySelectorAll('[data-submit-proposal]').forEach(b=>b.onclick=()=>openSubmission(b.dataset.submitProposal,'proposal'));
 document.querySelectorAll('[data-submit-project]').forEach(b=>b.onclick=()=>openSubmission(b.dataset.submitProject,'project'));
 renderSubmissionViews();
}
function resetTeam(){editingTeam=null;teamRequestId=crypto.randomUUID();newEditKey=crypto.randomUUID()+crypto.randomUUID();tf.reset();paperOptions();tf.querySelector('[type=submit]').textContent='팀 등록하기 →';$('#cancel-edit').hidden=true;}
$('#cancel-edit').onclick=resetTeam;
async function refreshCommunity(){
 const button=$('#refresh-teams');button.disabled=true;
 let d,live=false;
 try {
  if(API){try{const r=await fetch(API+'/api/course-registry',{cache:'no-store'});if(r.ok){d=await r.json();live=true;}}catch{}}
  if(!d){const r=await fetch('community.json',{cache:'no-store'});if(!r.ok)throw new Error();d=await r.json();}
  for(const p of d.papers){const i=papers.findIndex(x=>x.id===p.id);if(i<0)papers.push(p);else papers[i]=p;}
  communityTeams=d.teams;applyEditAccess();communityReady=true;rebuildOptions();renderTeams();setRegistrationReady(live);
  document.querySelectorAll('.shared-error').forEach(n=>n.remove());
  if(!live)$('#team-projects').insertAdjacentHTML('afterbegin','<p class="shared-error" role="status">마지막으로 반영된 목록입니다. 등록 기능은 준비 중입니다.</p>');
 }catch{communityReady=false;setRegistrationReady(false);$('#team-projects').innerHTML='<div class="empty"><h3>팀 현황을 불러오지 못했습니다.</h3><p>새로고침을 눌러 다시 시도해 주세요.</p></div>';}
 finally{button.disabled=false;}
}
$('#refresh-teams').onclick=refreshCommunity;
async function submitForm(form,kind){
 const status=form.querySelector('.form-status'),button=form.querySelector('[type=submit]');if(button.disabled)return;
 const editing=kind==='team'&&editingTeam;
 const body=Object.fromEntries(new FormData(form));body.kind=kind;body.id=editing||(kind==='paper'?paperRequestId:teamRequestId);
 if(!API||!registrationReady){status.textContent='등록 기능은 서버 연결 후 사용할 수 있습니다. 아직 저장되지 않았습니다.';return;}
 if(kind==='team'){body.editKey=editing?editKeys[editingTeam]:newEditKey;}
 button.disabled=true;status.textContent='저장 중입니다…';
 try{const r=await fetch(API+'/api/course-registry',{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});let d;try{d=await r.json()}catch{throw new Error('서버 응답을 받지 못했습니다. 다시 시도해 주세요.')}
 if(!r.ok){status.textContent=d.error||'저장하지 못했습니다.';if(d.signIn)status.insertAdjacentHTML('beforeend',` <a class="textlink" href="/signin-with-chatgpt?return_to=${encodeURIComponent('/#'+(kind==='paper'?'add':'projects'))}" target="_top">로그인 →</a>`);return;}
 if(kind==='paper'){if(!papers.some(p=>p.id===d.paper.id))papers.push(d.paper);form.reset();paperRequestId=crypto.randomUUID();rebuildOptions();status.innerHTML=(d.existing?'이미 등록된 논문입니다. ':'논문을 등록했습니다. ')+ '<a href="#library" class="textlink">논문 리스트 보기 →</a>';}
 else{editKeys[d.team.id]=body.editKey;try{localStorage.setItem('ece7128-team-keys',JSON.stringify(editKeys))}catch{}d.team.canEdit=true;const i=communityTeams.findIndex(t=>t.id===d.team.id);if(i<0)communityTeams.push(d.team);else communityTeams[i]=d.team;resetTeam();renderTeams();status.textContent=editing?'팀 정보를 수정했습니다.':'팀을 등록했습니다. 아래 팀 현황에서 확인하세요.';}
 }catch(e){status.textContent=e.message||'연결을 확인한 뒤 다시 시도해 주세요. 입력 내용은 유지됩니다.';}finally{button.disabled=false;}
}

function renderSubmissionViews(){
 for(const [kind,form] of Object.entries(submissionForms)){
  const selected=form.elements.teamId.value;
  form.elements.teamId.innerHTML='<option value="">팀을 선택하세요</option>'+communityTeams.map(t=>`<option value="${esc(t.id)}">${esc(t.name)} — ${t.members.map(esc).join(' · ')}</option>`).join('');
  form.elements.teamId.value=selected;
  const submitted=communityTeams.filter(t=>kind==='proposal'?t.proposalUrl:t.url&&!hasLegacyVideo(t));
  $('#'+kind+'-summary').textContent=`전체 ${communityTeams.length}팀 중 ${submitted.length}팀 제출`;
  const visible=kind==='proposal'?communityTeams:submitted;
  $('#'+kind+'-submissions').innerHTML=visible.length?visible.map(t=>`<article class="paper"><div class="paper-top"><span class="venue-badge">${esc(t.name)}</span><span class="origin">${t.members.map(esc).join(' · ')}</span></div><h3>${esc(t.paperTitle)}</h3><p class="proposal-status">${kind==='proposal'?(t.proposalUrl?'Proposal 제출 완료':'Proposal 미제출'):'프로젝트 페이지 제출 완료'}</p><div class="team-actions">${link(kind==='proposal'?t.proposalUrl:t.url,kind==='proposal'?'Proposal 영상 보기':'프로젝트 페이지 열기')}<button class="quiet" data-submission-kind="${kind}" data-submission-team="${esc(t.id)}">${kind==='proposal'?'영상 링크 제출·수정':'페이지 링크 수정'}</button></div></article>`).join(''):'<p class="empty">아직 제출된 프로젝트 페이지가 없습니다. 최종 제출은 15주차 종료 시점까지입니다.</p>';
 }
 document.querySelectorAll('[data-submission-team]').forEach(b=>b.onclick=()=>openSubmission(b.dataset.submissionTeam,b.dataset.submissionKind));
}
function selectSubmissionTeam(kind){
 const form=submissionForms[kind],team=communityTeams.find(t=>t.id===form.elements.teamId.value);
 $('#'+kind+'-team-info').textContent=team?`${team.members.join(' · ')} / ${team.paperTitle}`:'';
 form.elements.submissionUrl.value=team?(kind==='proposal'?(team.proposalUrl||(hasLegacyVideo(team)?team.url:'')):(hasLegacyVideo(team)?'':team.url||'')):'';
 form.elements.submitter.value='';form.elements.confirmTeam.checked=false;form.querySelector('.form-status').textContent='';
}
function openSubmission(id,kind){
 const form=submissionForms[kind];form.elements.teamId.value=id;selectSubmissionTeam(kind);
 location.hash=kind==='proposal'?'proposal':'project-submit';
 requestAnimationFrame(()=>form.scrollIntoView({behavior:'smooth',block:'start'}));
}
for(const [kind,form] of Object.entries(submissionForms)){
 form.elements.teamId.onchange=()=>selectSubmissionTeam(kind);
 form.onsubmit=async e=>{
  e.preventDefault();const button=form.querySelector('[type=submit]'),status=form.querySelector('.form-status');if(button.disabled||!registrationReady)return;
  const team=communityTeams.find(t=>t.id===form.elements.teamId.value);if(!team){status.textContent='팀을 선택해 주세요.';return;}
  const normalize=s=>s.normalize('NFKC').replace(/\s+/g,'').toLowerCase();
  const submitter=form.elements.submitter.value.trim();
  if(!team.members.some(n=>normalize(n)===normalize(submitter)&&normalize(n)!=='vacancy')){status.textContent='선택한 팀에 등록된 본인 이름을 입력해 주세요.';return;}
  const body={kind:'submission',id:team.id,submissionType:kind,submitter,submissionUrl:form.elements.submissionUrl.value};
  button.disabled=true;status.textContent='저장 중입니다…';
  try{
   const response=await fetch(API+'/api/course-registry',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'저장하지 못했습니다.');
   communityTeams[communityTeams.findIndex(t=>t.id===team.id)]=result.team;applyEditAccess();renderTeams();
   status.textContent=kind==='proposal'?'Proposal 영상 링크를 제출했습니다. 아래 제출 현황에서 확인하세요.':'프로젝트 페이지 링크를 제출했습니다. 아래에서 제출된 페이지를 열어볼 수 있습니다.';
  }catch(error){status.textContent=error.message||'저장하지 못했습니다. 다시 시도해 주세요.';}finally{button.disabled=!registrationReady;}
 };
}
document.querySelectorAll('[data-refresh-submissions]').forEach(b=>b.onclick=refreshCommunity);

pf.onsubmit=e=>{e.preventDefault();submitForm(pf,'paper')};tf.onsubmit=e=>{e.preventDefault();submitForm(tf,'team')};
setRegistrationReady(false);rebuildOptions();refreshCommunity();
if(!API){for(const form of [pf,tf,...Object.values(submissionForms)]){form.querySelector('[type=submit]').disabled=true;form.querySelector('.form-status').textContent='등록 기능은 서버 연결 후 열립니다.';}}
