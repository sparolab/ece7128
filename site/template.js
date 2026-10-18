(async()=>{
'use strict';
const selectedId=new URLSearchParams(location.search).get('paper');
let paper=window.CATALOG.papers.find(p=>p.id===selectedId);
if(selectedId&&!paper){try{const response=await fetch(window.COURSE_CONFIG?.apiBase?window.COURSE_CONFIG.apiBase+'/api/course-registry':'community.json');if(!response.ok)throw new Error();const shared=await response.json();paper=shared.papers.find(p=>p.id===selectedId);if(!paper)throw new Error();}catch{document.querySelector('#editor').insertAdjacentHTML('beforebegin','<p role="status">선택한 논문을 불러오지 못했습니다. 제목과 출처를 직접 입력하거나 새로고침해 주세요.</p>');}}
const key='ece7128-draft-v1-'+(paper?.id||'blank');
const sections=[
 ['title','논문 제목','발표할 논문의 정식 제목을 적으세요.','input'],
 ['team','팀원 2명','팀명과 두 팀원의 이름을 적으세요.','input'],
 ['citation','논문·코드·프로젝트 링크','저자, 학회·연도, 원문 URL을 기록하세요. 그림과 코드를 가져온 곳도 함께 남기세요.'],
 ['one','이 논문을 한 문장으로','어떤 조건에서 어떤 문제를 어떤 아이디어로 해결하나요?'],
 ['problem','1. 문제와 가정','입력과 출력을 먼저 정의하세요. 센서 종류, 카메라 보정, 장면의 정적·동적 가정을 명시하세요.'],
 ['core','2. 핵심 방법','핵심 수식·알고리즘의 입력, 중간 계산, 출력을 설명하세요. 기호를 먼저 정의하고 원문의 절·식 번호를 적으세요.'],
 ['example','3. 직접 따라가는 예제','작은 수치 예나 도식으로 핵심 계산을 보여주세요. 직접 만든 예제와 논문의 실험 결과를 구분하세요.'],
 ['evidence','4. 주장과 실험 근거','핵심 주장 → 이를 뒷받침하는 Fig./Table → dataset·metric·비교 조건을 연결하세요.'],
 ['audit','5. 검토와 한계','소규모 재현 또는 figure audit의 과정과 결과를 기록하세요. 직접 확인한 사실과 추론을 구분하고 실패 조건과 후속 질문을 쓰세요.'],
 ['question','6. 동료가 생각해 볼 문제','입력이나 가정을 바꾸어 결과를 예상하게 하세요. 답 또는 판단 기준과 근거를 함께 작성하세요.'],
 ['contribution','7. 팀원별 기여와 수정 기록','각 팀원이 담당한 분석·그림·콘텐츠 제작을 적고, 발표 피드백에 따라 무엇을 바꾸었는지 남기세요.']
];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let values={title:paper?.title||'',citation:paper?[`${paper.venue} ${paper.year}`,paper.paperUrl||'',paper.codeUrl||'',paper.projectUrl||''].filter(Boolean).join('\n'):''};
try{values={...values,...JSON.parse(localStorage.getItem(key)||'{}')}}catch{}
document.querySelector('#editor').innerHTML=sections.map(([id,label,hint,type])=>`<div class="${type==='input'?'':'full'}"><label for="${id}">${label}</label><p id="${id}-hint" class="hint">${esc(hint)}${id==='core'&&paper?.core?'<br>이 논문의 설명 초점: '+esc(paper.core):''}</p>${type==='input'?`<input id="${id}" aria-describedby="${id}-hint" value="${esc(values[id]||'')}" autocomplete="off">`:`<textarea id="${id}" aria-describedby="${id}-hint" placeholder="${esc(hint)}">${esc(values[id]||'')}</textarea>`}</div>`).join('');
function collect(){for(const [id]of sections)values[id]=document.getElementById(id).value;return values}
function save(){collect();try{localStorage.setItem(key,JSON.stringify(values));document.querySelector('#save-status').textContent='이 브라우저에 저장됨'}catch{document.querySelector('#save-status').textContent='자동 저장 불가 · 파일을 내려받으세요'}}
document.querySelector('#editor').addEventListener('input',save);
function body(){collect();return `<p class="eyebrow">ECE7128 · STUDENT PROJECT</p><h1>${esc(values.title||'논문 제목')}</h1><p>${esc(values.team||'팀원 정보 미작성')}</p>`+sections.filter(([id])=>!['title','team'].includes(id)).map(([id,label])=>`<section class="preview-section"><h2>${esc(label)}</h2><p>${esc(values[id]||'아직 작성하지 않았습니다.')}</p></section>`).join('')}
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
document.querySelector('#preview-button').onclick=()=>{const el=document.querySelector('#preview-article');el.innerHTML=body();el.hidden=!el.hidden;if(!el.hidden)el.scrollIntoView({behavior:'smooth',block:'start'})};
document.querySelector('#html-button').onclick=()=>{save();download((paper?.id||'team')+'-project.html',`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(values.title||'공간지능특론 팀 프로젝트')}</title><style>body{max-width:900px;margin:60px auto;padding:0 24px;background:#faf9f5;color:#172d37;font-family:system-ui,sans-serif;line-height:1.85}h1{font-size:34px;line-height:1.4}h2{font-size:21px}.eyebrow{font-size:12px;letter-spacing:.1em;color:#a84a2c}.preview-section{border-top:1px solid #dfe4e2;padding:20px 0}p{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#356a5c}@media(max-width:600px){body{margin:28px auto}h1{font-size:26px}}</style></head><body>${body()}</body></html>`,'text/html;charset=utf-8')};
document.querySelector('#md-button').onclick=()=>{save();download((paper?.id||'team')+'-project.md','# '+(values.title||'논문 제목')+'\n\n'+(values.team||'팀원 정보 미작성')+'\n\n'+sections.filter(([id])=>!['title','team'].includes(id)).map(([id,label])=>'## '+label+'\n\n'+(values[id]||'아직 작성하지 않았습니다.')).join('\n\n'),'text/markdown;charset=utf-8')};

})();
