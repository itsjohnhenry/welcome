import {makePDF} from './paint-pdf.js?v=pixel-1';
import {pageFrame,imagePlacement,drawPlaced} from './image-layout.js';
const isPixel=document.body.dataset.tool==='pixel';
const $=id=>document.getElementById(id),sheet=$('sheet'),ctx=sheet.getContext('2d');
let image=null,result=null,worker=null,view='image',loadID=0,drag=null,reference=null;
const page=()=> $('orientation').value==='portrait'?{width:297,height:420}:{width:420,height:297};
function layout(){return pageFrame(page(),isPixel,Number($('detail').value)||40);}
function frame(){const f=layout(),scale=sheet.width/page().width;return {...f,x:f.x*scale,y:f.y*scale,w:f.w*scale,h:f.h*scale};}
function transform(){return {angle:Number($('rotation').value),zoom:Number($('scale').value),x:Number($('move-x').value),y:Number($('move-y').value)};}
function message(text){$('message').textContent=text;}
function chooseView(next){view=next;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));sheet.setAttribute('aria-label',view==='image'?'A3 image placement preview':view==='outline'?'Numbered painting pattern':'Simplified colour reference');sheet.style.cursor=view==='image'&&image?'grab':'default';draw();}
function invalidate(){worker?.terminate();worker=null;result=null;reference=null;$('generate').disabled=false;$('download').disabled=false;$('download-area').hidden=true;document.querySelectorAll('[data-view]').forEach(b=>{if(b.dataset.view!=='image')b.disabled=true;});chooseView('image');}
function draw(){
  const p=page();sheet.width=p.width*3;sheet.height=p.height*3;const f=frame();ctx.fillStyle='white';ctx.fillRect(0,0,sheet.width,sheet.height);
  if(view==='image'){
    if(image){ctx.save();ctx.beginPath();ctx.rect(f.x,f.y,f.w,f.h);ctx.clip();drawPlaced(ctx,image,f,transform());ctx.restore();}
    ctx.strokeStyle='#aaa';ctx.lineWidth=1.5;ctx.setLineDash([7,7]);ctx.strokeRect(f.x,f.y,f.w,f.h);ctx.setLineDash([]);
  }else if(result){
    const sx=f.w/result.w,sy=f.h/result.h;
    if(view==='colour'){ctx.imageSmoothingEnabled=false;ctx.drawImage(reference,f.x,f.y,f.w,f.h);ctx.imageSmoothingEnabled=true;}
    else {ctx.strokeStyle='#777';ctx.lineWidth=.65;ctx.beginPath();for(const [x,y,x2,y2] of result.lines){ctx.moveTo(f.x+x*sx,f.y+y*sy);ctx.lineTo(f.x+x2*sx,f.y+y2*sy);}ctx.stroke();ctx.fillStyle='#444';ctx.textAlign='center';ctx.textBaseline='middle';for(const l of result.labels){const size=isPixel?Math.max(5,Math.min(10,sx*.42)):Math.max(5,Math.min(10,l.clearance*sx*1.15/(l.colour>=9?1.3:1)));ctx.font=`${size}px Arial`;ctx.fillText(l.colour+1,f.x+l.x*sx,f.y+l.y*sy);}}
  }
  if(isPixel){const grid=layout(),sx=f.w/grid.cols,sy=f.h/grid.rows;ctx.strokeStyle='#aaa';ctx.lineWidth=.5;ctx.beginPath();for(let x=0;x<=grid.cols;x++){ctx.moveTo(f.x+x*sx,f.y);ctx.lineTo(f.x+x*sx,f.y+f.h);}for(let y=0;y<=grid.rows;y++){ctx.moveTo(f.x,f.y+y*sy);ctx.lineTo(f.x+f.w,f.y+y*sy);}ctx.stroke();ctx.fillStyle='#333';ctx.font=Math.min(10,sx*.45)+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';for(let x=0;x<grid.cols;x++)ctx.fillText(x+1,f.x+(x+.5)*sx,f.y-10);ctx.textAlign='right';for(let y=0;y<grid.rows;y++)ctx.fillText(y+1,f.x-8,f.y+(y+.5)*sy);}
  ctx.fillStyle='#666';ctx.font='9px Arial';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillText('A3 · Print at 100% / actual size',f.x,sheet.height-18);
  $('page-size').textContent=`${p.width} × ${p.height} mm`;
}
function resetPosition(fill=false){$('move-x').value=0;$('move-y').value=0;const fillScale=imagePlacement(image,frame(),transform()).fillZoom;$('scale').max=Math.max(300,fillScale);$('scale').value=fill?fillScale:100;$('scale-value').textContent=$('scale').value+'%';}
$('upload').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;const token=++loadID;invalidate();
  if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)){message('Please choose a JPG, PNG, WebP or AVIF image.');return;}
  if(file.size>20*1024*1024){message('Choose an image smaller than 20 MB.');return;}
  message('Opening image…');
  try{
    let next=await createImageBitmap(file);if(Math.max(next.width,next.height)>2400){const ratio=2400/Math.max(next.width,next.height);const smaller=await createImageBitmap(next,{resizeWidth:Math.round(next.width*ratio),resizeHeight:Math.round(next.height*ratio),resizeQuality:'high'});next.close();next=smaller;}
    if(token!==loadID){next.close();return;}image?.close();image=next;$('rotation').value=0;$('rotation-value').textContent='0°';$('settings').disabled=false;$('empty').hidden=true;resetPosition();draw();message('Move or resize your image, then make the pattern.');
  }catch{if(token===loadID)message('This image could not be opened. Try saving it as a JPG or PNG.');}
});
for(const id of ['scale','move-x','move-y','colours','detail','rotation'])$(id).addEventListener('input',()=>{invalidate();$('rotation-value').textContent=$('rotation').value+'°';$('scale-value').textContent=$('scale').value+'%';$('colours-value').textContent=$('colours').value;message('Settings changed. Make the pattern when you are ready.');});
for(const [id,delta] of [['rotate-left',-90],['rotate-right',90]])$(id).addEventListener('click',()=>{let angle=Number($('rotation').value)+delta;angle=((angle+180)%360+360)%360-180;$('rotation').value=angle;$('rotation-value').textContent=angle+'°';invalidate();message('Image rotated. Make the pattern when you are ready.');});
$('orientation').addEventListener('change',()=>{invalidate();resetPosition();draw();message('Page turned. Check the image position, then make the pattern.');});
for(const [id,fill] of [['fit',false],['fill',true]])$(id).addEventListener('click',()=>{invalidate();resetPosition(fill);draw();message('Image repositioned. Make the pattern when you are ready.');});
$('clear').addEventListener('click',()=>{loadID++;invalidate();image?.close();image=null;$('upload').value='';$('settings').disabled=true;$('empty').hidden=false;draw();message('Choose an image to begin.');});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>chooseView(b.dataset.view)));
sheet.addEventListener('pointerdown',e=>{if(!image||view!=='image')return;invalidate();const r=sheet.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,px:Number($('move-x').value),py:Number($('move-y').value),sx:sheet.width/r.width,sy:sheet.height/r.height};sheet.setPointerCapture(e.pointerId);sheet.classList.add('dragging');});
sheet.addEventListener('pointermove',e=>{if(!drag)return;const f=frame();$('move-x').value=Math.max(-100,Math.min(100,drag.px+(e.clientX-drag.x)*drag.sx/f.w*100));$('move-y').value=Math.max(-100,Math.min(100,drag.py+(e.clientY-drag.y)*drag.sy/f.h*100));draw();});
function stopDrag(){if(!drag)return;drag=null;sheet.classList.remove('dragging');message('Image moved. Make the pattern when you are ready.');}sheet.addEventListener('pointerup',stopDrag);sheet.addEventListener('pointercancel',stopDrag);
$('generate').addEventListener('click',()=>{
  if(!image)return;invalidate();message('Finding colours and simplifying shapes…');$('generate').disabled=true;
  const p=page(),f=layout(),ratio=f.w/f.h,edge=$('detail').value==='fine'?1320:440,w=isPixel?f.cols:ratio>1?edge:Math.round(edge*ratio),h=isPixel?f.rows:ratio>1?Math.round(edge/ratio):edge;
  const input=document.createElement('canvas');input.width=w;input.height=h;const c=input.getContext('2d',{willReadFrequently:true});
  drawPlaced(c,image,{x:0,y:0,w,h},transform());
  const rgba=c.getImageData(0,0,w,h).data;
  // Composite translucent image pixels on white; empty paper stays outside the pattern.
  for(let i=0;i<rgba.length;i+=4)if(rgba[i+3]>127){const a=rgba[i+3]/255;for(let j=0;j<3;j++)rgba[i+j]=Math.round(rgba[i+j]*a+255*(1-a));rgba[i+3]=255;}
  try{worker=new Worker(new URL('./paint-worker.js?v=pixel-1',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{worker?.terminate();worker=null;$('generate').disabled=false;if(data.error){message(data.error);return;}result=data.result;result.pixel=isPixel;result.frame=f;reference=document.createElement('canvas');reference.width=w;reference.height=h;const rc=reference.getContext('2d'),pixels=rc.createImageData(w,h);for(let i=0;i<result.ids.length;i++){const colour=result.ids[i]<0?[255,255,255]:result.colours[result.ids[i]];pixels.data.set([...colour,255],i*4);}rc.putImageData(pixels,0,0);
      $('colour-key').replaceChildren(...result.colours.map((c,i)=>{const item=document.createElement('div');item.className='key-chip';const swatch=document.createElement('i');swatch.style.background=`rgb(${c.join(',')})`;swatch.setAttribute('aria-hidden','true');item.append(swatch,document.createTextNode(`${i+1} · #${c.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase()}`));return item;}));
      document.querySelectorAll('[data-view]').forEach(b=>b.disabled=false);$('download-area').hidden=false;chooseView('outline');const tiny=result.labels.filter(l=>l.clearance*(p.width-24)/w<1.2).length;message(isPixel?`Ready: ${w} columns × ${h} rows, ${result.colours.length} colours.`:`Ready: ${result.colours.length} colours and ${result.labels.length} shapes.${tiny?' Some spaces are small; choose larger shapes if the numbers are hard to read.':''}`);
    };worker.onerror=()=>{worker?.terminate();worker=null;$('generate').disabled=false;message('The pattern could not be made. Try a smaller image or fewer colours.');};worker.postMessage({rgba,w,h,count:Number($('colours').value),detail:isPixel?'pixel':$('detail').value},[rgba.buffer]);
  }catch{$('generate').disabled=false;message('Your browser could not start the image tool. Try a current version of Chrome, Firefox, Edge or Safari.');}
});
$('download').addEventListener('click',async()=>{if(!result)return;const current=result,p=page();$('download').disabled=true;message('Preparing your A3 PDF…');try{const pdf=await makePDF(current,p);if(current!==result)return;const url=URL.createObjectURL(pdf),a=document.createElement('a');a.href=url;a.download=isPixel?'pixel-art-a3.pdf':'paint-by-numbers-a3.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);message('PDF ready. Print on A3 at 100% / actual size.');}catch{message('The PDF could not be created. Please try again.');}finally{$('download').disabled=false;}});
draw();
