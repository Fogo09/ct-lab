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
 if(opened){go("halftone");await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));renderHT();if(saved===opened)toast(opened===1?"Imagen cargada y guardada en Biblioteca":"Imágenes cargadas y guardadas en Biblioteca");}
});
function fileToDataURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error||new Error("No se pudo leer el archivo"));r.onabort=()=>rej(new Error("Lectura cancelada"));r.readAsDataURL(file)})}
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:"id",autoIncrement:true});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function addAsset(a){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).add(a);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function getAssets(){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function deleteAsset(id){const db=await openDB();return new Promise(res=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(id);tx.oncomplete=res})}
async function clearLibrary(){if(!confirm("¿Borrar todos los archivos guardados en este dispositivo?"))return;const db=await openDB();db.transaction(STORE,"readwrite").objectStore(STORE).clear();renderLibrary();updateStats();toast("Biblioteca local borrada")}
async function loadDataURL(data,name){
 const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>image.naturalWidth&&image.naturalHeight?resolve(image):reject(new Error("La imagen no tiene dimensiones válidas"));image.onerror=()=>reject(new Error("El navegador no pudo decodificar la imagen"));image.src=data;});
 currentImage=img;
 currentName=String(name||"diseño").replace(/\.[^.]+$/," ").trim()||"diseño";
 go("halftone");
 $("#ht-empty").classList.add("hidden");
 $("#ht-canvas").classList.remove("hidden");
 // Esperar a que Halftone esté visible antes de dimensionar y dibujar el canvas.
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 renderHT();
 if(!$("#ht-canvas").width||!$("#ht-canvas").height)throw new Error("No se pudo preparar la vista previa");
 return img;
}
async function renderLibrary(){const assets=await getAssets();const grid=$("#library-grid");grid.innerHTML="";$("#library-empty").classList.toggle("hidden",assets.length>0);for(const a of assets){const el=document.createElement("div");el.className="asset";el.innerHTML=`<img alt=""><strong title="${escapeHTML(a.name)}">${escapeHTML(a.name)}</strong><small>${new Date(a.created).toLocaleDateString()}</small><div class="row" style="margin-top:8px"><button class="btn small use">Abrir</button><button class="btn small del">Eliminar</button></div>`;el.querySelector("img").src=a.data;el.querySelector(".use").onclick=async()=>{try{await loadDataURL(a.data,a.name);toast("Imagen abierta en Halftone Studio")}catch(err){console.error("CT LAB: no se pudo abrir desde Biblioteca",err);toast("No se pudo abrir esta imagen en Halftone")}};el.querySelector(".del").onclick=async()=>{await deleteAsset(a.id);renderLibrary();updateStats()};grid.append(el)}}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function updateStats(){$("#stat-assets").textContent=(await getAssets()).length}
function setupRange(id,out){$("#"+id).addEventListener("input",()=>{ $("#"+out).textContent=$("#"+id).value;renderHT()})}
["ht-cell","ht-contrast","ht-bright","ht-threshold"].forEach((id,i)=>setupRange(id,["v-cell","v-contrast","v-bright","v-threshold"][i]));
["ht-mode","ht-color","ht-transparent"].forEach(id=>$("#"+id).addEventListener("change",renderHT));
function resetHT(){ $("#ht-mode").value="halftone";$("#ht-cell").value=8;$("#ht-contrast").value=35;$("#ht-bright").value=0;$("#ht-threshold").value=128;$("#ht-color").value="#111111";$("#ht-transparent").checked=true;["v-cell","v-contrast","v-bright","v-threshold"].forEach((x,i)=>$("#"+x).textContent=[8,35,0,128][i]);renderHT()}
function renderHT(){
 if(!currentImage)return;
 try{
 const c=$("#ht-canvas"),ctx=c.getContext("2d",{willReadFrequently:true});
 if(!ctx)throw new Error("El navegador no pudo crear el canvas");
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
 }catch(err){console.error("CT LAB Halftone render error",err);$("#ht-empty").classList.remove("hidden");$("#ht-empty").innerHTML='<b>No se pudo procesar esta imagen</b><br><small>Probá con otra imagen PNG o JPG.</small>';$("#ht-canvas").classList.add("hidden");toast("Error al generar la vista previa de Halftone")}
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

// CT LAB PRO v2.0 — herramientas locales adicionales
const PAGE_NAMES={home:'Inicio',library:'Biblioteca',halftone:'Halftone Pro',transparency:'Transparency Lab',enhancer:'Image Enhancer',vector:'Vector Lab',dtf:'DTF Pro',mockup:'Mockup Studio',export:'Exportaciones',settings:'Ajustes'};
const _go=go;go=function(page){_go(page);$('#crumb').textContent=PAGE_NAMES[page]||page;if(page==='transparency')renderTransparency();if(page==='enhancer')renderEnhancer();if(page==='mockup')renderMockup()};
function toolSource(){if(!currentImage)return null;const c=document.createElement('canvas');const s=Math.min(1,1800/Math.max(currentImage.naturalWidth,currentImage.naturalHeight));c.width=Math.max(1,Math.round(currentImage.naturalWidth*s));c.height=Math.max(1,Math.round(currentImage.naturalHeight*s));c.getContext('2d').drawImage(currentImage,0,0,c.width,c.height);return c}
function revealToolCanvas(id,emptyId){const c=$('#'+id),e=$('#'+emptyId);if(c){c.classList.remove('hidden');if(e)e.classList.add('hidden')}return c}
function renderTransparency(){const src=toolSource();if(!src)return;const c=revealToolCanvas('tr-canvas','tr-empty'),ctx=c.getContext('2d',{willReadFrequently:true});c.width=src.width;c.height=src.height;const a=src.getContext('2d').getImageData(0,0,src.width,src.height),o=ctx.createImageData(src.width,src.height),rgb=hexRGB($('#tr-color').value),tol=+$('#tr-tol').value,inv=$('#tr-invert').checked;for(let i=0;i<a.data.length;i+=4){const d=Math.hypot(a.data[i]-rgb[0],a.data[i+1]-rgb[1],a.data[i+2]-rgb[2]);let alpha=a.data[i+3];if((!inv&&d<=tol*1.732)||(inv&&d>tol*1.732))alpha=0;o.data.set([a.data[i],a.data[i+1],a.data[i+2],alpha],i)}ctx.putImageData(o,0,0);$('#tr-tol-v').textContent=tol;$('#tr-soft-v').textContent=$('#tr-soft').value}
function renderEnhancer(){const src=toolSource();if(!src)return;const c=revealToolCanvas('en-canvas','en-empty'),ctx=c.getContext('2d',{willReadFrequently:true}),scale=+$('#en-scale').value;c.width=Math.min(5000,Math.round(src.width*scale));c.height=Math.min(5000,Math.round(src.height*scale));ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(src,0,0,c.width,c.height);let im=ctx.getImageData(0,0,c.width,c.height),d=im.data,contrast=+$('#en-contrast').value,bright=+$('#en-bright').value,sharp=+$('#en-sharp').value/100,noise=+$('#en-noise').value;const f=(259*(contrast+255))/(255*(259-contrast));const copy=new Uint8ClampedArray(d);for(let y=1;y<c.height-1;y++)for(let x=1;x<c.width-1;x++){const i=(y*c.width+x)*4;for(let k=0;k<3;k++){let v=f*(copy[i+k]-128)+128+bright*2.55;if(sharp){const avg=(copy[i-4+k]+copy[i+4+k]+copy[i-c.width*4+k]+copy[i+c.width*4+k])/4;v+=sharp*(copy[i+k]-avg)*1.5}if(noise){const avg=(copy[i-4+k]+copy[i+4+k]+copy[i-c.width*4+k]+copy[i+c.width*4+k])/4;v=v*(1-noise*.035)+avg*(noise*.035)}d[i+k]=Math.max(0,Math.min(255,v))}}ctx.putImageData(im,0,0);['sharp','noise','contrast','bright'].forEach(id=>$('#en-'+id+'-v').textContent=$('#en-'+id).value)}
function downloadToolCanvas(id,name){const c=$('#'+id);if(!c||!c.width)return toast('Primero generá una vista previa');downloadCanvas(c,name)}
function exportBasicSVG(){const src=toolSource();if(!src)return toast('Primero abrí una imagen');const threshold=+$('#ve-th').value,color=$('#ve-color').value,ctx=src.getContext('2d'),d=ctx.getImageData(0,0,src.width,src.height).data,scale=Math.max(1,Math.ceil(Math.max(src.width,src.height)/500)),rects=[];for(let y=0;y<src.height;y+=scale)for(let x=0;x<src.width;x+=scale){const i=(y*src.width+x)*4;if(.299*d[i]+.587*d[i+1]+.114*d[i+2]<threshold&&d[i+3]>20)rects.push(`<rect x="${x}" y="${y}" width="${scale}" height="${scale}"/>`)}const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${src.width} ${src.height}" width="${src.width}" height="${src.height}"><g fill="${color}">${rects.join('')}</g></svg>`;const blob=new Blob([svg],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='CTLAB-vector-basico.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('SVG básico generado. Revisá los bordes antes de imprimir')}
function renderMockup(){const c=$('#mk-canvas'),ctx=c.getContext('2d'),color=$('#mk-color').value,type=$('#mk-type').value,size=+$('#mk-size').value/100,y=+$('#mk-y').value/100;ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#e8e4dc';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=color;ctx.strokeStyle='#aaa49a';ctx.lineWidth=3;ctx.beginPath();if(type==='tshirt'){ctx.moveTo(235,150);ctx.lineTo(140,190);ctx.lineTo(75,310);ctx.lineTo(155,355);ctx.lineTo(195,290);ctx.lineTo(195,590);ctx.lineTo(505,590);ctx.lineTo(505,290);ctx.lineTo(545,355);ctx.lineTo(625,310);ctx.lineTo(560,190);ctx.lineTo(465,150);ctx.quadraticCurveTo(350,220,235,150)}else{ctx.moveTo(235,150);ctx.lineTo(140,190);ctx.lineTo(75,310);ctx.lineTo(155,355);ctx.lineTo(195,290);ctx.lineTo(195,590);ctx.lineTo(505,590);ctx.lineTo(505,290);ctx.lineTo(545,355);ctx.lineTo(625,310);ctx.lineTo(560,190);ctx.lineTo(465,150);ctx.quadraticCurveTo(350,220,235,150)}ctx.closePath();ctx.fill();ctx.stroke();if(type==='hoodie'){ctx.beginPath();ctx.arc(350,170,60,Math.PI,0);ctx.stroke();ctx.strokeRect(275,470,150,55)}if(type==='sweat'){ctx.strokeRect(195,560,310,28)}if(currentImage){const w=700*size,h=w*currentImage.naturalHeight/currentImage.naturalWidth;ctx.drawImage(currentImage,350-w/2,700*y-h/2,w,h)}$('#mk-size-v').textContent=$('#mk-size').value;$('#mk-y-v').textContent=$('#mk-y').value}
['tr-color','tr-tol','tr-invert'].forEach(id=>$('#'+id)?.addEventListener('input',renderTransparency));$('#tr-soft')?.addEventListener('input',renderTransparency);['en-sharp','en-noise','en-contrast','en-bright','en-scale'].forEach(id=>$('#'+id)?.addEventListener('input',renderEnhancer));['mk-type','mk-color','mk-size','mk-y'].forEach(id=>$('#'+id)?.addEventListener('input',renderMockup));
// Halftone controls: redraw on every relevant change and keep transparent output visible on checkerboard.
