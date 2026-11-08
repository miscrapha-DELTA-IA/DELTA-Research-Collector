/* DELTA Research Collector — local exports in extension origin, MV3.
 * Only receives messages from the extension worker, never from websites.
 */
"use strict";
const held=new Set();
chrome.runtime.onMessage.addListener((request,sender,reply)=>{
  if(!request||request.target!=="delta-download-offscreen")return false;
  if(sender.id!==chrome.runtime.id){reply({error:"Origem de mensagem inválida"});return false;}
  if(request.type==="DELTA_OFFSCREEN_CREATE"){
    try{
      if(typeof request.content!=="string"||request.content.length>25_000_000)
        throw Error("Conteúdo de exportação inválido ou muito grande");
      if(!/^(?:text\/csv|text\/plain|text\/html|application\/json)(?:;charset=utf-8)?$/i.test(request.mime||""))
        throw Error("Tipo de arquivo não permitido");
      const url=URL.createObjectURL(new Blob([request.content],{type:request.mime}));
      held.add(url);
      reply({url});
    }catch(e){reply({error:String(e.message||e)});}
    return false;
  }
  if(request.type==="DELTA_OFFSCREEN_REVOKE"){
    if(held.has(request.url)){URL.revokeObjectURL(request.url);held.delete(request.url);}
    reply({revoked:true});
    return false;
  }
  return false;
});
