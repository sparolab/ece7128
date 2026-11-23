import test from 'node:test';
import assert from 'node:assert/strict';
import {migrate} from '../scripts/migrate-submissions-v2.mjs';
test('latest paper wins, old record archived, YouTube preserved as Proposal, migration is idempotent',()=>{
 const old={id:'a',name:'Old',members:['A','B'],createdAt:'2026-10-01',paperId:'old',url:''};
 const latest={id:'b',name:'Latest',members:['B','A'],createdAt:'2026-11-01',paperId:'new',url:'https://youtu.be/abcdefghijk'};
 const source={version:1,papers:[],teams:[old,latest]};const migrated=migrate(source,'2026-11-23');
 assert.equal(source.teams.length,2);assert.equal(migrated.teams.length,1);assert.equal(migrated.teams[0].paperId,'new');assert.equal(migrated.teams[0].proposalUrl,latest.url);assert.equal(migrated.teams[0].url,'');assert.equal(migrated.teams[0].proposalSubmittedAt,undefined);
 assert.equal(migrated.archivedTeams[0].id,'a');assert.equal(migrated.archivedTeams[0].mergedIntoId,'b');assert.equal(migrated.archivedTeams[0].paperId,'old');assert.deepEqual(migrate(migrated),migrated);
});
