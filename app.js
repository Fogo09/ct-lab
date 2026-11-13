const $ = s => document.querySelector(s);
let currentImage = null, currentName = "diseño", lastHT = null, installPrompt = null, htToolMode = "color", htPicking = false, htInk = "#ffffff";
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
function resetHT(){ $("#ht-mode").value="halftone";$("#ht-cell").value=10;$("#ht-contrast").value=35;$("#ht-bright").value=0;$("#ht-threshold").value=128;$("#ht-color").value="#111111";$("#ht-transparent").checked=true;["v-cell","v-contrast","v-bright","v-threshold"].forEach((x,i)=>$("#"+x).textContent=[10,35,0,128][i]);renderHT()}
function setHTMode(mode){htToolMode=mode;htPicking=false;const picker=$('#ht-picker');if(picker){picker.textContent='⌖ Elegir color en imagen';picker.classList.remove('primary')}$('#ht-remove-panel').style.display=(mode==='remove'||mode==='keyhalftone')?'block':'none';$('#ht-mono-panel').style.display=mode==='mono'?'block':'none';document.querySelectorAll('[data-ht-mode]').forEach(b=>b.classList.toggle('primary',b.dataset.htMode===mode));$('#ht-ink-control').style.display=mode==='mono'?'none':'grid';renderHT()}
function renderHT(){
 if(!currentImage)return;
 try{
  const c=$('#ht-canvas'),ctx=c.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw new Error('No se pudo crear el canvas');
  // Print sizing is applied BEFORE background keying and halftone generation.
  const dpi=+($('#ht-dpi')?.value||300),cmW=Math.max(1,+($('#ht-width-cm')?.value||30));
  const ratio=currentImage.naturalHeight/currentImage.naturalWidth;
  const cmH=$('#ht-lock-ratio')?.checked?cmW*ratio:Math.max(1,+($('#ht-height-cm')?.value||cmW*ratio));
  let targetW=Math.round(cmW/2.54*dpi),targetH=Math.round(cmH/2.54*dpi);
  const maxPixels=30000000,requested=targetW*targetH,capScale=requested>maxPixels?Math.sqrt(maxPixels/requested):1;
  targetW=Math.max(1,Math.round(targetW*capScale));targetH=Math.max(1,Math.round(targetH*capScale));
  c.width=targetW;c.height=targetH;
  const actualDpi=Math.round(dpi*capScale);
  const info=$('#ht-pixel-info');if(info)info.textContent=`Salida: ${targetW} × ${targetH} px · ${cmW.toFixed(1)} × ${cmH.toFixed(1)} cm · ${actualDpi} DPI efectivos${capScale<1?' (reducido para proteger la memoria del navegador)':''}`;
  const tmp=document.createElement('canvas');tmp.width=c.width;tmp.height=c.height;
  const t=tmp.getContext('2d',{willReadFrequently:true});t.drawImage(currentImage,0,0,c.width,c.height);
  const src=t.getImageData(0,0,c.width,c.height),out=ctx.createImageData(c.width,c.height),mode=htToolMode;
  const contrast=+$('#ht-contrast').value,bright=+$('#ht-bright').value,threshold=+$('#ht-threshold').value,cell=Math.max(1,+$('#ht-cell').value),transparent=$('#ht-transparent').checked;
  const lpi=Math.max(20,Math.min(120,+($('#ht-lpi')?.value||45))),angle=(+($('#ht-angle')?.value||0))*Math.PI/180,dotShape=$('#ht-dot-shape')?.value||'circle';
  const lpiCell=Math.max(3,Math.min(24,Math.round(dpi/lpi)));if($('#ht-lpi-info'))$('#ht-lpi-info').textContent=`Paso aproximado: ${lpiCell} px por celda a ${dpi} DPI · ${lpi} LPI`;
  const effectiveCell=Math.max(1,Math.round(lpiCell));
  // Point-size control scales ink-dot radius independently of LPI cell spacing.
  const pointScale=Math.max(0.35,Math.min(1.8,cell/8));
  const factor=(259*(contrast+255))/(255*(259-contrast));
  const key=hexRGB($('#ht-key-color')?.value||'#000000');
  // Read slider values without `||`: zero is a valid and intentional setting.
  const tol=Number($('#ht-tol')?.value ?? 35),soft=Number($('#ht-soft')?.value ?? 12),ink=hexRGB(htInk);
  // Background keying is edge-connected in BOTH removal modes. Similar-colored
  // pixels enclosed by the artwork (hair, outlines, lettering and symbols) survive.
  if(mode==='keyhalftone'||mode==='remove'){
   const w=c.width,h=c.height,total=w*h,limit=Math.max(0,tol)+Math.max(0,soft);
   const seen=new Uint8Array(total),queue=new Int32Array(total);let head=0,tail=0;
   const isBg=(idx)=>{const i=idx*4,d=Math.hypot(src.data[i]-key[0],src.data[i+1]-key[1],src.data[i+2]-key[2]);return d<=limit};
   const seed=(idx)=>{if(idx>=0&&idx<total&&!seen[idx]&&isBg(idx)){seen[idx]=1;queue[tail++]=idx}};
   // Seed all four image edges, then flood-fill with conservative 4-neighbour connectivity.
   for(let x=0;x<w;x++){seed(x);seed((h-1)*w+x)}
   for(let y=1;y<h-1;y++){seed(y*w);seed(y*w+w-1)}
   while(head<tail){const idx=queue[head++],x=idx%w,y=(idx/w)|0;if(x>0)seed(idx-1);if(x<w-1)seed(idx+1);if(y>0)seed(idx-w);if(y<h-1)seed(idx+w)}
   if(mode==='remove')out.data.set(src.data);
   for(let idx=0;idx<total;idx++)if(seen[idx]){
    const i=idx*4,d=Math.hypot(src.data[i]-key[0],src.data[i+1]-key[1],src.data[i+2]-key[2]);
    // Pixels inside the tolerance become transparent; the soft band feathers outward.
    const feather=soft>0?Math.max(0,Math.min(1,(d-tol)/soft)):(d<=tol?0:1);
    if(mode==='keyhalftone')src.data[i+3]=Math.round(src.data[i+3]*feather);
    else out.data[i+3]=Math.round(src.data[i+3]*feather);
   }
  }
  if(mode==='remove'){
   // output already contains the color-keyed original
  }else if(mode==='color'||mode==='mono'||mode==='keyhalftone'){
   out.data.fill(0);
   const step=effectiveCell;
   for(let y=0;y<c.height;y+=step)for(let x=0;x<c.width;x+=step){
    let rr=0,gg=0,bb=0,ll=0,aa=0,n=0;
    for(let yy=y;yy<Math.min(y+step,c.height);yy++)for(let xx=x;xx<Math.min(x+step,c.width);xx++){
     const i=(yy*c.width+xx)*4,a=src.data[i+3]/255;rr+=src.data[i]*a;gg+=src.data[i+1]*a;bb+=src.data[i+2]*a;ll+=(.299*src.data[i]+.587*src.data[i+1]+.114*src.data[i+2])*a;aa+=a;n++;
    }
    if(!n||aa<.001)continue;
    rr/=aa;gg/=aa;bb/=aa;
    let lum=mode==='mono'?ll/aa:.299*rr+.587*gg+.114*bb;
    lum=Math.max(0,Math.min(255,factor*(lum-128)+128+bright*2.55));
    // In combined mode, keep all subject tones; the background is removed by edge flood-fill,
    // not by deleting white pixels. RGB values are sampled and retained per halftone cell.
    if(mode!=='keyhalftone'&&transparent&&lum>247)continue;
    const radius=Math.min(step*.94,(1-lum/255)*(step*.70)*pointScale),cx=x+step/2,cy=y+step/2;
    if(radius<.35)continue;
    const col=mode==='mono'?ink:[Math.round(rr),Math.round(gg),Math.round(bb)];
    const alpha=Math.round(255*Math.min(1,aa/n));
    for(let yy=Math.max(0,Math.floor(cy-radius-1));yy<Math.min(c.height,Math.ceil(cy+radius+1));yy++)for(let xx=Math.max(0,Math.floor(cx-radius-1));xx<Math.min(c.width,Math.ceil(cx+radius+1));xx++){
     const dx=xx-cx,dy=yy-cy,rx=dx*Math.cos(angle)+dy*Math.sin(angle),ry=-dx*Math.sin(angle)+dy*Math.cos(angle);
     let edge=0;
     if(dotShape==='square')edge=Math.min(radius*.78-Math.abs(rx),radius*.78-Math.abs(ry));
     else if(dotShape==='ellipse')edge=(1-Math.sqrt((rx/(radius*.95))**2+(ry/(radius*.62))**2))*Math.min(radius*.95,radius*.62);
     else if(dotShape==='line')edge=Math.min(radius-Math.abs(rx),Math.max(.6,radius*.22)-Math.abs(ry));
     else edge=radius-Math.hypot(rx,ry);
     // Sub-pixel edge coverage smooths dot boundaries while preserving true alpha.
     const coverage=Math.max(0,Math.min(1,edge+.5));
     if(coverage>0){const i=(yy*c.width+xx)*4;out.data[i]=col[0];out.data[i+1]=col[1];out.data[i+2]=col[2];out.data[i+3]=Math.round(alpha*coverage)}
    }
   }
  }else{
   for(let i=0;i<src.data.length;i+=4){let lum=.299*src.data[i]+.587*src.data[i+1]+.114*src.data[i+2];lum=Math.max(0,Math.min(255,factor*(lum-128)+128+bright*2.55));let r=lum,g=lum,b=lum,a=src.data[i+3];if(mode==='threshold'){const v=lum>=threshold?255:0;if(transparent&&v===255)a=0;r=g=b=v}else if(mode==='posterize'){const v=Math.round(lum/64)*64;r=g=b=v}else if(mode==='original'){r=src.data[i];g=src.data[i+1];b=src.data[i+2]}out.data[i]=r;out.data[i+1]=g;out.data[i+2]=b;out.data[i+3]=a}
  }
  // Garment knockout: dark ink is made transparent so a black garment supplies the black.
  if($('#ht-garment-knockout')?.checked){
   const blackTol=+$('#ht-black-tol').value;
   for(let i=0;i<out.data.length;i+=4){const darkness=Math.max(out.data[i],out.data[i+1],out.data[i+2]);if(darkness<=blackTol)out.data[i+3]=0;}
  }
  // Final alpha cleanup is deliberately LAST: after resize, keying and halftone.
  if($('#ht-clean-alpha')?.checked){const cut=+$('#ht-alpha-cut').value*255/100;for(let i=3;i<out.data.length;i+=4){if(out.data[i]<cut)out.data[i]=0;else out.data[i]=255;}}
  ctx.clearRect(0,0,c.width,c.height);ctx.putImageData(out,0,0);lastHT=c;$('#ht-empty').classList.add('hidden');c.classList.remove('hidden');fitHalftonePreview();
  if($('#ht-tol-v'))$('#ht-tol-v').textContent=tol;if($('#ht-soft-v'))$('#ht-soft-v').textContent=soft;
  if($('#ht-alpha-v'))$('#ht-alpha-v').textContent=$('#ht-alpha-cut').value;if($('#ht-black-v'))$('#ht-black-v').textContent=$('#ht-black-tol').value;
 }catch(err){console.error('CT LAB Halftone render error',err);toast('No se pudo procesar esta imagen. Probá con PNG o JPG.')}
}
function hexRGB(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
function downloadCanvas(canvas,name){canvas.toBlob(blob=>{if(!blob){toast("No se pudo exportar");return}const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}, "image/png")}
function downloadUnderbase(){
 if(!lastHT||!lastHT.width)return toast('Primero procesá una imagen');
 const src=lastHT.getContext('2d',{willReadFrequently:true}).getImageData(0,0,lastHT.width,lastHT.height),w=lastHT.width,h=lastHT.height,mask=new Uint8Array(w*h);
 for(let p=0;p<w*h;p++)mask[p]=src.data[p*4+3]>8?1:0;
 const choke=+($('#ht-choke')?.value||0);let current=mask;
 // Erosión binaria conservadora para contraer la base blanca y evitar halos.
 for(let n=0;n<choke;n++){const next=new Uint8Array(w*h);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(current[i]&&current[i-1]&&current[i+1]&&current[i-w]&&current[i+w])next[i]=1;}current=next;}
 const c=document.createElement('canvas');c.width=w;c.height=h;const cx=c.getContext('2d'),im=cx.createImageData(w,h);for(let p=0;p<w*h;p++){const i=p*4;if(current[p]){im.data[i]=im.data[i+1]=im.data[i+2]=255;im.data[i+3]=255;}}cx.putImageData(im,0,0);downloadCanvas(c,currentName+'-CTLAB-underbase-white.png');
}
function downloadAlphaMask(){if(!lastHT||!lastHT.width)return toast('Primero procesá una imagen');const w=lastHT.width,h=lastHT.height,src=lastHT.getContext('2d').getImageData(0,0,w,h),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),im=x.createImageData(w,h);for(let i=0;i<src.data.length;i+=4){const a=src.data[i+3];im.data[i]=im.data[i+1]=im.data[i+2]=255;im.data[i+3]=a;}x.putImageData(im,0,0);downloadCanvas(c,currentName+'-CTLAB-alpha-mask.png')}
async function downloadHT(){
 if(!currentImage||!lastHT||!lastHT.width)return toast("Primero procesá una imagen");
 try{
  const dpi=Math.max(1,Number($('#ht-dpi')?.value??300));
  const cmW=Math.max(1,Number($('#ht-width-cm')?.value??30));
  const ratio=currentImage.naturalHeight/currentImage.naturalWidth;
  const cmH=$('#ht-lock-ratio')?.checked?cmW*ratio:Math.max(1,Number($('#ht-height-cm')?.value??cmW*ratio));
  let targetW=Math.max(1,Math.round(cmW/2.54*dpi));
  let targetH=Math.max(1,Math.round(cmH/2.54*dpi));
  const maxPixels=30000000,requested=targetW*targetH;
  if(requested>maxPixels){const scale=Math.sqrt(maxPixels/requested);targetW=Math.round(targetW*scale);targetH=Math.round(targetH*scale);}
  const exportCanvas=document.createElement('canvas');
  exportCanvas.width=targetW;exportCanvas.height=targetH;
  const ctx=exportCanvas.getContext('2d');
  if(!ctx)throw new Error('No se pudo crear el lienzo final');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.clearRect(0,0,targetW,targetH);
  ctx.drawImage(lastHT,0,0,targetW,targetH);
  const rawBlob=await new Promise(resolve=>exportCanvas.toBlob(resolve,'image/png'));
  if(!rawBlob)throw new Error('El navegador no pudo generar el PNG');
  const raw=new Uint8Array(await rawBlob.arrayBuffer());
  // Insert standard PNG pHYs metadata: pixels per metre, unit = metre.
  const crc32=bytes=>{let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
  const write32=(a,o,v)=>{a[o]=(v>>>24)&255;a[o+1]=(v>>>16)&255;a[o+2]=(v>>>8)&255;a[o+3]=v&255;};
  const ppm=Math.round(dpi/0.0254),chunk=new Uint8Array(21);
  write32(chunk,0,9);chunk.set([112,72,89,115],4);write32(chunk,8,ppm);write32(chunk,12,ppm);chunk[16]=1;write32(chunk,17,crc32(chunk.subarray(4,17)));
  // PNG signature (8) + IHDR chunk (25) = offset 33.
  const finalBytes=new Uint8Array(raw.length+chunk.length);
  finalBytes.set(raw.subarray(0,33),0);finalBytes.set(chunk,33);finalBytes.set(raw.subarray(33),54);
  const finalBlob=new Blob([finalBytes],{type:'image/png'});
  const url=URL.createObjectURL(finalBlob),a=document.createElement('a');
  a.href=url;a.download=currentName+'-CTLAB.png';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  const effectiveDpi=Math.min(targetW/(cmW/2.54),targetH/(cmH/2.54));
  toast(`PNG exportado: ${targetW} × ${targetH} px · ${Math.round(effectiveDpi)} DPI · metadatos incluidos`);
 }catch(err){console.error('CT LAB export error',err);toast('No se pudo exportar el PNG final. Probá reducir el tamaño o DPI.')}
}
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

// CT LAB PRO v2.1 — tres flujos claros de semitono y cuentagotas real
 document.querySelectorAll('[data-ht-mode]').forEach(b=>b.addEventListener('click',()=>setHTMode(b.dataset.htMode)));
 document.querySelectorAll('[data-ink]').forEach(b=>b.addEventListener('click',()=>{htInk=b.dataset.ink;renderHT();document.querySelectorAll('[data-ink]').forEach(x=>x.classList.toggle('primary',x===b))}));
 ['ht-tol','ht-soft'].forEach(id=>$('#'+id)?.addEventListener('input',renderHT));
 $('#ht-picker')?.addEventListener('click',()=>{htPicking=true;$('#ht-picker').textContent='Ahora tocá el color del fondo';$('#ht-picker').classList.add('primary');$('#ht-canvas').style.cursor='crosshair'});
 $('#ht-canvas')?.addEventListener('click',e=>{if(!htPicking||!currentImage)return;const r=e.currentTarget.getBoundingClientRect(),x=Math.max(0,Math.min(currentImage.naturalWidth-1,Math.floor((e.clientX-r.left)/r.width*currentImage.naturalWidth))),y=Math.max(0,Math.min(currentImage.naturalHeight-1,Math.floor((e.clientY-r.top)/r.height*currentImage.naturalHeight)));const sample=document.createElement('canvas');sample.width=sample.height=1;const sx=sample.getContext('2d',{willReadFrequently:true});sx.drawImage(currentImage,x,y,1,1,0,0,1,1);const d=sx.getImageData(0,0,1,1).data,hex='#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join('');$('#ht-key-color').value=hex;$('#ht-key-label').textContent=hex.toUpperCase();htPicking=false;$('#ht-picker').textContent='⌖ Elegir otro color';$('#ht-picker').classList.remove('primary');$('#ht-canvas').style.cursor='default';renderHT()});
 $('#ht-key-color')?.addEventListener('input',renderHT);$('#ht-apply-remove')?.addEventListener('click',()=>{setHTMode(htToolMode==='keyhalftone'?'keyhalftone':'remove');toast(htToolMode==='keyhalftone'?'Fondo eliminado y semitono aplicado':'Eliminación de fondo aplicada')});
 setHTMode('color');

// CT LAB PRO v2.4 — print sizing, alpha cleanup and garment color integration
$('#ht-cell')?.addEventListener('input',()=>{const dpi=+($('#ht-dpi')?.value||300),cell=Math.max(3,+$('#ht-cell').value);$('#ht-lpi').value=Math.max(20,Math.min(120,Math.round(dpi/cell)));renderHT()});
$('#ht-lpi')?.addEventListener('input',()=>{const dpi=+($('#ht-dpi')?.value||300),lpi=Math.max(20,+$('#ht-lpi').value||45);$('#ht-cell').value=Math.max(3,Math.min(24,Math.round(dpi/lpi)));$('#v-cell').textContent=$('#ht-cell').value;renderHT()});
;['ht-lpi','ht-angle','ht-dot-shape','ht-choke'].forEach(id=>{const el=$('#'+id);if(!el)return;el.addEventListener('input',()=>{if(id==='ht-choke')$('#ht-choke-v').textContent=el.value+' px';renderHT()});el.addEventListener('change',renderHT)});
;['ht-width-cm','ht-height-cm','ht-dpi','ht-lock-ratio','ht-clean-alpha','ht-alpha-cut','ht-garment-knockout','ht-black-tol'].forEach(id=>{const el=$('#'+id);if(!el)return;el.addEventListener('input',()=>{if(id==='ht-width-cm'&&$('#ht-lock-ratio').checked&&currentImage){$('#ht-height-cm').value=(+el.value*currentImage.naturalHeight/currentImage.naturalWidth).toFixed(1)}renderHT()});el.addEventListener('change',renderHT)});


// CT LAB PRO v2.6 — reliable preview background + full-image fit (display only; export pixels unchanged)
(function(){
 const wrap=document.getElementById('ht-canvas-wrap');
 const picker=document.getElementById('ht-preview-bg');
 const checker=document.getElementById('ht-preview-checker');
 const zoomOut=document.getElementById('ht-zoom-out');
 const zoomIn=document.getElementById('ht-zoom-in');
 const zoomFit=document.getElementById('ht-zoom-fit');
 const zoomValue=document.getElementById('ht-zoom-value');
 if(!wrap||!picker||!checker)return;
 let zoom=1,fitScale=1;
 const checkerStyle='linear-gradient(45deg,#d9d8d2 25%,transparent 25%),linear-gradient(-45deg,#d9d8d2 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d9d8d2 75%),linear-gradient(-45deg,transparent 75%,#d9d8d2 75%)';
 function setPreviewColor(color){
  wrap.style.setProperty('background-image','none','important');
  wrap.style.setProperty('background-color',color,'important');
  wrap.dataset.previewMode='color';
  checker.classList.remove('primary');
 }
 picker.addEventListener('input',()=>setPreviewColor(picker.value));
 checker.addEventListener('click',()=>{
  wrap.style.setProperty('background-color','#f1f0eb','important');
  wrap.style.setProperty('background-image',checkerStyle,'important');
  wrap.dataset.previewMode='checker';
  checker.classList.add('primary');
 });
 setPreviewColor(picker.value||'#777777');
 function applyZoom(){
  const canvas=document.getElementById('ht-canvas');
  if(!canvas||!canvas.width||!canvas.height)return;
  const displayScale=fitScale*zoom;
  canvas.style.width=Math.max(1,Math.round(canvas.width*displayScale))+'px';
  canvas.style.height=Math.max(1,Math.round(canvas.height*displayScale))+'px';
  if(zoomValue)zoomValue.textContent=zoom===1?'Ajustar':Math.round(zoom*100)+'%';
  if(zoom<=1){wrap.scrollTop=0;wrap.scrollLeft=0}
 }
 window.fitHalftonePreview=function(){
  const canvas=document.getElementById('ht-canvas');
  if(!canvas||!canvas.width||!canvas.height||!wrap.clientWidth||!wrap.clientHeight)return;
  const availableW=Math.max(80,wrap.clientWidth-40);
  const availableH=Math.max(80,wrap.clientHeight-82);
  fitScale=Math.min(availableW/canvas.width,availableH/canvas.height);
  applyZoom();
 };
 zoomOut?.addEventListener('click',()=>{zoom=Math.max(.25,Math.round((zoom-.1)*100)/100);applyZoom()});
 zoomIn?.addEventListener('click',()=>{zoom=Math.min(5,Math.round((zoom+.1)*100)/100);applyZoom()});
 zoomFit?.addEventListener('click',()=>{zoom=1;window.fitHalftonePreview()});
 if('ResizeObserver' in window){new ResizeObserver(()=>window.fitHalftonePreview()).observe(wrap)}
 window.addEventListener('resize',()=>window.fitHalftonePreview());
})();


// CT AI Assistant: genera un informe portable y exporta la imagen original por separado.
async function generateAIAssistantPackage(){
  if(!currentImage || !currentImage.src){toast("Primero abrí una imagen en CT LAB");return;}
  const task=document.querySelector("#ai-task")?.value||"restoration";
  const taskNames={restoration:"Restauración y mejora de imagen",background:"Eliminación inteligente de fondo",separation:"Separación y análisis de colores",cleanup:"Limpieza y reconstrucción de estampa",garment:"Preparación para prenda negra o de color"};
  const report={
    application:"CT LAB — CT AI Assistant",
    packageVersion:"3.1",
    createdAt:new Date().toISOString(),
    workflow:"Asistencia externa mediante ChatGPT; no se realiza carga automática ni conexión a servicios externos.",
    task:taskNames[task]||task,
    garment:document.querySelector("#ai-garment")?.value||"Sin especificar",
    targetResolution:document.querySelector("#ai-dpi")?.value||"Definir después",
    targetPhysicalSize:document.querySelector("#ai-size")?.value||"No especificada",
    instructions:document.querySelector("#ai-notes")?.value||"",
    sourceImage:{name:currentName,width:currentImage.naturalWidth,height:currentImage.naturalHeight,format:"imagen original del usuario"},
    requirements:["Conservar composición, textos, personajes y colores salvo indicación explícita.","No inventar elementos ni redibujar la identidad de la estampa.","Entregar PNG con transparencia cuando corresponda.","Informar cualquier reconstrucción aproximada realizada por IA.","Mantener proporciones y documentar dimensiones finales."],
    returnChecklist:["Imagen procesada en PNG","Máscara alfa o máscara de separación si corresponde","Dimensiones en píxeles y centímetros","DPI objetivo y DPI efectivo","Notas sobre detalles reconstruidos o modificados"]
  };
  const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="CT-AI-brief-"+Date.now()+".json";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  const imageUrl=currentImage.src;
  const ext=/\.jpe?g/i.test(currentName)?"jpg":/\.webp/i.test(currentName)?"webp":"png";
  const b=document.createElement("a");b.href=imageUrl;b.download="CT-AI-original-"+Date.now()+"."+ext;b.click();
  const status=document.querySelector("#ai-status");
  if(status)status.textContent="Paquete generado: se descargaron el informe JSON y la imagen original por separado. Adjuntá ambos archivos en tu conversación de ChatGPT.";
  toast("Informe e imagen original preparados");
}
document.querySelector("#ai-generate")?.addEventListener("click",generateAIAssistantPackage);
