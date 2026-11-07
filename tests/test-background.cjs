const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
(async()=>{
 const db={};const session={};let handler=null;
 const chrome={
  runtime:{onMessage:{addListener(fn){handler=fn;}},lastError:null},
  action:{onClicked:{addListener(){}}},
  tabs:{sendMessage(){},create(){}},
  storage:{local:{async get(keys){const out={};for(const k of keys)out[k]=db[k];return out;},async set(rows){Object.assign(db,rows);},async remove(keys){for(const k of keys)delete db[k];}},session:{async get(keys){const out={};for(const k of [keys].flat())out[k]=session[k];return out;},async set(rows){Object.assign(session,rows);},async remove(keys){for(const k of [keys].flat())delete session[k];}}},
  downloads:{download(cfg,cb){cb(1)}}
 };
 vm.runInNewContext(fs.readFileSync(__dirname+'/../background.js','utf8'),{chrome,URL,AbortController,setTimeout,clearTimeout,fetch});
 function msg(data,sender={tab:{id:1}}){return new Promise((resolve,reject)=>{
  const result=handler(data,sender,resolve);
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
 const capesUrl="https://www.periodicos.capes.gov.br/index.php/acervo/buscador.html?q=prognosis&source=all&num=30&page=4&publishyear=2019%3A2026";
 const capesSender={url:capesUrl,tab:{id:7,url:capesUrl}};
 const crawl={version:1,startedAt:Date.now(),originalUrl:capesUrl,
   baseUrl:capesUrl.replace("page=4","page=1"),searchKey:"test",
   startingPage:4,currentPage:1,pageSize:30,max:200,format:"csv",saveLocal:true,
   verifyOA:false,expectedTotal:118,records:[],pages:[],warnings:[]};
 assert.equal((await msg({type:"DELTA_CAPES_RUN_SAVE",run:crawl},capesSender)).saved,true);
 const restored=await msg({type:"DELTA_CAPES_RUN_GET"},capesSender);
 assert.equal(restored.run.currentPage,1);
 assert.equal(restored.run.expectedTotal,118);
 assert.equal(restored.run.startingPage,4);
 assert.equal((await msg({type:"DELTA_CAPES_RUN_CLEAR"},capesSender)).cleared,true);
 assert.equal((await msg({type:"DELTA_CAPES_RUN_GET"},capesSender)).run,null);
 const hostile=await msg({type:"DELTA_CAPES_RUN_GET"},
   {url:"https://example.com/?q=prognosis",tab:{id:9,url:"https://example.com/?q=prognosis"}});
 assert.match(hostile.error,/origem/);
 const expired=await msg({type:"DELTA_CAPES_RUN_SAVE",run:{...crawl,startedAt:Date.now()-1300000}},capesSender);
 assert.match(expired.error,/expirada/);
 console.log("PASS: CAPES per-tab session store, resume, clearing and origin/expiry guards.");

})().catch(e=>{console.error(e);process.exitCode=1;});
