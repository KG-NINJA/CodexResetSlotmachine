import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- CONFIGURATION ---
const SYMBOLS = ['🎰', '💎', '🍒', '🔔', '⭐', '🍀', '💰'];
const HAPPY_EMOJIS = ['😊', '😄', '✨', '🎉', '🚀', '🔥', '💖'];
const SAD_EMOJIS = ['😭', '😢', '😰', '💔', '☁️', '📉', '🥀'];

// --- THREE.JS SETUP ---
const container = document.getElementById('three-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.Fog(0x050505, 5, 15);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.maxDistance = 12;
controls.minDistance = 5;

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0x007BFF, 100);
spotLight.position.set(5, 5, 5);
spotLight.angle = Math.PI / 6;
scene.add(spotLight);

const pointLight = new THREE.PointLight(0x00d4ff, 50);
pointLight.position.set(-5, -5, 2);
scene.add(pointLight);

// --- SLOT MACHINE OBJECTS ---
const reels = [];
const reelCount = 3;
const reelRadius = 2.5;
const reelWidth = 1.8;
const symbolCount = 12;

function createReelTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const segmentHeight = canvas.height / symbolCount;
    ctx.font = 'bold 120px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < symbolCount; i++) {
        let symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        ctx.fillText(symbol, canvas.width / 2, i * segmentHeight + segmentHeight / 2);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

const reelGroup = new THREE.Group();
scene.add(reelGroup);

for (let i = 0; i < reelCount; i++) {
    const geometry = new THREE.CylinderGeometry(reelRadius, reelRadius, reelWidth, 64, 1, true);
    const material = new THREE.MeshStandardMaterial({
        map: createReelTexture(),
        roughness: 0.3,
        metalness: 0.8
    });
    const reel = new THREE.Mesh(geometry, material);
    reel.rotation.z = Math.PI / 2;
    reel.position.x = (i - 1) * (reelWidth + 0.2);
    reelGroup.add(reel);
    reels.push({ mesh: reel, currentSpeed: 0 });
}

// --- PARTICLE SYSTEM ---
let activeParticleSystem = null;

