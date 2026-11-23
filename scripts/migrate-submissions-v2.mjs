// One-time, reversible metadata migration. Original duplicate rows remain in archivedTeams.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const norm=s=>s.normalize('NFKC').replace(/\s+/g,'').toLowerCase();
export function migrate(source,now=new Date().toISOString()){
 const data=structuredClone(source);
 if(data.migrations?.includes('separate-submissions-v2'))return data;
 const groups=new Map();
 for(const team of data.teams){const k=team.members.map(norm).sort().join('\0');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(team);}
 data.archivedTeams??=[];
 data.teams=[...groups.values()].map(group=>{
  group.sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''));const latest=group.at(-1);
  for(const previous of group.slice(0,-1))data.archivedTeams.push({...previous,mergedIntoId:latest.id,archivedAt:now,archiveReason:'Same members; professor selected latest registered paper.'});
  return latest;
 });
 for(const team of data.teams){
  let video=false;try{video=['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(new URL(team.url).hostname.toLowerCase());}catch{}
  if(video&&!team.proposalUrl){team.proposalUrl=team.url;team.legacyProjectUrl=team.url;team.url='';team.proposalImportedAt=now;}
 }
 data.migrations=[...(data.migrations||[]),'separate-submissions-v2'];
 return data;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const file='data/submissions.json';const data=migrate(JSON.parse(fs.readFileSync(file,'utf8')));fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
 console.log(JSON.stringify({activeTeams:data.teams.length,archivedTeams:data.archivedTeams.length,proposals:data.teams.filter(t=>t.proposalUrl).length}));
}
