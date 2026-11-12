import {makePDF} from './paint-pdf.js';
const $=id=>document.getElementById(id),sheet=$('sheet'),ctx=sheet.getContext('2d');
let image=null,result=null,worker=null,view='image',loadID=0,drag=null,reference=null;
const page=()=> $('orientation').value==='portrait'?{width:297,height:420}:{width:420,height:297};
function frame(){const p=page(),scale=sheet.width/p.width;return {x:12*scale,y:12*scale,w:(p.width-24)*scale,h:(p.height-30)*scale};}
function placement(f){const base=Math.min(f.w/image.width,f.h/image.height),scale=base*Number($('scale').value)/100,w=image.width*scale,h=image.height*scale;return {x:f.x+(f.w-w)/2+Number($('move-x').value)*f.w/100,y:f.y+(f.h-h)/2+Number($('move-y').value)*f.h/100,w,h};}
function message(text){$('message').textContent=text;}
function chooseView(next){view=next;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));sheet.setAttribute('aria-label',view==='image'?'A3 image placement preview':view==='outline'?'Numbered painting pattern':'Simplified colour reference');sheet.style.cursor=view==='image'&&image?'grab':'default';draw();}
function invalidate(){worker?.terminate();worker=null;result=null;reference=null;$('generate').disabled=false;$('download').disabled=false;$('download-area').hidden=true;document.querySelectorAll('[data-view]').forEach(b=>{if(b.dataset.view!=='image')b.disabled=true;});chooseView('image');}
function draw(){
  const p=page();sheet.width=p.width*3;sheet.height=p.height*3;const f=frame();ctx.fillStyle='white';ctx.fillRect(0,0,sheet.width,sheet.height);
  if(view==='image'){
    if(image){const pos=placement(f);ctx.save();ctx.beginPath();ctx.rect(f.x,f.y,f.w,f.h);ctx.clip();ctx.drawImage(image,pos.x,pos.y,pos.w,pos.h);ctx.restore();}
    ctx.strokeStyle='#aaa';ctx.lineWidth=1.5;ctx.setLineDash([7,7]);ctx.strokeRect(f.x,f.y,f.w,f.h);ctx.setLineDash([]);
  }else if(result){
    const sx=f.w/result.w,sy=f.h/result.h;
    if(view==='colour'){ctx.imageSmoothingEnabled=false;ctx.drawImage(reference,f.x,f.y,f.w,f.h);ctx.imageSmoothingEnabled=true;}
    else {ctx.strokeStyle='#777';ctx.lineWidth=.65;ctx.beginPath();for(const [x,y,x2,y2] of result.lines){ctx.moveTo(f.x+x*sx,f.y+y*sy);ctx.lineTo(f.x+x2*sx,f.y+y2*sy);}ctx.stroke();ctx.fillStyle='#444';ctx.textAlign='center';ctx.textBaseline='middle';for(const l of result.labels){const size=Math.max(5,Math.min(10,l.clearance*sx*1.15/(l.colour>=9?1.3:1)));ctx.font=`${size}px Arial`;ctx.fillText(l.colour+1,f.x+l.x*sx,f.y+l.y*sy);}}
  }
  ctx.fillStyle='#666';ctx.font='9px Arial';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillText('A3 · Print at 100% / actual size',f.x,sheet.height-18);
  $('page-size').textContent=`${p.width} × ${p.height} mm`;
}
function resetPosition(fill=false){$('move-x').value=0;$('move-y').value=0;const f=frame(),fillScale=Math.ceil(Math.max(f.w/image.width,f.h/image.height)/Math.min(f.w/image.width,f.h/image.height)*100);$('scale').max=Math.max(300,fillScale);$('scale').value=fill?fillScale:100;$('scale-value').textContent=$('scale').value+'%';}
$('upload').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;const token=++loadID;invalidate();
  if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)){message('Please choose a JPG, PNG, WebP or AVIF image.');return;}
  if(file.size>20*1024*1024){message('Choose an image smaller than 20 MB.');return;}
  message('Opening image…');
  try{
    let next=await createImageBitmap(file);if(Math.max(next.width,next.height)>2400){const ratio=2400/Math.max(next.width,next.height);const smaller=await createImageBitmap(next,{resizeWidth:Math.round(next.width*ratio),resizeHeight:Math.round(next.height*ratio),resizeQuality:'high'});next.close();next=smaller;}
    if(token!==loadID){next.close();return;}image?.close();image=next;$('settings').disabled=false;$('empty').hidden=true;resetPosition();draw();message('Move or resize your image, then make the pattern.');
  }catch{if(token===loadID)message('This image could not be opened. Try saving it as a JPG or PNG.');}
});
for(const id of ['scale','move-x','move-y','colours','detail'])$(id).addEventListener('input',()=>{invalidate();$('scale-value').textContent=$('scale').value+'%';$('colours-value').textContent=$('colours').value;message('Settings changed. Make the pattern when you are ready.');});
$('orientation').addEventListener('change',()=>{invalidate();resetPosition();draw();message('Page turned. Check the image position, then make the pattern.');});
for(const [id,fill] of [['fit',false],['fill',true]])$(id).addEventListener('click',()=>{invalidate();resetPosition(fill);draw();message('Image repositioned. Make the pattern when you are ready.');});
$('clear').addEventListener('click',()=>{loadID++;invalidate();image?.close();image=null;$('upload').value='';$('settings').disabled=true;$('empty').hidden=false;draw();message('Choose an image to begin.');});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>chooseView(b.dataset.view)));
sheet.addEventListener('pointerdown',e=>{if(!image||view!=='image')return;invalidate();const r=sheet.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,px:Number($('move-x').value),py:Number($('move-y').value),sx:sheet.width/r.width,sy:sheet.height/r.height};sheet.setPointerCapture(e.pointerId);sheet.classList.add('dragging');});
sheet.addEventListener('pointermove',e=>{if(!drag)return;const f=frame();$('move-x').value=Math.max(-100,Math.min(100,drag.px+(e.clientX-drag.x)*drag.sx/f.w*100));$('move-y').value=Math.max(-100,Math.min(100,drag.py+(e.clientY-drag.y)*drag.sy/f.h*100));draw();});
function stopDrag(){if(!drag)return;drag=null;sheet.classList.remove('dragging');message('Image moved. Make the pattern when you are ready.');}sheet.addEventListener('pointerup',stopDrag);sheet.addEventListener('pointercancel',stopDrag);
$('generate').addEventListener('click',()=>{
  if(!image)return;invalidate();message('Finding colours and simplifying shapes…');$('generate').disabled=true;
  const p=page(),ratio=(p.width-24)/(p.height-30),w=ratio>1?440:Math.round(440*ratio),h=ratio>1?Math.round(440/ratio):440;
  const input=document.createElement('canvas');input.width=w;input.height=h;const c=input.getContext('2d',{willReadFrequently:true}),f=frame(),pos=placement(f);
  c.drawImage(image,(pos.x-f.x)/f.w*w,(pos.y-f.y)/f.h*h,pos.w/f.w*w,pos.h/f.h*h);
  const rgba=c.getImageData(0,0,w,h).data;
  // Composite translucent image pixels on white; empty paper stays outside the pattern.
  for(let i=0;i<rgba.length;i+=4)if(rgba[i+3]>127){const a=rgba[i+3]/255;for(let j=0;j<3;j++)rgba[i+j]=Math.round(rgba[i+j]*a+255*(1-a));rgba[i+3]=255;}
  try{worker=new Worker(new URL('./paint-worker.js',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{worker?.terminate();worker=null;$('generate').disabled=false;if(data.error){message(data.error);return;}result=data.result;reference=document.createElement('canvas');reference.width=w;reference.height=h;const rc=reference.getContext('2d'),pixels=rc.createImageData(w,h);for(let i=0;i<result.ids.length;i++){const colour=result.ids[i]<0?[255,255,255]:result.colours[result.ids[i]];pixels.data.set([...colour,255],i*4);}rc.putImageData(pixels,0,0);
      $('colour-key').replaceChildren(...result.colours.map((c,i)=>{const item=document.createElement('div');item.className='key-chip';const swatch=document.createElement('i');swatch.style.background=`rgb(${c.join(',')})`;swatch.setAttribute('aria-hidden','true');item.append(swatch,document.createTextNode(`${i+1} · #${c.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase()}`));return item;}));
      document.querySelectorAll('[data-view]').forEach(b=>b.disabled=false);$('download-area').hidden=false;chooseView('outline');const tiny=result.labels.filter(l=>l.clearance<3).length;message(`Ready: ${result.colours.length} colours and ${result.labels.length} shapes.${tiny?' Some spaces are small; choose larger shapes if the numbers are hard to read.':''}`);
    };worker.onerror=()=>{worker?.terminate();worker=null;$('generate').disabled=false;message('The pattern could not be made. Try a smaller image or fewer colours.');};worker.postMessage({rgba,w,h,count:Number($('colours').value),detail:$('detail').value},[rgba.buffer]);
  }catch{$('generate').disabled=false;message('Your browser could not start the image tool. Try a current version of Chrome, Firefox, Edge or Safari.');}
});
$('download').addEventListener('click',async()=>{if(!result)return;const current=result,p=page();$('download').disabled=true;message('Preparing your A3 PDF…');try{const pdf=await makePDF(current,p);if(current!==result)return;const url=URL.createObjectURL(pdf),a=document.createElement('a');a.href=url;a.download='paint-by-numbers-a3.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);message('PDF ready. Print on A3 at 100% / actual size.');}catch{message('The PDF could not be created. Please try again.');}finally{$('download').disabled=false;}});
draw();
