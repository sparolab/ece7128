'use strict';
const data=window.CATALOG, papers=data.papers, $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL=u=>{try{const p=new URL(u);return ['http:','https:'].includes(p.protocol)?p.href:null}catch{return null}};
let saved;try{saved=new Set(JSON.parse(localStorage.getItem('ece7128-saved-v1')||'[]'))}catch{saved=new Set()}
let topic='',interest='',page=1,pageSize=20,view='library',filtered=[];
const L=window.LibrarySearch;
function withMetadata(p){return {...(data.bibliography?.[p.id]||{}),...p,authors:p.authors?.length?p.authors:(data.bibliography?.[p.id]?.authors||[]),affiliations:p.affiliations?.length?p.affiliations:(data.bibliography?.[p.id]?.affiliations||[])}}
function bibliographicLine(p){return [L.list(p.authors).join(', '),L.list(p.affiliations).join(' · ')].filter(Boolean).map(x=>`<p class="paper-metadata">${esc(x)}</p>`).join('');}
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').style.display='none',2500)}
function save(id){saved.has(id)?saved.delete(id):saved.add(id);try{localStorage.setItem('ece7128-saved-v1',JSON.stringify([...saved]))}catch{toast('저장 공간을 사용할 수 없어 이 화면에서만 유지됩니다.')}render();}
function link(u,label){const url=safeURL(u);return url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:''}
function render(){
 const searchable=papers.map(withMetadata).filter(p=>view!=='saved'||saved.has(p.id));
 filtered=L.filter(searchable,{topic,interest,query:$('#search').value,venue:$('#venue').value,year:$('#year').value,author:$('#author-filter').value,affiliation:$('#affiliation-filter').value,keyword:$('#keyword-filter').value,sort:$('#sort').value});
 const batch=L.paginate(filtered,page,pageSize);page=batch.page;
 $('#results-count').textContent=`${filtered.length}편${view==='saved'?'의 관심 논문':''} · ${batch.start}–${batch.end}편 표시`;
 $('#page-number').innerHTML=Array.from({length:batch.pages},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');$('#page-number').value=page;$('#page-total').textContent=` / ${batch.pages}`;
 $('#previous-page').disabled=page<=1;$('#next-page').disabled=page>=batch.pages;$('#pagination').hidden=!filtered.length;
 const all=papers.map(withMetadata),ac=all.filter(p=>p.authors?.length).length,ic=all.filter(p=>p.affiliations?.length).length;
 $('#metadata-note').textContent=`저자 정보 ${ac}편 · 소속 정보 ${ic}편. 저자·소속 필터는 해당 정보가 등록된 논문에서 검색합니다.`;
 document.querySelectorAll('[data-interest]').forEach(b=>{b.classList.toggle('active',b.dataset.interest===interest);b.setAttribute('aria-pressed',String(b.dataset.interest===interest));});
 $('#saved-count').textContent=saved.size;
 $('#papers').innerHTML=filtered.length?batch.items.map(p=>`<article class="paper"><button class="star ${saved.has(p.id)?'saved':''}" data-save="${esc(p.id)}" aria-label="${esc(p.title)} 관심 논문 ${saved.has(p.id)?'해제':'저장'}" aria-pressed="${saved.has(p.id)}">${saved.has(p.id)?'★':'☆'}</button><div class="paper-top"><span class="venue-badge">${esc(p.venue)} ${p.year}</span></div><h3><button class="title-button" data-detail="${esc(p.id)}">${esc(p.title)}</button></h3>${bibliographicLine(p)}<p class="summary">${esc(p.summary||'')}</p><div class="paper-bottom"><div class="tags">${p.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><button class="detail-link" data-detail="${esc(p.id)}">논문 살펴보기 ↗</button></div></article>`).join(''):`<div class="empty"><h3>${view==='saved'?'저장된 논문이 없거나 필터와 일치하지 않습니다.':'조건에 맞는 논문이 없습니다.'}</h3><p>${view==='saved'?'논문의 별표를 눌러 팀원과 비교할 후보를 모아보세요.':'검색어나 주제를 바꾸거나 전체 목록에서 찾아보세요.'}</p></div>`;
 document.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>save(b.dataset.save));document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>detail(b.dataset.detail));
 document.querySelectorAll('[data-topic]').forEach(b=>{b.classList.toggle('active',b.dataset.topic===topic);b.setAttribute('aria-pressed',String(b.dataset.topic===topic))});
}
function detail(id){const raw=papers.find(p=>p.id===id);if(!raw)return;const p=withMetadata(raw);
 $('#paper-detail').innerHTML=`<p class="eyebrow">${esc(p.venue)} ${p.year}</p><h2 id="dialog-title">${esc(p.title)}</h2>${bibliographicLine(p)}<div class="tags">${p.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><p>${esc(p.summary||'')}</p>${p.core?`<div class="core-box"><h3>페이지에서 설명해 볼 핵심</h3><p>${esc(p.core)}</p></div>`:''}${(p.prerequisites||[]).length?`<h3>먼저 살펴볼 개념</h3><p>${p.prerequisites.map(esc).join(' · ')}</p>`:''}<div class="links">${link(p.paperUrl,'논문 원문')}${link(p.projectUrl,'저자 프로젝트')}${link(p.codeUrl,'공식 코드')}</div>${!p.paperUrl?`<div class="links">${(p.links||[]).map((u,i)=>link(u,'논문 링크 '+(i+1))).join('')||'<span class="muted">등록된 논문 링크가 없습니다.</span>'}</div>`:''}<div class="links"><a href="template.html?paper=${encodeURIComponent(p.id)}">학생 페이지 양식 ↗</a><button class="quiet" id="copy-paper">논문 정보 복사</button></div><div class="links"><button class="primary" id="choose-paper">이 논문으로 팀 등록 →</button></div>`;
 $('#choose-paper').onclick=()=>{$('#paper-dialog').close();location.hash='projects';window.selectTeamPaper(id);requestAnimationFrame(()=>document.querySelector('#team-form').scrollIntoView({behavior:'smooth',block:'start'}));};
 $('#copy-paper').onclick=async()=>{const t=[p.title,`${p.venue} ${p.year}`,p.paperUrl||'',p.core||''].join('\n');try{await navigator.clipboard.writeText(t);toast('논문 정보를 복사했습니다.')}catch{download('paper-info.txt',t,'text/plain');toast('논문 정보를 파일로 저장했습니다.')}};
 $('#paper-dialog').showModal();document.body.classList.add('dialog-open');
}
function download(name,content,type){const u=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),5000)}
function route(){const target=location.hash.slice(1)||'library';view=['library','saved','guide','projects','add'].includes(target)?target:'library';for(const n of ['library','guide','projects','add'])$('#'+n+'-view').hidden=n===(view==='saved'?'library':view)?false:true;document.querySelectorAll('[data-nav]').forEach(a=>{if(a.dataset.nav===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});$('#library-title').textContent=view==='saved'?'내가 모아둔 관심 논문':'논문 리스트';page=1;render();}
$('#topics').innerHTML=['',...data.topics].map(t=>`<button class="topic" data-topic="${esc(t)}" aria-pressed="false">${esc(t||'전체 주제')} <span>${papers.filter(p=>!t||p.tags.includes(t)).length}</span></button>`).join('');
document.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>{topic=b.dataset.topic;page=1;render()});
for(const v of [...new Set(papers.map(p=>p.venue))].sort()){const o=new Option(v,v);$('#venue').add(o)}
for(const y of [...new Set(papers.map(p=>p.year))].sort((a,b)=>b-a))$('#year').add(new Option(y,y));
$('#total-count').textContent=papers.length;
for(const id of ['search','venue','year','sort','author-filter','affiliation-filter','keyword-filter'])$('#'+id).addEventListener('input',()=>{page=1;render()});
$('#reset').onclick=()=>{topic='';interest='';for(const id of ['search','venue','year','author-filter','affiliation-filter','keyword-filter'])$('#'+id).value='';$('#sort').value='newest';page=1;render()};
$('#page-size').onchange=()=>{pageSize=Number($('#page-size').value);page=1;render()};
function movePage(n){page=n;render();$('#library-title').scrollIntoView({block:'start',behavior:'smooth'});}
$('#previous-page').onclick=()=>movePage(page-1);$('#next-page').onclick=()=>movePage(page+1);$('#page-number').onchange=()=>movePage(Number($('#page-number').value));
$('#interests').innerHTML=[{id:'',label:'전체'},...L.interests].map(i=>`<button class="interest-chip" data-interest="${i.id}" aria-pressed="false">${i.label}</button>`).join('');
document.querySelectorAll('[data-interest]').forEach(b=>b.onclick=()=>{interest=b.dataset.interest;page=1;render()});
$('#paper-dialog .close').onclick=()=>$('#paper-dialog').close();$('#paper-dialog').addEventListener('close',()=>document.body.classList.remove('dialog-open'));
$('#paper-dialog').addEventListener('click',e=>{if(e.target===$('#paper-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
$('#export-list').onclick=()=>{const csvcell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';const rows=[['ID','Title','Venue','Year','Authors','Affiliations','Keywords','Topics','Paper URL'],...filtered.map(p=>[p.id,p.title,p.venue,p.year,L.list(p.authors).join('; '),L.list(p.affiliations).join('; '),L.list(p.keywords).join('; '),p.tags.join('; '),p.paperUrl])];download('ece7128-papers.csv','\uFEFF'+rows.map(r=>r.map(csvcell).join(',')).join('\r\n'),'text/csv;charset=utf-8')};
window.addEventListener('hashchange',route);document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!$('#paper-dialog').open){e.preventDefault();location.hash='library';$('#search').focus()}});route();
