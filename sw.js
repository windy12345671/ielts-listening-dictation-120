const CACHE='tingjian-ielts-v3';
const CORE=['./','./index.html','./styles.css','./app.js','./questions.json','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('tingjian-ielts-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET'||new URL(request.url).origin!==location.origin)return;if(request.mode==='navigate'){event.respondWith(fetch(request).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put('./index.html',response.clone()));return response}).catch(async()=>await caches.match('./index.html')||await caches.match('./')));return}event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));return response}))) });
self.addEventListener('message',event=>{if(event.data?.type!=='CACHE_AUDIO')return;event.waitUntil((async()=>{
  const port=event.ports?.[0];
  try{
    const questions=await(await fetch('./questions.json')).json();
    const paths=[...new Set(questions.map(q=>q.audio))];
    const cache=await caches.open(CACHE);
    let done=0;
    for(let start=0;start<paths.length;start+=8){
      await Promise.all(paths.slice(start,start+8).map(async path=>{
        if(!await cache.match(path)){
          const response=await fetch(path);
          if(!response.ok)throw Error(`HTTP ${response.status}: ${path}`);
          await cache.put(path,response);
        }
        done++;
        if(done%10===0||done===paths.length)port?.postMessage({type:'progress',done,total:paths.length});
      }));
    }
    port?.postMessage({type:'complete',done,total:paths.length});
  }catch(error){port?.postMessage({type:'error',message:String(error)})}
})())});
