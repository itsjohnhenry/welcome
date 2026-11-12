import {processImage,boundaryLines} from './paint-engine.js?v=detail-2';
self.onmessage=({data})=>{try{const result=processImage(data);result.lines=boundaryLines(result);self.postMessage({result},[result.ids.buffer]);}catch(error){self.postMessage({error:error.message});}};
