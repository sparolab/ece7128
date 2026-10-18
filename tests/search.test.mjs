import test from 'node:test';
import assert from 'node:assert/strict';
import '../site/library-search.js';
const {filter,paginate}=globalThis.LibrarySearch;
const papers=[
 {id:'one',title:'Camera reconstruction',venue:'CVPR',year:2025,tags:['SfM'],authors:['Johannes Schönberger'],affiliations:['ETH Zurich'],keywords:['bundle adjustment']},
 {id:'two',title:'Multi-robot LiDAR SLAM',venue:'ICRA',year:2026,tags:['SLAM'],authors:['Alice Park'],affiliations:['Inha University'],keywords:['loop closure']},
 {id:'unknown',title:'Dynamic Gaussian mapping',venue:'CVPR',year:2025,tags:['Gaussian']}
];
test('intersects venue, year, author, affiliation and keyword; accents ignored',()=>{
 assert.deepEqual(filter(papers,{venue:'CVPR',year:'2025',author:'schonberger',affiliation:'eth',keyword:'bundle adjustment'}).map(p=>p.id),['one']);
 assert.equal(filter(papers,{author:'Schönberger',year:2026}).length,0);
 assert.equal(filter(papers,{affiliation:'ETH',keyword:'LiDAR'}).length,0);
});
test('global search includes bibliographic fields; absent metadata never matches',()=>{
 assert.deepEqual(filter(papers,{query:'ICRA 2026 Alice Inha'}).map(p=>p.id),['two']);
 assert.equal(filter(papers,{author:'unknown'}).length,0);
});
test('interests work together with other filters',()=>{
 assert.deepEqual(filter(papers,{interest:'robots',venue:'ICRA'}).map(p=>p.id),['two']);
 assert.deepEqual(filter(papers,{interest:'change'}).map(p=>p.id),['unknown']);
 assert.deepEqual(filter(papers,{interest:'photos'}).map(p=>p.id),['one']);
});
test('pagination defaults to 20, has no overlapping pages, clamps after filters',()=>{
 const items=Array.from({length:45},(_,id)=>({id}));
 assert.equal(paginate(items).items.length,20);
 assert.equal(paginate(items,2).items[0].id,20);
 assert.deepEqual(paginate(items,3).items.map(p=>p.id),[40,41,42,43,44]);
 assert.equal(paginate(items.slice(0,3),3).page,1);
 assert.equal(paginate(items,1,50).items.length,45);
 assert.equal(paginate([],100).start,0);
});
