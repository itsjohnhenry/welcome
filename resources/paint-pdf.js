// Small, dependency-free PDF writer. Outlines and numbers remain sharp at A3.
const pt=72/25.4,enc=new TextEncoder(),f=n=>Number(n.toFixed(3));
const escape=s=>s.replace(/[^\x20-\x7e]/g,'').replace(/([\\()])/g,'\\$1');
export async function makePDF(result,page){
  const {w,h,ids,colours,labels,lines}=result,W=page.width*pt,H=page.height*pt;
  const left=12*pt,top=12*pt,dw=(page.width-24)*pt,dh=(page.height-30)*pt,s=dw/w,sy=dh/h;
  const text=(x,y,size,str)=>`BT /F1 ${f(size)} Tf 1 0 0 1 ${f(x)} ${f(y)} Tm (${escape(str)}) Tj ET\n`;
  let outline='0.38 G 0.35 w\n';for(const [x,y,x2,y2] of lines)outline+=`${f(left+x*s)} ${f(H-top-y*sy)} m ${f(left+x2*s)} ${f(H-top-y2*sy)} l\n`;outline+='S\n0.25 g\n';
  for(const label of labels){const num=String(label.colour+1),size=Math.max(4,Math.min(8,label.clearance*s*1.15/(num.length>1?1.3:1)));outline+=text(left+label.x*s-size*.278*num.length,H-top-label.y*sy-size*.34,size,num);}
  outline+='0.35 g\n'+text(left,9*pt,8,'Paint by numbers | A3 | Print at 100% / actual size | Blank areas stay unpainted');
  const rgb=new Uint8Array(w*h*3);for(let p=0;p<ids.length;p++){const c=ids[p]<0?[255,255,255]:colours[ids[p]];rgb.set(c,p*3);}
  let image=rgb,filter='';if(typeof CompressionStream!=='undefined'){image=new Uint8Array(await new Response(new Blob([rgb]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());filter='/Filter /FlateDecode ';}
  const keyRows=Math.ceil(colours.length/4),keyHeight=keyRows*17*pt+35*pt;
  const refMaxW=dw,refMaxH=H-38*pt-keyHeight,refScale=Math.min(refMaxW/w,refMaxH/h),rw=w*refScale,rh=h*refScale,rx=(W-rw)/2,ry=H-30*pt-rh;
  let reference='0 g\n'+text(left,H-18*pt,16,'Your colour reference')+`q ${f(rw)} 0 0 ${f(rh)} ${f(rx)} ${f(ry)} cm /Im1 Do Q\n`;
  const ky=ry-18*pt,colWidth=dw/4;
  colours.forEach((c,k)=>{const x=left+(k%4)*colWidth,y=ky-Math.floor(k/4)*17*pt;reference+=`${c.map(v=>f(v/255)).join(' ')} rg ${f(x)} ${f(y)} ${f(10*pt)} ${f(10*pt)} re f\n0.3 G 0.4 w ${f(x)} ${f(y)} ${f(10*pt)} ${f(10*pt)} re S\n0 g\n`;reference+=text(x+13*pt,y+4*pt,10,String(k+1));reference+=text(x+21*pt,y+4*pt,7,'#'+c.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase());});
  reference+='0.35 g\n'+text(left,15*pt,8,'Use these colours as a guide. Screen and printed colours may differ from your paint.')+text(left,10*pt,8,'johnhenry.com.au');
  const bytes=s=>enc.encode(s),stream=(data,extra='')=>{const a=typeof data==='string'?bytes(data):data;return concat([bytes(`<< ${extra}/Length ${a.length} >>\nstream\n`),a,bytes('\nendstream')]);};
  const objects=[bytes('<< /Type /Catalog /Pages 2 0 R >>'),bytes('<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>'),bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(W)} ${f(H)}] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>`),bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(W)} ${f(H)}] /Resources << /Font << /F1 5 0 R >> /XObject << /Im1 8 0 R >> >> /Contents 7 0 R >>`),bytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),stream(outline),stream(reference),stream(image,`/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 ${filter}`)];
  const parts=[bytes('%PDF-1.4\n')],offsets=[0];let length=parts[0].length;
  objects.forEach((o,i)=>{offsets.push(length);const part=concat([bytes(`${i+1} 0 obj\n`),o,bytes('\nendobj\n')]);parts.push(part);length+=part.length;});
  let trailer=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(const offset of offsets.slice(1))trailer+=`${String(offset).padStart(10,'0')} 00000 n \n`;trailer+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`;parts.push(bytes(trailer));return new Blob(parts,{type:'application/pdf'});
}
function concat(parts){const out=new Uint8Array(parts.reduce((s,p)=>s+p.length,0));let n=0;for(const p of parts){out.set(p,n);n+=p.length;}return out;}
