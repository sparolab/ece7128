'use strict';
let communityTeams=[],editingTeam=null,communityReady=false,paperRequestId=crypto.randomUUID(),teamRequestId=crypto.randomUUID();
const pf=$('#paper-form'),tf=$('#team-form');
const API=window.COURSE_CONFIG?.apiBase;
let editKeys={};try{editKeys=JSON.parse(localStorage.getItem('ece7128-team-keys')||'{}')}catch{}
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
window.selectTeamPaper=id=>{$('#team-paper-search').value='';paperOptions(id);tf.scrollIntoView({behavior:'smooth',block:'start'});};
$('#team-paper-search').oninput=()=>paperOptions();$('#team-paper').onchange=showSelected;
function renderTeams(){
 $('#team-count').textContent=communityTeams.length;
 $('#team-projects').innerHTML=communityTeams.length?communityTeams.map(t=>`<article class="paper"><div class="paper-top"><span class="venue-badge">${esc(t.name)}</span><span class="origin">${t.members.map(esc).join(' · ')}</span></div><h3>${esc(t.paperTitle)}</h3><div class="team-actions">${link(t.url,'팀 프로젝트 페이지')}<a href="template.html?paper=${encodeURIComponent(t.paperId)}">학생 페이지 양식 ↗</a>${t.canEdit?`<button class="quiet" data-edit="${esc(t.id)}">팀 정보 수정</button>`:''}</div></article>`).join(''):'<div class="empty"><h3>아직 등록된 팀이 없습니다.</h3><p>팀원과 발표 논문을 정하고 첫 팀을 등록해 보세요.</p></div>';
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{const t=communityTeams.find(t=>t.id===b.dataset.edit);editingTeam=t.id;tf.elements.name.value=t.name;tf.elements.member1.value=t.members[0];tf.elements.member2.value=t.members[1];tf.elements.url.value=t.url;window.selectTeamPaper(t.paperId);tf.querySelector('[type=submit]').textContent='변경 내용 저장 →';$('#cancel-edit').hidden=false;tf.querySelector('.form-status').textContent='';});
}
function resetTeam(){editingTeam=null;teamRequestId=crypto.randomUUID();newEditKey=crypto.randomUUID()+crypto.randomUUID();tf.reset();paperOptions();tf.querySelector('[type=submit]').textContent='팀 등록하기 →';$('#cancel-edit').hidden=true;}
$('#cancel-edit').onclick=resetTeam;
async function refreshCommunity(){
 const button=$('#refresh-teams');button.disabled=true;
 try {const r=await fetch(API?API+'/api/course-registry':'community.json',{cache:'no-store'});if(!r.ok)throw new Error();const d=await r.json();
 for(const p of d.papers){const i=papers.findIndex(x=>x.id===p.id);if(i<0)papers.push(p);else papers[i]=p;}
 communityTeams=d.teams;applyEditAccess();communityReady=true;rebuildOptions();renderTeams();
 document.querySelectorAll('.shared-error').forEach(n=>n.remove());
 }catch{communityReady=false;$('#team-projects').innerHTML='<div class="empty"><h3>팀 현황을 불러오지 못했습니다.</h3><p>새로고침을 눌러 다시 시도해 주세요.</p></div>';if(!$('.shared-error'))$('#library-view').insertAdjacentHTML('afterbegin','<p class="shared-error" role="status">기본 논문 리스트를 표시하고 있습니다. 학생들이 추가한 목록을 불러오려면 <button class="quiet" id="retry-community">다시 시도</button>해 주세요.</p>');$('#retry-community').onclick=refreshCommunity;
 }finally{button.disabled=false;}
}
$('#refresh-teams').onclick=refreshCommunity;
async function submitForm(form,kind){
 const status=form.querySelector('.form-status'),button=form.querySelector('[type=submit]');if(button.disabled)return;
 const editing=kind==='team'&&editingTeam;
 const body=Object.fromEntries(new FormData(form));body.kind=kind;body.id=editing||(kind==='paper'?paperRequestId:teamRequestId);
 if(!API){status.textContent='등록 기능은 서버 연결 후 사용할 수 있습니다. 아직 저장되지 않았습니다.';return;}
 const courseCode=String(body.courseCode||'');delete body.courseCode;
 if(kind==='team')body.editKey=editing?editKeys[editingTeam]:newEditKey;
 button.disabled=true;status.textContent='저장 중입니다…';
 try{const r=await fetch(API+'/api/course-registry',{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json','X-Course-Code':courseCode},body:JSON.stringify(body)});let d;try{d=await r.json()}catch{throw new Error('서버 응답을 받지 못했습니다. 다시 시도해 주세요.')}
 if(!r.ok){status.textContent=d.error||'저장하지 못했습니다.';if(d.signIn)status.insertAdjacentHTML('beforeend',` <a class="textlink" href="/signin-with-chatgpt?return_to=${encodeURIComponent('/#'+(kind==='paper'?'add':'projects'))}" target="_top">로그인 →</a>`);return;}
 if(kind==='paper'){if(!papers.some(p=>p.id===d.paper.id))papers.push(d.paper);form.reset();paperRequestId=crypto.randomUUID();rebuildOptions();status.innerHTML=(d.existing?'이미 등록된 논문입니다. ':'논문을 등록했습니다. ')+ '<a href="#library" class="textlink">논문 리스트 보기 →</a>';}
 else{editKeys[d.team.id]=body.editKey;try{localStorage.setItem('ece7128-team-keys',JSON.stringify(editKeys))}catch{}d.team.canEdit=true;const i=communityTeams.findIndex(t=>t.id===d.team.id);if(i<0)communityTeams.push(d.team);else communityTeams[i]=d.team;resetTeam();renderTeams();status.textContent=editing?'팀 정보를 수정했습니다.':'팀을 등록했습니다. 아래 팀 현황에서 확인하세요.';}
 }catch(e){status.textContent=e.message||'연결을 확인한 뒤 다시 시도해 주세요. 입력 내용은 유지됩니다.';}finally{button.disabled=false;}
}
pf.onsubmit=e=>{e.preventDefault();submitForm(pf,'paper')};tf.onsubmit=e=>{e.preventDefault();submitForm(tf,'team')};
rebuildOptions();refreshCommunity();
if(!API){for(const form of [pf,tf]){form.querySelector('[type=submit]').disabled=true;form.querySelector('.form-status').textContent='등록 기능은 서버 연결 후 열립니다.';}}
