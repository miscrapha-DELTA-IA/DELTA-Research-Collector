"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
let handler=null;const created=[],revoked=[];
const url={
 createObjectURL:blob=>{created.push(blob);return "blob:chrome-extension://delta-test-ext/"+created.length;},
 revokeObjectURL:link=>revoked.push(link)
};
class BlobFake{constructor(parts,{type}){this.parts=parts;this.type=type;}}
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"..","download-offscreen.js"),"utf8"),{
  chrome:{runtime:{id:"delta-test-ext",onMessage:{addListener:cb=>{handler=cb;}}}},
  URL:url,Blob:BlobFake
});
function msg(payload,sender={id:"delta-test-ext"}){
 let reply;
 const returned=handler({...payload,target:"delta-download-offscreen"},sender,x=>{reply=x;});
 assert.equal(returned,false);
 return reply;
}
const content="title,abstract\nBiomedicina,visão científica";
const r=msg({type:"DELTA_OFFSCREEN_CREATE",content,mime:"text/csv;charset=utf-8"});
assert.match(r.url,/^blob:chrome-extension:\/\//);
assert.equal(created[0].parts[0],content);
assert.equal(created[0].type,"text/csv;charset=utf-8");
assert.equal(msg({type:"DELTA_OFFSCREEN_REVOKE",url:r.url}).revoked,true);
assert.deepEqual(revoked,[r.url]);
assert.equal(msg({type:"DELTA_OFFSCREEN_CREATE",content,mime:"application/x-msdownload"}).error.includes("Tipo"),true);
assert.equal(msg({type:"DELTA_OFFSCREEN_CREATE",content,mime:"text/plain"},{id:"other"}).error.includes("Origem"),true);
assert.equal(handler({type:"unrelated"}, {id:"delta-test-ext"},()=>{}),false);
console.log("PASS: offscreen Blob isolation, Unicode, MIME allowlist and URL revocation.");
