// Pure image processing: used in a worker so large pictures do not block the controls.
const distance=(a,b)=>.3*(a[0]-b[0])**2+.59*(a[1]-b[1])**2+.11*(a[2]-b[2])**2;
export function regionsOf(ids,w,h){
  const seen=new Int32Array(ids.length).fill(-1),queue=new Int32Array(ids.length),regions=[];
  for(let start=0;start<ids.length;start++){
    if(ids[start]<0||seen[start]>=0)continue;
    const id=regions.length,colour=ids[start],pixels=[];let head=0,tail=1;queue[0]=start;seen[start]=id;
    while(head<tail){const p=queue[head++];pixels.push(p);const x=p%w,y=Math.floor(p/w);
      for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(n>=0&&seen[n]<0&&ids[n]===colour){seen[n]=id;queue[tail++]=n;}
    }regions.push({colour,pixels});
  }return {regions,map:seen};
}
export function processImage({rgba,w,h,count=10,detail='balanced'}){
  const samples=[];const stride=Math.max(1,Math.floor(w*h/12000));
  for(let i=0;i<w*h;i+=stride)if(rgba[i*4+3]>127)samples.push([rgba[i*4],rgba[i*4+1],rgba[i*4+2]]);
  if(!samples.length)throw new Error('Move the image into the frame before making a pattern.');
  const palette=[samples[Math.floor(samples.length/2)].slice()];
  for(let k=1;k<count;k++){let far=0,best=null;for(const s of samples){const d=Math.min(...palette.map(c=>distance(s,c)));if(d>far){far=d;best=s;}}if(far<4)break;palette.push(best.slice());}
  for(let iter=0;iter<12;iter++){
    const sums=palette.map(()=>[0,0,0,0]);for(const s of samples){let best=0,dist=Infinity;palette.forEach((c,k)=>{const d=distance(s,c);if(d<dist){dist=d;best=k;}});for(let c=0;c<3;c++)sums[best][c]+=s[c];sums[best][3]++;}
    palette.forEach((c,k)=>{if(sums[k][3])for(let j=0;j<3;j++)c[j]=sums[k][j]/sums[k][3];});
  }
  palette.sort((a,b)=>(.3*a[0]+.59*a[1]+.11*a[2])-(.3*b[0]+.59*b[1]+.11*b[2]));palette.forEach(c=>c.forEach((v,j)=>c[j]=Math.round(v)));
  let ids=new Int16Array(w*h).fill(-1);
  for(let i=0;i<ids.length;i++)if(rgba[i*4+3]>127){const s=[rgba[i*4],rgba[i*4+1],rgba[i*4+2]];let best=0,d=Infinity;palette.forEach((c,k)=>{const n=distance(c,s);if(n<d){d=n;best=k;}});ids[i]=best;}
  // Majority filtering reduces isolated pixels without spreading into blank paper.
  for(let pass=0;pass<(detail==='fine'||detail==='pixel'?0:3);pass++){
    const out=ids.slice();for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let p=y*w+x;if(ids[p]<0)continue;const freq=new Uint8Array(palette.length);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const c=ids[p+dy*w+dx];if(c>=0)freq[c]++;}let best=ids[p];for(let k=0;k<freq.length;k++)if(freq[k]>freq[best])best=k;out[p]=best;}ids=out;
  }
  const minArea=detail==='simple'?150:detail==='fine'?36:70;
  // Merge small connected pieces into a touching colour. Recompute after each pass.
  for(let pass=0;pass<(detail==='pixel'?0:8);pass++){
    const {regions,map}=regionsOf(ids,w,h);let changes=0;
    for(let r=0;r<regions.length;r++){
      const reg=regions[r];
      // A long, thin sliver may have many pixels but still leave no room for a number.
      const hasLabelSpace=reg.pixels.some(p=>{const x=p%w,y=Math.floor(p/w);if(x<2||x>w-3||y<2||y>h-3)return false;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(ids[p+dy*w+dx]!==reg.colour)return false;return true;});
      if(reg.pixels.length>=minArea&&hasLabelSpace)continue;
      const neighbours=new Map();for(const p of reg.pixels){const x=p%w,y=Math.floor(p/w);for(const n of [x?p-1:-1,x<w-1?p+1:-1,y?p-w:-1,y<h-1?p+w:-1])if(n>=0&&ids[n]>=0&&map[n]!==r)neighbours.set(ids[n],(neighbours.get(ids[n])||0)+1);}
      let best=-1,score=Infinity;for(const [c,touches] of neighbours){if(c===reg.colour)continue;const d=(distance(palette[c],palette[reg.colour])+100)/(1+Math.log(1+touches));if(d<score){score=d;best=c;}}
      if(best>=0){for(const p of reg.pixels)ids[p]=best;changes++;}
    }if(!changes)break;
  }
  const used=[...new Set(ids)].filter(c=>c>=0).sort((a,b)=>a-b),lookup=new Map(used.map((c,i)=>[c,i]));
  for(let p=0;p<ids.length;p++)if(ids[p]>=0)ids[p]=lookup.get(ids[p]);
  const colours=used.map(c=>palette[c]);const {regions,map}=regionsOf(ids,w,h);
  // Distance to each region's edge finds an interior position for its number.
  const dist=new Uint16Array(ids.length),queue=new Int32Array(ids.length);let head=0,tail=0;
  for(let p=0;p<ids.length;p++){if(ids[p]<0)continue;const x=p%w,y=Math.floor(p/w);if(!x||x===w-1||!y||y===h-1||ids[p-1]!==ids[p]||ids[p+1]!==ids[p]||ids[p-w]!==ids[p]||ids[p+w]!==ids[p]){dist[p]=1;queue[tail++]=p;}}
  while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);for(const n of [x?p-1:-1,x<w-1?p+1:-1,y?p-w:-1,y<h-1?p+w:-1])if(n>=0&&map[n]===map[p]&&!dist[n]){dist[n]=dist[p]+1;queue[tail++]=n;}}
  if(detail==='pixel'){const labels=[];for(let p=0;p<ids.length;p++)if(ids[p]>=0)labels.push({x:p%w+.5,y:Math.floor(p/w)+.5,colour:ids[p],clearance:.5,area:1});return {w,h,ids,colours,labels};}
  const labels=regions.map(r=>{let best=r.pixels[0];for(const p of r.pixels)if(dist[p]>dist[best])best=p;return {x:best%w+.5,y:Math.floor(best/w)+.5,colour:r.colour,clearance:dist[best],area:r.pixels.length};});
  return {w,h,ids,colours,labels};
}
export function boundaryLines({ids,w,h}){
  const lines=[];
  for(let y=0;y<=h;y++){let start=-1;for(let x=0;x<=w;x++){const a=y>0&&x<w?ids[(y-1)*w+x]:-1,b=y<h&&x<w?ids[y*w+x]:-1,on=x<w&&a!==b;if(on&&start<0)start=x;if(!on&&start>=0){lines.push([start,y,x,y]);start=-1;}}}
  for(let x=0;x<=w;x++){let start=-1;for(let y=0;y<=h;y++){const a=x>0&&y<h?ids[y*w+x-1]:-1,b=x<w&&y<h?ids[y*w+x]:-1,on=y<h&&a!==b;if(on&&start<0)start=y;if(!on&&start>=0){lines.push([x,start,x,y]);start=-1;}}}
  return lines;
}
