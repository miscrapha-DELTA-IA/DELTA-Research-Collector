"use strict";
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
const calls=[],published=[],revoked=[],listeners=[];
let onChanged=null,backgroundHandler=null,offscreenActive=false,downloadError=false;
const chrome={
  runtime:{id:"delta-test-ext",lastError:null,
    getURL:p=>"chrome-extension://delta-test-ext/"+p,
    getContexts:async()=>offscreenActive?[{documentUrl:"chrome-extension://delta-test-ext/download-offscreen.html"}]:[],
    sendMessage:async m=>{
      if(m.type==="DELTA_OFFSCREEN_CREATE"){
        const url="blob:chrome-extension://delta-test-ext/"+(published.length+1);
        published.push({url,text:m.content,mime:m.mime});return {url};
      }
      if(m.type==="DELTA_OFFSCREEN_REVOKE"){revoked.push(m.url);return {revoked:true};}
      throw Error("Unexpected offscreen request");
    },
    onMessage:{addListener:cb=>{backgroundHandler=cb;}}},
  offscreen:{createDocument:async options=>{
    assert.deepEqual([...options.reasons],["BLOBS"]);offscreenActive=true;
  }},
  downloads:{
    onChanged:{addListener:cb=>{onChanged=cb;}},
    download:(cfg,cb)=>{
      calls.push(cfg);
      if(downloadError){chrome.runtime.lastError={message:"Download bloqueado pelo Opera"};cb(undefined);
        chrome.runtime.lastError=null;}
      else cb(200+calls.length);
    }
  },
  storage:{local:{async get(){return {};},async set(){},async remove(){}},
    session:{async get(){return {};},async set(){},async remove(){}}},
  action:{onClicked:{addListener:cb=>listeners.push(cb)}},
  tabs:{sendMessage(){},create(){}},
  scripting:{executeScript(){}}
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"..","background.js"),"utf8"),{
  chrome,URL,AbortController,setTimeout,clearTimeout,fetch
});
async function request(data,sender={tab:{id:5},url:"https://openalex.org/works?search=health"}){
  return await new Promise((resolve,reject)=>{
    const result=backgroundHandler(data,sender,resolve);
    if(result!==true)reject(Error("Export message did not keep callback channel"));
  });
}
(async()=>{
 const csv='source,title\nOpenAlex,"Biomedicina e saúde"\n'+
   'a,'.repeat(700_000); // > 1 MB: no data URI and no source-tab anchor click.
 const first=await request({type:"DELTA_EXPORT_FILE",filename:"DELTA_biblioteca_unificada_2026.csv",
   mime:"text/csv;charset=utf-8",content:csv});
 assert.equal(first.started,true);
 assert.equal(typeof first.downloadId,"number");
 assert.equal(calls.length,1);
 assert.equal(published[0].text,csv,"Do not truncate large CSV during messaging");
 assert.equal(published[0].mime,"text/csv;charset=utf-8");
 assert.match(calls[0].url,/^blob:chrome-extension:\/\//);
 assert.equal(calls[0].filename,"DELTA_biblioteca_unificada_2026.csv");
 assert.equal(calls[0].conflictAction,"uniquify");
 assert.equal(calls[0].saveAs,false);
 assert.equal(offscreenActive,true);
 onChanged({id:first.downloadId,state:{current:"complete"}});
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.deepEqual(revoked,[published[0].url]);
 const bib=await request({type:"DELTA_EXPORT_FILE",filename:"DELTA_biblioteca_unificada_2026.bib",
   mime:"text/plain;charset=utf-8",content:"@article{A,title={Estudo}}"});
 assert.equal(bib.started,true);
 assert.equal(calls[1].filename,"DELTA_biblioteca_unificada_2026.bib");
 assert.equal((await request({type:"DELTA_EXPORT_FILE",filename:"../secrets.csv",
   mime:"text/csv;charset=utf-8",content:"title\nx"})).error.includes("nome de arquivo"),true);
 assert.match((await request({type:"DELTA_EXPORT_FILE",filename:"DELTA_thing.csv",
   mime:"text/csv;charset=utf-8",content:"title\nx"},
   {url:"https://example.com",tab:{}})).error,/origem inválida/);
 assert.match((await request({type:"DELTA_EXPORT_FILE",filename:"DELTA_thing.csv",
   mime:"application/javascript",content:"alert(1)"})).error,/formato inválido/);
 downloadError=true;
 const rejected=await request({type:"DELTA_EXPORT_FILE",filename:"DELTA_blocked.csv",
   mime:"text/csv;charset=utf-8",content:"title\nx"});
 assert.match(rejected.error,/Download bloqueado pelo Opera/);
 assert.ok(revoked.includes(published.at(-1).url),"Failed download must revoke blob");
 console.log("PASS: reliable extension-origin CSV/BibTeX downloads, >1MB payload, errors, revocation and file guards.");
})().catch(e=>{console.error(e);process.exitCode=1;});
