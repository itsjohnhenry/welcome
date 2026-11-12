export function pageFrame(page,pixel=false,edge=40){
  const margin=pixel?20:12,availableW=page.width-margin*2,availableH=page.height-(pixel?40:30);
  if(!pixel)return {x:margin,y:12,w:availableW,h:availableH};
  const ratio=availableW/availableH,cols=ratio>1?edge:Math.max(1,Math.round(edge*ratio)),rows=ratio>1?Math.max(1,Math.round(edge/ratio)):edge;
  const cell=Math.min(availableW/cols,availableH/rows),w=cols*cell,h=rows*cell;
  return {x:(page.width-w)/2,y:20+(availableH-h)/2,w,h,cols,rows,cell};
}
export function imagePlacement(image,f,{angle=0,zoom=100,x=0,y=0}={}){
  const radians=angle*Math.PI/180,c=Math.abs(Math.cos(radians)),s=Math.abs(Math.sin(radians));
  const bw=image.width*c+image.height*s,bh=image.width*s+image.height*c;
  const fit=Math.min(f.w/bw,f.h/bh),scale=fit*zoom/100;
  const fill=Math.max((f.w*c+f.h*s)/image.width,(f.w*s+f.h*c)/image.height);
  return {cx:f.x+f.w/2+x*f.w/100,cy:f.y+f.h/2+y*f.h/100,w:image.width*scale,h:image.height*scale,radians,fillZoom:Math.ceil(fill/fit*100)};
}
export function drawPlaced(ctx,image,f,settings){const p=imagePlacement(image,f,settings);ctx.save();ctx.translate(p.cx,p.cy);ctx.rotate(p.radians);ctx.drawImage(image,-p.w/2,-p.h/2,p.w,p.h);ctx.restore();}
