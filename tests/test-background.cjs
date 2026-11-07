const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
(async()=>{
 const db={};let handler=null;
 const chrome={
  runtime:{onMessage:{addListener(fn){handler=fn;}},lastError:null},
  action:{onClicked:{addListener(){}}},
  tabs:{sendMessage(){},create(){}},
  storage:{local:{async get(keys){const out={};for(const k of keys)out[k]=db[k];return out;},async set(rows){Object.assign(db,rows);},async remove(keys){for(const k of keys)delete db[k];}}},
  downloads:{download(cfg,cb){cb(1)}}
 };
 vm.runInNewContext(fs.readFileSync(__dirname+'/../background.js','utf8'),{chrome,URL,AbortController,setTimeout,clearTimeout,fetch});
 function msg(data){return new Promise((resolve,reject)=>{
  const result=handler(data,{tab:{id:1}},resolve);
  if(result!==true)reject(new Error('Listener did not keep channel open'));
 });}
 const r1=await msg({type:'DELTA_LIBRARY_ADD',records:[{source:'PubMed',identifier:'1',doi:'10.1000/TEST',title:'Study',authors:['A'],abstract:''}],run:{source:'pubmed',url:'https://pubmed.ncbi.nlm.nih.gov/?term=test'}});
 assert.equal(r1.added,1);
 const r2=await msg({type:'DELTA_LIBRARY_ADD',records:[{source:'DOAJ',identifier:'def',doi:'https://doi.org/10.1000/test',title:'Study',authors:['A','B'],abstract:'Rich abstract'}],run:{source:'doaj',url:'https://doaj.org/search/articles?q=test'}});
 assert.equal(r2.merged,1);
 const data=await msg({type:'DELTA_LIBRARY_GET'});
 assert.equal(data.records.length,1);
 assert.equal(data.records[0].abstract,'Rich abstract');
 assert.equal(data.records[0].authors.length,2);
 assert.deepEqual([...data.records[0].sources],['PubMed','DOAJ']);
 assert.equal(data.history.length,2);
 await msg({type:'DELTA_LIBRARY_CLEAR',confirm:'APAGAR_BIBLIOTECA_LOCAL'});
 const empty=await msg({type:'DELTA_LIBRARY_GET'});
 assert.equal(empty.records.length,0);
 console.log('PASS: background library persistence, DOI merge, history and clearing.');
})().catch(e=>{console.error(e);process.exitCode=1;});