function initParticles(type) {
    // 圧倒的な量に増量（300 -> 10000）! 画面を埋め尽くす。
    const count = 10000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const spriteNames = type === 'happy' ? HAPPY_EMOJIS : SAD_EMOJIS;
    
    for (let i = 0; i < count; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = '80px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const emoji = spriteNames[Math.floor(Math.random() * spriteNames.length)];
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillText(emoji, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
        size: 0.8,
        map: texture,
        transparent: true,
        alphaTest: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const pMesh = new THREE.Points(geometry, material);
    scene.add(pMesh);
    
    return {
        mesh: pMesh,
        velocities: Array.from({ length: count }, () => new THREE.Vector3(
            (Math.random() - 0.5) * 0.8, // 左右への広がりを強化
            (Math.random()) * 0.6 + 0.2, // 上への噴き出しを強化
            (Math.random() - 0.5) * 0.8
        ))
    };
}

// --- LOGIC ---
const spinButton = document.getElementById('spin-button');
const statusText = document.getElementById('status-text');
let isSpinning = false;

async function fetchStatus() {
    try {
        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://hascodexratelimitreset.today/api/status');
        const response = await fetch(proxyUrl);
        const data = await response.json();
        return data.state === 'yes';
    } catch (error) { 
        console.error('Fetch error:', error);
        return false; 
    }
}

const flashOverlay = document.getElementById('flash-overlay');
const speedLinesContainer = document.getElementById('speed-lines');

function triggerFlash() {
    flashOverlay.style.opacity = '1';
    flashOverlay.style.transition = 'none';
    setTimeout(() => {
        flashOverlay.style.transition = 'opacity 0.5s ease-out';
        flashOverlay.style.opacity = '0';
    }, 50);
}

function showSpeedLines(show) {
    speedLinesContainer.innerHTML = '';
    if (!show) return;
    // 強調線を大幅に増量（50 -> 300）
    for (let i = 0; i < 300; i++) {
        const line = document.createElement('div');
        line.className = 'speed-line';
        const angle = Math.random() * Math.PI * 2;
        // 太さや長さにランダム性を持たせて密度を高める
        const width = 1000 + Math.random() * 2000;
        const thickness = 1 + Math.random() * 4;
        line.style.width = `${width}px`;
        line.style.height = `${thickness}px`;
        line.style.transform = `rotate(${angle}rad) translate(150px, 0)`;
        speedLinesContainer.appendChild(line);
    }
}

async function spin() {
    if (isSpinning) return;
    isSpinning = true;
    spinButton.disabled = true;
    
    if (activeParticleSystem) {
        scene.remove(activeParticleSystem.mesh);
        activeParticleSystem = null;
    }

    statusText.textContent = '運命を選択中...';
    statusText.style.color = '#fff';

    const isReset = await fetchStatus();
    
    // 全リール高速回転
    reels.forEach(r => r.currentSpeed = 0.6 + Math.random() * 0.4);

    await new Promise(r => setTimeout(r, 2000));
    
    statusText.textContent = '解析開始...';
    for (let i = 0; i < reelCount; i++) {
        const isLastReel = (i === reelCount - 1);
        
        if (isLastReel) {
            statusText.textContent = '最終リール、スキャン...!!!';
            statusText.style.fontSize = '2rem';
            statusText.style.color = '#ffd700';
            
            // 強調線とスローダウン予告
            showSpeedLines(true);
            await new Promise(r => setTimeout(r, 1000));
            
            // スローモーションフェーズ
            const currentSpeed = reels[i].currentSpeed;
            for (let step = 0; step < 50; step++) {
                reels[i].currentSpeed = currentSpeed * (0.8 - (step / 70));
                await new Promise(r => requestAnimationFrame(r));
            }
            
            // 決定の瞬間！フラッシュ
            triggerFlash();
            showSpeedLines(false);
        } else {
            statusText.textContent = `${i + 1}番目 確定...`;
            await new Promise(r => setTimeout(r, 1200));
        }
        
        // 停止アニメーション
        const stopStartSpeed = reels[i].currentSpeed;
        for (let step = 0; step < 15; step++) {
            reels[i].currentSpeed = stopStartSpeed * Math.pow(1 - step/15, 2);
            await new Promise(r => requestAnimationFrame(r));
        }
        reels[i].currentSpeed = 0;
        
        if (!isLastReel) await new Promise(r => setTimeout(r, 500));
    }

    await new Promise(r => setTimeout(r, 500));

    if (isReset) {
        statusText.textContent = '✨ SUCCESS! RESET DETECTED! ✨';
        statusText.style.color = '#00ff00';
        statusText.style.fontSize = '2.5rem';
        activeParticleSystem = initParticles('happy');
        // 勝利のフラッシュ
        for(let i=0; i<3; i++) setTimeout(triggerFlash, i*200);
    } else {
        statusText.textContent = '💀 FAILED... NO RESET YET 💀';
        statusText.style.color = '#ff3333';
        activeParticleSystem = initParticles('sad');
    }

    await new Promise(r => setTimeout(r, 3000));
    isSpinning = false;
    spinButton.disabled = false;
    statusText.textContent = 'もう一度、運命に挑むか？';
    statusText.style.fontSize = '1.5rem';
}

spinButton.addEventListener('click', spin);

// --- RENDER LOOP ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    reels.forEach(reel => reel.mesh.rotation.x += reel.currentSpeed);
    
    if (activeParticleSystem) {
        const positions = activeParticleSystem.mesh.geometry.attributes.position.array;
        for (let i = 0; i < activeParticleSystem.velocities.length; i++) {
            positions[i * 3] += activeParticleSystem.velocities[i].x;
            positions[i * 3 + 1] += activeParticleSystem.velocities[i].y;
            positions[i * 3 + 2] += activeParticleSystem.velocities[i].z;
            activeParticleSystem.velocities[i].y -= 0.005;
        }
        activeParticleSystem.mesh.geometry.attributes.position.needsUpdate = true;
    }
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
