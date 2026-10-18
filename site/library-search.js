(function(root){
 'use strict';
 const list=v=>Array.isArray(v)?v:typeof v==='string'?[v]:[];
 const normalize=v=>String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[‐‑–—]/g,'-');
 const contains=(text,query)=>normalize(query).trim().split(/[\s,;]+/).filter(Boolean).every(w=>normalize(text).includes(w));
 const interests=[
  {id:'motion',label:'SLAM / Odometry / Localization',description:'로봇이나 카메라의 위치와 움직임을 추정하는 연구입니다. 사용하는 센서나 위치 추정 문제를 골라 보세요.',topics:['SLAM','Odometry','Localization'],keywords:[
   {id:'visual',label:'Visual / Visual-Inertial',pattern:/visual|camera|monocular|stereo|VIO|VINS/i},
   {id:'lidar',label:'LiDAR',pattern:/lidar|laser/i},
   {id:'radar',label:'Radar',pattern:/radar|millimeter/i},
   {id:'place',label:'Place Recognition / Loop Closure',pattern:/place recognition|loop clos|loop detect|relocali|re-locali/i},
   {id:'fusion',label:'Sensor Fusion',pattern:/fusion|multi[- ]sensor|tightly[- ]coupled|inertial/i}]},
  {id:'photos',label:'3D Reconstruction (SfM)',description:'여러 영상에서 카메라 자세와 3D 구조를 복원하는 연구입니다. 기하 최적화와 학습 기반 복원 중 관심 있는 방법을 골라 보세요.',topics:['SfM'],keywords:[
   {id:'sfm',label:'Structure from Motion',pattern:/sfm|structure[- ]from[- ]motion/i},
   {id:'bundle',label:'Bundle Adjustment',pattern:/bundle adjustment|번들 조정/i},
   {id:'matching',label:'Image Matching',pattern:/matching|correspondence|대응점/i},
   {id:'feedforward',label:'Feed-forward Reconstruction',pattern:/feed[- ]forward|transformer|dust3r|mast3r|vggt/i}]},
  {id:'rendering',label:'3D Representation & Rendering',description:'3D 장면을 어떤 형태로 저장하고 새로운 시점에서 보여줄지 다루는 연구입니다. 장면 표현이나 지도 작성 방식으로 좁혀 보세요.',topics:['Gaussian'],pattern:/nerf|radiance field|neural render|implicit.*(?:map|surface|scene)|neural field/i,keywords:[
   {id:'gaussian',label:'Gaussian Splatting',pattern:/gaussian|splatting/i},
   {id:'nerf',label:'NeRF / Radiance Fields',pattern:/nerf|radiance field/i},
   {id:'implicit',label:'Implicit Mapping',pattern:/implicit|neural field|signed distance/i},
   {id:'dense',label:'Dense Mapping',pattern:/dense|mapping|지도/i}]},
  {id:'semantics',label:'Semantic Understanding',description:'공간의 기하 구조에 물체와 언어 정보를 연결하는 연구입니다. 의미 지도, 장면 그래프, 언어 기반 탐색을 살펴보세요.',topics:['Semantic Mapping'],keywords:[
   {id:'scenegraph',label:'Scene Graphs',pattern:/scene graph|semantic graph/i},
   {id:'openvocab',label:'Open-Vocabulary / Open-Set',pattern:/open[- ](?:vocabulary|set|dictionary)/i},
   {id:'language',label:'Vision-Language Navigation',pattern:/language|vln|언어/i},
   {id:'object',label:'Object-Level Mapping',pattern:/object|instance|물체|객체/i}]},
  {id:'robots',label:'Multi-Robot Collaboration',description:'여러 로봇이 위치나 지도 정보를 나누며 협력하는 연구입니다. 지도 병합, 분산 추정, 협력 탐사의 차이를 살펴보세요.',pattern:/multi[- ](?:robot|agent)|collaborat|decentrali|여러.*(?:로봇|에이전트)/i,keywords:[
   {id:'distributed',label:'Distributed SLAM',pattern:/distribut|decentrali|분산/i},
   {id:'merging',label:'Map Merging',pattern:/merg|submap|map fusion|병합/i},
   {id:'communication',label:'Communication Efficiency',pattern:/communicat|compress|quantiz|distill|통신|양자화/i},
   {id:'exploration',label:'Active Mapping / Exploration',pattern:/active|explor|탐사|능동/i}]},
  {id:'change',label:'Dynamic Environments',description:'움직이는 물체나 시간이 지나며 달라지는 환경을 다루는 연구입니다. 동적 장면과 장기간 지도 유지 문제를 구분해 찾아보세요.',pattern:/dynamic|changing environment|lifelong|long[- ]term|동적|움직이는|장기/i,keywords:[
   {id:'dynamicslam',label:'Dynamic SLAM',pattern:/slam|odometry|state estimat/i},
   {id:'lifelong',label:'Lifelong Mapping',pattern:/lifelong|long[- ]term|persistence|장기/i},
   {id:'tracking',label:'Object Tracking',pattern:/track|trajectory|object|물체/i},
   {id:'uncertainty',label:'Uncertainty',pattern:/uncertain|probabilis|불확실/i}]}
 ];
 function fields(p){
  const keywords=[...list(p.tags),...list(p.keywords),...list(p.prerequisites)];
  return {authors:list(p.authors).join(' '),affiliations:list(p.affiliations).join(' '),keywords:[p.title,p.summary,p.core,...keywords].join(' '),all:[p.title,p.venue,p.year,p.summary,p.core,...keywords,...list(p.authors),...list(p.affiliations),...list(p.metadataAliases)].join(' ')};
 }
 function matchesInterest(p,id){
  const interest=interests.find(i=>i.id===id);if(!interest)return true;
  return (interest.topics||[]).some(t=>list(p.tags).includes(t))||!!interest.pattern?.test(fields(p).keywords);
 }
 function matchesSubtopic(p,interestId,keywordId){
  const keyword=interests.find(i=>i.id===interestId)?.keywords.find(k=>k.id===keywordId);
  return !keyword||keyword.pattern.test(fields(p).keywords);
 }
 function filter(papers,f={}){
  return papers.filter(p=>{const x=fields(p);return (!f.topic||list(p.tags).includes(f.topic))&&(!f.venue||p.venue===f.venue)&&(!f.year||String(p.year)===String(f.year))&&matchesInterest(p,f.interest)&&matchesSubtopic(p,f.interest,f.subtopic)&&contains(x.all,f.query)&&contains(x.authors,f.author)&&contains(x.affiliations,f.affiliation)&&contains(x.keywords,f.keyword);}).sort(f.sort==='title'?(a,b)=>a.title.localeCompare(b.title):(a,b)=>b.year-a.year||a.title.localeCompare(b.title));
 }
 function paginate(papers,page=1,size=20){
  size=[10,20,50,100].includes(Number(size))?Number(size):20;
  const pages=Math.max(1,Math.ceil(papers.length/size));page=Math.min(pages,Math.max(1,Math.floor(Number(page)||1)));
  const start=(page-1)*size;return {items:papers.slice(start,start+size),page,pages,total:papers.length,start:papers.length?start+1:0,end:Math.min(start+size,papers.length),size};
 }
 root.LibrarySearch={list,normalize,contains,interests,fields,matchesInterest,matchesSubtopic,filter,paginate};
})(globalThis);
