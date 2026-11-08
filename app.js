const $ = s => document.querySelector(s);
let currentImage = null, currentName = "diseño", lastHT = null, installPrompt = null;
const DB_NAME="ctlab-db", STORE="assets";
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.remove("hidden");setTimeout(()=>t.classList.add("hidden"),2600)}
function go(page){document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));$("#"+page).classList.add("active");document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("#crumb").textContent=({home:"Inicio",library:"Biblioteca",halftone:"Halftone Studio",dtf:"DTF Studio",export:"Exportaciones",settings:"Ajustes"})[page];if(page==="dtf"){renderDTFAssets();renderDTF()}if(page==="library")renderLibrary()}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)));
function openFile(){$("#file-input").click()}
$("#file-input").addEventListener("change",async e=>{
 const files=[...e.target.files];
 if(!files.length)return;
 let opened=0, saved=0;
 for(const f of files){
  try{
   if(!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type) && !/\.(png|jpe?g|webp|svg)$/i.test(f.name)){
    toast("Formato no compatible: "+f.name);continue;
   }
   const data=await fileToDataURL(f);
   // La vista previa no depende de IndexedDB: primero abrir, después intentar guardar.
   await loadDataURL(data,f.name);opened++;
   try{await addAsset({name:f.name,type:f.type||"image/*",data,created:Date.now()});saved++;}
   catch(storageError){console.warn("CT LAB: no se pudo guardar en biblioteca",storageError);toast("Imagen abierta. No se pudo guardar en Biblioteca.");}
  }catch(err){console.error("CT LAB: error al importar imagen",f.name,err);toast("No se pudo mostrar "+f.name+". Probá con PNG o JPG.");}
 }
 e.target.value="";
 try{await renderLibrary();await updateStats();}catch(err){console.warn("CT LAB: biblioteca local no disponible",err);}
 if(opened){go("halftone");if(saved===opened)toast(opened===1?"Imagen cargada y guardada en Biblioteca":"Imágenes cargadas y guardadas en Biblioteca");}
});
function fileToDataURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error||new Error("No se pudo leer el archivo"));r.onabort=()=>rej(new Error("Lectura cancelada"));r.readAsDataURL(file)})}
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:"id",autoIncrement:true});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function addAsset(a){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).add(a);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function getAssets(){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function deleteAsset(id){const db=await openDB();return new Promise(res=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);tx.oncomplete=res})}
async function clearLibrary(){if(!confirm("¿Borrar todos los archivos guardados en este dispositivo?"))return;const db=await openDB();db.transaction(STORE,"readwrite").objectStore(STORE).clear();renderLibrary();updateStats();toast("Biblioteca local borrada")}
function loadDataURL(data,name){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{try{if(!img.naturalWidth||!img.naturalHeight)throw new Error("La imagen no tiene dimensiones válidas");currentImage=img;currentName=String(name||"diseño").replace(/\.[^.]+$/," ").trim()||"diseño";$("#ht-empty").classList.add("hidden");$("#ht-canvas").classList.remove("hidden");renderHT();resolve(img)}catch(err){reject(err)}};img.onerror=()=>reject(new Error("El navegador no pudo decodificar la imagen"));img.src=data;})}
async function renderLibrary(){const assets=await getAssets();const grid=$("#library-grid");grid.innerHTML="";$("#library-empty").classList.toggle("hidden",assets.length>0);for(const a of assets){const el=document.createElement("div");el.className="asset";el.innerHTML=`<img alt=""><strong title="${escapeHTML(a.name)}">${escapeHTML(a.name)}</strong><small>${new Date(a.created).toLocaleDateString()}</small><div class="row" style="margin-top:8px"><button class="btn small use">Abrir</button><button class="btn small del">Eliminar</button></div>`;el.querySelector("img").src=a.data;el.querySelector(".use").onclick=()=>{loadDataURL(a.data,a.name);go("halftone")};el.querySelector(".del").onclick=async()=>{await deleteAsset(a.id);renderLibrary();updateStats()};grid.append(el)}}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function updateStats(){$("#stat-assets").textContent=(await getAssets()).length}
function setupRange(id,out){$("#"+id).addEventListener("input",()=>{ $("#"+out).textContent=$("#"+id).value;renderHT()})}
["ht-cell","ht-contrast","ht-bright","ht-threshold"].forEach((id,i)=>setupRange(id,["v-cell","v-contrast","v-bright","v-threshold"][i]));
["ht-mode","ht-color","ht-transparent"].forEach(id=>$("#"+id).addEventListener("change",renderHT));
function resetHT(){ $("#ht-mode").value="halftone";$("#ht-cell").value=8;$("#ht-contrast").value=35;$("#ht-bright").value=0;$("#ht-threshold").value=128;$("#ht-color").value="#111111";$("#ht-transparent").checked=true;["v-cell","v-contrast","v-bright","v-threshold"].forEach((x,i)=>$("#"+x).textContent=[8,35,0,128][i]);renderHT()}
function renderHT(){
 if(!currentImage)return;
 const c=$("#ht-canvas"),ctx=c.getContext("2d",{willReadFrequently:true});
 const max=1400,scale=Math.min(1,max/Math.max(currentImage.width,currentImage.height));
 c.width=Math.round(currentImage.width*scale);c.height=Math.round(currentImage.height*scale);
 const tmp=document.createElement("canvas");tmp.width=c.width;tmp.height=c.height;
 const t=tmp.getContext("2d",{willReadFrequently:true});t.drawImage(currentImage,0,0,c.width,c.height);
 const src=t.getImageData(0,0,c.width,c.height),out=ctx.createImageData(c.width,c.height);
 const mode=$("#ht-mode").value,contrast=+$("#ht-contrast").value,bright=+$("#ht-bright").value;
 const threshold=+$("#ht-threshold").value,cell=+$("#ht-cell").value,color=hexRGB($("#ht-color").value);
 const transparent=$("#ht-transparent").checked,factor=(259*(contrast+255))/(255*(259-contrast));
 if(mode==="halftone"){
  out.data.fill(0);
  for(let y=0;y<c.height;y+=cell){
   for(let x=0;x<c.width;x+=cell){
    let sum=0,n=0;
    for(let yy=y;yy<Math.min(y+cell,c.height);yy++){
     for(let xx=x;xx<Math.min(x+cell,c.width);xx++){
      const i=(yy*c.width+xx)*4;sum+=.299*src.data[i]+.587*src.data[i+1]+.114*src.data[i+2];n++;
     }
    }
    let lum=sum/n;lum=factor*(lum-128)+128+bright*2.55;
    const r=(1-Math.max(0,Math.min(255,lum))/255)*(cell*.68),cx=x+cell/2,cy=y+cell/2;
    for(let yy=Math.max(0,Math.floor(cy-r));yy<Math.min(c.height,Math.ceil(cy+r));yy++){
     for(let xx=Math.max(0,Math.floor(cx-r));xx<Math.min(c.width,Math.ceil(cx+r));xx++){
      if((xx-cx)**2+(yy-cy)**2<=r*r){const i=(yy*c.width+xx)*4;out.data[i]=color[0];out.data[i+1]=color[1];out.data[i+2]=color[2];out.data[i+3]=255;}
     }
    }
   }
  }
 }else{
  for(let i=0;i<src.data.length;i+=4){
   let lum=.299*src.data[i]+.587*src.data[i+1]+.114*src.data[i+2];
   lum=factor*(lum-128)+128+bright*2.55;lum=Math.max(0,Math.min(255,lum));
   let r=lum,g=lum,b=lum,a=src.data[i+3];
   if(mode==="threshold"){const v=lum>=threshold?255:0;if(transparent&&v===255)a=0;r=g=b=v;}
   else if(mode==="posterize"){const v=Math.round(lum/64)*64;r=g=b=v;}
   else if(mode==="original"){r=src.data[i];g=src.data[i+1];b=src.data[i+2];}
   out.data[i]=r;out.data[i+1]=g;out.data[i+2]=b;out.data[i+3]=a;
  }
 }
 ctx.clearRect(0,0,c.width,c.height);ctx.putImageData(out,0,0);lastHT=c;
}
function hexRGB(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
function downloadCanvas(canvas,name){canvas.toBlob(blob=>{if(!blob){toast("No se pudo exportar");return}const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}, "image/png")}
function downloadHT(){if(!currentImage){toast("Primero abrí una imagen");return}downloadCanvas($("#ht-canvas"),currentName+"-CTLAB.png")}
async function saveCurrentToLibrary(){if(!currentImage)return toast("Primero abrí una imagen");const data=$("#ht-canvas").toDataURL("image/png");await addAsset({name:currentName+"-procesado.png",type:"image/png",data,created:Date.now()});updateStats();toast("Resultado guardado en biblioteca")}
function renderDTFAssets(){getAssets().then(assets=>{const box=$("#dtf-assets");box.innerHTML="";assets.forEach(a=>{const label=document.createElement("label");label.className="row";label.style.fontSize="12px";label.innerHTML=`<input type="checkbox" data-id="${a.id}" checked style="accent-color:#c7ad7a"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(a.name)}</span>`;box.append(label)});if(!assets.length)box.textContent="No hay diseños guardados. Importá archivos en Biblioteca."})}
async function renderDTF(){const assets=await getAssets(),selected=[...document.querySelectorAll("#dtf-assets input:checked")].map(x=>+x.dataset.id),chosen=assets.filter(a=>selected.includes(a.id));const w=Math.max(5,+$("#dtf-w").value||30),h=Math.max(5,+$("#dtf-h").value||45),margin=Math.max(0,+$("#dtf-margin").value||0)*40,gap=Math.max(0,+$("#dtf-gap").value||0)*118.11,scale=118.11;const c=$("#dtf-canvas");c.width=Math.round(w*scale);c.height=Math.round(h*scale);const ctx=c.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);let x=margin,y=margin,rowH=0;for(const a of chosen){const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=a.data});const maxW=c.width-2*margin,maxH=c.height-2*margin;let iw=img.width,ih=img.height;const fit=Math.min(1,maxW/iw,maxH/ih);iw*=fit;ih*=fit;if(x+iw>c.width-margin){x=margin;y+=rowH+gap;rowH=0}if(y+ih>c.height-margin)break;ctx.drawImage(img,x,y,iw,ih);x+=iw+gap;rowH=Math.max(rowH,ih)}}
function downloadDTF(){downloadCanvas($("#dtf-canvas"),"CTLAB-hoja-DTF.png")}
async function exportLibrary(){const assets=await getAssets();const blob=new Blob([JSON.stringify({app:"CT LAB",version:1,assets},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="ct-lab-library-backup.json";a.click();URL.revokeObjectURL(url)}
window.addEventListener("online",()=>{$("#connection").textContent="Online"});window.addEventListener("offline",()=>{$("#connection").textContent="Offline"});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("#install-btn").classList.remove("hidden")});
$("#install-btn").addEventListener("click",async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$("#install-btn").classList.add("hidden")});
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").then(()=>$("#offline-status").textContent="Service Worker activo. La aplicación y sus archivos esenciales se guardan para uso offline.").catch(()=>$("#offline-status").textContent="No se pudo activar el modo offline en este origen."))}
$("#connection").textContent=navigator.onLine?"Online":"Offline";updateStats();renderLibrary();renderDTF();
