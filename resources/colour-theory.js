'use strict';
(() => {
const $=id=>document.getElementById(id);
const wheel=[['Red','#c83c40'],['Red-orange','#e35c35'],['Orange','#e99232'],['Yellow-orange','#f1b938'],['Yellow','#edda43'],['Yellow-green','#a7b84b'],['Green','#43895d'],['Blue-green','#318b90'],['Blue','#3a62a6'],['Blue-violet','#65569d'],['Violet','#8a4b9c'],['Red-violet','#b44b80']];
// Curated starting experiments, not a numerical pigment-mixing model.
const recipes=[
  {
    "name": "Orange",
    "hex": "#e78a39",
    "mix": "2 parts warm yellow + 1 part warm red",
    "adjust": "Warm yellow and warm red are a good starting pair for orange. Add more yellow for a golden orange or more red for a redder one."
  },
  {
    "name": "Green",
    "hex": "#769347",
    "mix": "2 parts cool yellow + 1 part blue",
    "adjust": "Cool yellow is a good starting choice for a clearer green. Start with yellow and add blue slowly; your blue will also affect how bright it looks."
  },
  {
    "name": "Muted green",
    "hex": "#85804a",
    "mix": "2 parts warm yellow + 1 part blue + a tiny touch of warm red",
    "adjust": "Mix the green first, then add red little by little to make it less bright."
  },
  {
    "name": "Blue-green",
    "hex": "#439fa0",
    "mix": "2 parts blue + 1 part cool yellow",
    "white": 3,
    "adjust": "More yellow makes it greener. More blue makes it bluer. Your paints may give a quieter colour than the swatch."
  },
  {
    "name": "Purple",
    "hex": "#86519e",
    "mix": "1 part cool red + 1 part blue",
    "adjust": "Cool red usually gives a clearer purple than warm red. Add more cool red or blue to adjust it. Your blue may still make the mix quieter than the swatch."
  },
  {
    "name": "Light purple",
    "hex": "#b7a2d2",
    "mix": "1 part cool red + 1 part blue",
    "white": 6,
    "adjust": "Mix the purple first, then add a little of it to the white until you like the colour.",
    "waterAdjust": "Mix the purple first, then add water a little at a time and test on white paper."
  },
  {
    "name": "Pink",
    "hex": "#df9bac",
    "mix": "1 part cool red",
    "white": 5,
    "adjust": "Add a little cool red to white for pink. Try warm red instead for a warmer, more coral pink.",
    "waterAdjust": "Dilute cool red with water for a pale pink wash. Try warm red for a warmer, more coral pink."
  },
  {
    "name": "Peach",
    "hex": "#e3b391",
    "mix": "2 parts warm yellow + 1 part warm red",
    "white": 8,
    "adjust": "Make orange first, then add a little to the white. This gives a light orange, not a colour for every skin tone.",
    "waterAdjust": "Make orange first, then dilute with water for a pale wash. This is not a colour for every skin tone."
  },
  {
    "name": "Red-brown",
    "hex": "#b56e54",
    "mix": "2 parts warm red + 1 part warm yellow + a tiny touch of blue",
    "white": 1,
    "adjust": "Make a red-orange first. Add blue slowly to quieten it. Add more red if it becomes too grey."
  },
  {
    "name": "Brown",
    "hex": "#80624c",
    "mix": "1 part warm red + 1 part warm yellow + 1 part blue",
    "adjust": "Start with red and yellow, then add the blue gradually; you may not need all of it. More red or yellow warms the brown."
  },
  {
    "name": "Grey",
    "hex": "#81858d",
    "mix": "1 part black",
    "white": 6,
    "adjust": "Start with white and add black a tiny amount at a time. A touch of blue cools it; a touch of red warms it.",
    "waterAdjust": "Dilute black with water and test on white paper. Use more water for a lighter grey."
  },
  {
    "name": "Dark blue",
    "hex": "#313f5e",
    "mix": "3 parts blue + a tiny touch of black",
    "adjust": "Add black slowly: a little can darken the blue quickly. Add more blue if the mix becomes too dark."
  }
];
function recipeFor(index,medium){const r=recipes[index];if(!r||!['opaque','watercolour'].includes(medium))throw Error('Invalid recipe');return {name:r.name,hex:r.hex,formula:r.mix+(medium==='opaque'&&r.white?' + '+r.white+' parts white':''),adjust:r.adjust,finish:medium==='watercolour'?(r.white?'Leave out white paint. Add clean water gradually and test on white watercolour paper for a pale version.':'Add water to control the strength of the wash. Test on white watercolour paper.'):'Mix a small amount with a palette knife or brush. Check the dried colour before making a larger batch.'};}
function add(tag,text,parent,cls){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;parent.append(el);return el;}
for(const [i,c] of wheel.entries()){const o=add('option',c[0],$('base-hue'));o.value=String(i);}$('base-hue').value='8';
function palette(){const base=Number($('base-hue').value),type=$('harmony').value;const offsets={neighbours:[-1,0,1],opposite:[0,6],split:[0,5,7],triad:[0,4,8],single:[0,0,0]}[type];$('palette').replaceChildren();offsets.forEach((off,i)=>{const [name,hex]=wheel[(base+off+12)%12];const chip=add('div','',$('palette'),'colour-chip');const swatch=add('i','',chip);swatch.setAttribute('aria-hidden','true');swatch.style.background=type==='single'?`color-mix(in srgb, ${hex} ${[35,100,55][i]}%, ${i===2?'black':'white'})`:hex;add('span',type==='single'?['Lighter','Starting colour','Darker'][i]:name,chip);});$('harmony-note').textContent={neighbours:'Neighbours feel connected. Vary light and dark to keep the shapes clear.',opposite:'Opposites create contrast. Let one lead and use the other in smaller areas.',split:'One colour plus the two neighbours of its opposite: contrast with a little more variety.',triad:'Three spaced colours feel lively. Let one take up most of the space.',single:'One hue is enough. Use light and dark versions to give it variety.'}[type];}
let chosen=0;
recipes.forEach((r,i)=>{const b=add('button','',$('recipe-picker'),'recipe-choice');b.type='button';b.setAttribute('aria-pressed','false');const dot=add('span','',b,'recipe-dot');dot.style.background=r.hex;dot.setAttribute('aria-hidden','true');add('span',r.name,b);b.onclick=()=>{chosen=i;showRecipe();};});
function showRecipe(){const medium=$('paint-type').value,r=recipeFor(chosen,medium),root=$('recipe');root.replaceChildren();[...$('recipe-picker').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===chosen)));const swatch=add('div','',root,'recipe-result');swatch.style.background=r.hex;swatch.setAttribute('aria-hidden','true');const content=add('div','',root);add('h3',r.name,content);add('p','Start with',content,'small');add('p',r.formula,content,'formula');add('p',medium==='watercolour'?(recipes[chosen].waterAdjust||r.adjust):r.adjust,content);add('p',r.finish,content);$('under-note').textContent=medium==='watercolour'?'Keep white watercolour paper showing for the brightest light. A pale related wash can be a first layer; let it dry before adding more.':'Try a white or light, properly prepared surface for brighter colours. A pale related base can shift a transparent top layer. Use a ground suited to your paint; oil needs an oil-compatible preparation.';}
$('paint-type').addEventListener('change',showRecipe);$('base-hue').addEventListener('change',palette);$('harmony').addEventListener('change',palette);palette();showRecipe();
})();
