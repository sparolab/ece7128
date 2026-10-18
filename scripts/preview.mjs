// Local QA only. Uses an in-memory GitHub stub; never writes to GitHub.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {createHandler} from '../server/handler.mjs';
const port=8768,origin=`http://127.0.0.1:${port}`;
let data={version:1,papers:[],teams:[]},revision=0;
const handle=createHandler({catalog:JSON.parse(fs.readFileSync('site/catalog.json')),allowedOrigin:origin,fetcher:async(url,options)=>{
 if(options.method!=='PUT')return Response.json({sha:String(revision),content:Buffer.from(JSON.stringify(data)).toString('base64')});
 const b=JSON.parse(options.body);if(b.sha!==String(revision))return Response.json({}, {status:409});data=JSON.parse(Buffer.from(b.content,'base64'));revision++;return Response.json({});
}});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,origin);
 if(url.pathname==='/api/course-registry'){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const response=await handle(new Request(url,{method:req.method,headers:req.headers,body:['POST','PATCH'].includes(req.method)?Buffer.concat(chunks):undefined}),{GITHUB_CONTENTS_TOKEN:'test-token',COURSE_SUBMISSION_CODE:'preview-only'});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
 }
 const rel=url.pathname.replace(/^\/ece7128\//,'/');
 if(rel==='/config.js'){res.setHeader('Content-Type','text/javascript');res.end(`window.COURSE_CONFIG={apiBase:${JSON.stringify(origin)}};`);return;}
 const filename=path.resolve('_site','.'+(rel==='/'?'/index.html':rel));
 if(!filename.startsWith(path.resolve('_site')+path.sep)){res.writeHead(403);res.end();return;}
 res.setHeader('Content-Type',types[path.extname(filename)]||'text/plain');res.end(fs.readFileSync(filename));
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`${origin}/ece7128/ (local in-memory QA)`));
