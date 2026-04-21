import * as THREE from 'https://cdn.skypack.dev/three';
import { OrbitControls } from 'https://cdn.skypack.dev/three/examples/jsm/controls/OrbitControls.js';

const SYMBOLS = ['🎰','💎','🍒','🔔','⭐','🍀','💰'];
const FORCE_WIN = true;

const container = document.getElementById('three-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight,0.1,1000);
camera.position.set(0,0,8);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

const light = new THREE.AmbientLight(0xffffff,2);
scene.add(light);

const reels = [];
const reelCount = 3;
const symbolCount = 12;

function createTexture(symbol) {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const w = canvas.width / symbolCount;

  ctx.font = 'bold 120px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for(let i=0;i<symbolCount;i++){
    const s = symbol ?? SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)];
    ctx.fillText(s, i*w + w/2, canvas.height/2);
  }

  return new THREE.CanvasTexture(canvas);
}

const group = new THREE.Group();
scene.add(group);

for(let i=0;i<3;i++){
  const geo = new THREE.CylinderGeometry(2.5,2.5,1.8,64,1,true);
  const mat = new THREE.MeshStandardMaterial({
    map: createTexture(FORCE_WIN ? '🎰' : null)
  });

  const reel = new THREE.Mesh(geo,mat);
  reel.rotation.z = Math.PI/2;
  reel.position.x = (i-1)*2.2;

  group.add(reel);
  reels.push({mesh:reel,speed:0});
}

const btn = document.getElementById('spin-button');
const text = document.getElementById('status-text');

let spinning=false;

btn.onclick = async ()=>{
  if(spinning) return;
  spinning=true;

  text.textContent="回転中…";

  reels.forEach(r=>r.speed=0.6);

  await new Promise(r=>setTimeout(r,2000));

  for(let i=0;i<3;i++){
    await new Promise(r=>setTimeout(r,1000));
    reels[i].speed=0;
  }

  if(FORCE_WIN){
    text.textContent="🎉 WIN!";
  }else{
    text.textContent="LOSE...";
  }

  spinning=false;
};

function animate(){
  requestAnimationFrame(animate);

  reels.forEach(r=>{
    r.mesh.rotation.x += r.speed;
  });

  controls.update();
  renderer.render(scene,camera);
}

animate();
