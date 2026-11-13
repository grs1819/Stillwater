import http from 'node:http';
import {MUSIC_TRACKS} from './audio.js';
import {readFile} from 'node:fs/promises';
const files = {
  ...Object.fromEntries(MUSIC_TRACKS.map(track=>[track.src.slice(1),track.src.slice(2)])),
  '/audio.js':'audio.js',
  '/terrain.js':'terrain.js', '/':'index.html', '/app.js':'app.js', '/style.css':'style.css', '/town.js':'town.js', '/water.js':'water.js', '/water-view.js':'water-view.js', '/navigation.js':'navigation.js', '/villagers.js':'villagers.js',
  '/vendor/three.module.js':'vendor/three.module.js',
  '/vendor/three.core.js':'vendor/three.core.js',
  '/vendor/OrbitControls.js':'vendor/OrbitControls.js',
  '/assets/stillwater-mark.png':'assets/stillwater-mark.png',
  '/assets/stillwater-icon.png':'assets/stillwater-icon.png',
  '/assets/stillwater-logo.png':'assets/stillwater-logo.png',
};
const contentTypes={js:'text/javascript',css:'text/css',html:'text/html',png:'image/png',mp3:'audio/mpeg'};
http.createServer(async(req,res)=>{
  const path=files[new URL(req.url,'http://localhost').pathname];
  if(!path){res.writeHead(404);res.end('Not found');return;}
  try{
    const data=await readFile(new URL(path,import.meta.url));
    res.setHeader('Content-Type',contentTypes[path.split('.').pop()]);
    if(path.endsWith('.mp3')){
      res.setHeader('Accept-Ranges','bytes');
      if(req.headers.range){
        const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        const start=match&&match[1]?Number(match[1]):match&&match[2]?Math.max(0,data.length-Number(match[2])):NaN;
        const end=match&&match[1]&&match[2]?Math.min(Number(match[2]),data.length-1):data.length-1;
        if(!Number.isSafeInteger(start)||start<0||start>=data.length||end<start){res.writeHead(416,{'Content-Range':`bytes */${data.length}`});res.end();return;}
        res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});
        res.end(data.subarray(start,end+1));return;
      }
    }
    res.setHeader('Content-Length',data.length);res.end(data);
  }catch{res.writeHead(500);res.end('Unable to load file');}
}).listen(Number(process.env.PORT)||5173,'0.0.0.0',()=>console.log('Stillwater running on port '+(process.env.PORT||5173)));
