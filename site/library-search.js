(function(root){
 'use strict';
 const list=v=>Array.isArray(v)?v:typeof v==='string'?[v]:[];
 const normalize=v=>String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[‐‑–—]/g,'-');
 const contains=(text,query)=>normalize(query).trim().split(/[\s,;]+/).filter(Boolean).every(w=>normalize(text).includes(w));
 const interests=[
  {id:'motion',label:'SLAM / Odometry / Localization',topics:['SLAM','Odometry','Localization']},
  {id:'photos',label:'3D Reconstruction (SfM)',topics:['SfM']},
  {id:'rendering',label:'3D Representation & Rendering',topics:['Gaussian'],pattern:/nerf|radiance field/i},
  {id:'semantics',label:'Semantic Understanding',topics:['Semantic Mapping']},
  {id:'robots',label:'Multi-Robot Collaboration',pattern:/multi[- ](?:robot|agent)|collaborat|decentrali|여러.*(?:로봇|에이전트)/i},
  {id:'change',label:'Dynamic Environments',pattern:/dynamic|changing environment|lifelong|long[- ]term|동적|움직이는|장기/i}
 ];
 function fields(p){
  const keywords=[...list(p.tags),...list(p.keywords),...list(p.prerequisites)];
  return {authors:list(p.authors).join(' '),affiliations:list(p.affiliations).join(' '),keywords:[p.title,p.summary,p.core,...keywords].join(' '),all:[p.title,p.venue,p.year,p.summary,p.core,...keywords,...list(p.authors),...list(p.affiliations),...list(p.metadataAliases)].join(' ')};
 }
 function matchesInterest(p,id){
  const interest=interests.find(i=>i.id===id);if(!interest)return true;
  return (interest.topics||[]).some(t=>list(p.tags).includes(t))||!!interest.pattern?.test([p.title,p.summary,...list(p.keywords)].join(' '));
 }
 function filter(papers,f={}){
  return papers.filter(p=>{const x=fields(p);return (!f.topic||list(p.tags).includes(f.topic))&&(!f.venue||p.venue===f.venue)&&(!f.year||String(p.year)===String(f.year))&&matchesInterest(p,f.interest)&&contains(x.all,f.query)&&contains(x.authors,f.author)&&contains(x.affiliations,f.affiliation)&&contains(x.keywords,f.keyword);}).sort(f.sort==='title'?(a,b)=>a.title.localeCompare(b.title):(a,b)=>b.year-a.year||a.title.localeCompare(b.title));
 }
 function paginate(papers,page=1,size=20){
  size=[10,20,50,100].includes(Number(size))?Number(size):20;
  const pages=Math.max(1,Math.ceil(papers.length/size));page=Math.min(pages,Math.max(1,Math.floor(Number(page)||1)));
  const start=(page-1)*size;return {items:papers.slice(start,start+size),page,pages,total:papers.length,start:papers.length?start+1:0,end:Math.min(start+size,papers.length),size};
 }
 root.LibrarySearch={list,normalize,contains,interests,fields,matchesInterest,filter,paginate};
})(globalThis);
