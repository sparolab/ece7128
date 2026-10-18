import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const catalog=JSON.parse(fs.readFileSync('site/catalog.json','utf8'));
const bibliography=fs.existsSync('site/bibliography.json')?JSON.parse(fs.readFileSync('site/bibliography.json','utf8')):{};
const summaries=JSON.parse(fs.readFileSync('site/summaries.json','utf8'));
const enrich=p=>({...p,...bibliography[p.id],summary:p.summary||summaries[p.id]?.summary||'',authors:p.authors?.length?p.authors:(bibliography[p.id]?.authors||[]),affiliations:p.affiliations?.length?p.affiliations:(bibliography[p.id]?.affiliations||[])});
const data=JSON.parse(fs.readFileSync('data/submissions.json','utf8'));
if(data.version!==1||!Array.isArray(data.papers)||!Array.isArray(data.teams))throw Error('Invalid submissions');
const ids=new Set(catalog.papers.map(p=>p.id));
for(const p of data.papers){if(ids.has(p.id)||typeof p.title!=='string'||!Array.isArray(p.tags))throw Error('Invalid/duplicate paper');ids.add(p.id);}
fs.rmSync('_site',{recursive:true,force:true});fs.cpSync('site','_site',{recursive:true});
const enriched={...catalog,papers:catalog.papers.map(enrich),bibliography,summaries};
fs.writeFileSync('_site/catalog.json',JSON.stringify(enriched));
fs.writeFileSync('_site/data.js','window.CATALOG='+JSON.stringify(enriched)+';\n');
fs.writeFileSync('_site/community.json',JSON.stringify({papers:data.papers.map(enrich),teams:data.teams.map(({editHash,...t})=>t)}));
// Refresh changed scripts even when the browser cached a previous deployment.
for(const name of ['index.html','template.html']){
 const file=path.join('_site',name);
 const html=fs.readFileSync(file,'utf8').replace(/src="([a-z-]+\.js)"/g,(_,asset)=>{
  const hash=createHash('sha256').update(fs.readFileSync(path.join('_site',asset))).digest('hex').slice(0,12);
  return `src="${asset}?v=${hash}"`;
 });
 const styled=html.replace(/href="(style\.css)"/g,(_,asset)=>`href="${asset}?v=${createHash('sha256').update(fs.readFileSync(path.join('_site',asset))).digest('hex').slice(0,12)}"`);
 fs.writeFileSync(file,styled);
}
console.log(`Built ${catalog.papers.length+data.papers.length} papers and ${data.teams.length} teams.`);
