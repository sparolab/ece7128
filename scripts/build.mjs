import fs from 'node:fs';
import path from 'node:path';
const catalog=JSON.parse(fs.readFileSync('site/catalog.json','utf8'));
const data=JSON.parse(fs.readFileSync('data/submissions.json','utf8'));
if(data.version!==1||!Array.isArray(data.papers)||!Array.isArray(data.teams))throw Error('Invalid submissions');
const ids=new Set(catalog.papers.map(p=>p.id));
for(const p of data.papers){if(ids.has(p.id)||typeof p.title!=='string'||!Array.isArray(p.tags))throw Error('Invalid/duplicate paper');ids.add(p.id);}
fs.rmSync('_site',{recursive:true,force:true});fs.cpSync('site','_site',{recursive:true});
fs.writeFileSync('_site/community.json',JSON.stringify({papers:data.papers,teams:data.teams.map(({editHash,...t})=>t)}));
console.log(`Built ${catalog.papers.length+data.papers.length} papers and ${data.teams.length} teams.`);
