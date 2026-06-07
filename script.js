import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- CONFIGURATION ---
const SYMBOLS = ['🎰', '💎', '🍒', '🔔', '⭐', '🍀', '💰'];
const HAPPY_EMOJIS = ['😊', '😄', '✨', '🎉', '🚀', '🔥', '💖'];
const SAD_EMOJIS = ['😭', '😢', '😰', '💔', '☁️', '📉', '🥀'];
const FORCE_WIN = true;

// --- THREE.JS SETUP ---
const container = document.getElementById('three-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080006);
scene.fog = new THREE.Fog(0x080006, 7, 18);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1000);
camera.position.set(0, 0, 9.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.enableRotate = false;
controls.enableZoom = false;
controls.maxDistance = 12;
controls.minDistance = 5;

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xff174d, 140);
spotLight.position.set(5, 5, 5);
spotLight.angle = Math.PI / 6;
scene.add(spotLight);

const pointLight = new THREE.PointLight(0x00eaff, 80);
pointLight.position.set(-5, -5, 2);
scene.add(pointLight);

// --- SLOT MACHINE OBJECTS ---
const reels = [];
const reelCount = 3;
const reelRadius = 2.5;
const reelWidth = 1.8;
const symbolCount = 12;

function createReelTexture(forcedSymbol = null) {
    const canvas = document.createElement('canvas');
    // CylinderGeometry のUVでは横方向(u)が円周、縦方向(v)が軸方向になる。
    // リール回転を視覚化するため、記号は横方向に並べる。
    canvas.width = 2048;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    const background = ctx.createLinearGradient(0, 0, 0, canvas.height);
    background.addColorStop(0, '#d8d8dc');
    background.addColorStop(0.45, '#ffffff');
    background.addColorStop(1, '#b9bac0');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const segmentWidth = canvas.width / symbolCount;
    ctx.font = 'bold 120px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < symbolCount; i++) {
        const symbol = forcedSymbol ?? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        const x = i * segmentWidth;
        ctx.fillStyle = i % 2 ? '#ffffff' : '#f1f1f4';
        ctx.fillRect(x, 0, segmentWidth, canvas.height);
        ctx.strokeStyle = '#c7a84d';
        ctx.lineWidth = 8;
        ctx.strokeRect(x + 4, 4, segmentWidth - 8, canvas.height - 8);
        ctx.fillStyle = '#111';
        ctx.fillText(symbol, x + segmentWidth / 2, canvas.height / 2);
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
    const count = 2400;
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
const machine = document.getElementById('machine');
const chanceLamp = document.getElementById('chance-lamp');
const countdown = document.getElementById('countdown');
const megaMessage = document.getElementById('mega-message');
const impactRing = document.getElementById('impact-ring');
const payoutCount = document.getElementById('payout-count');
const gameCount = document.getElementById('game-count');
const stopButtons = [...document.querySelectorAll('.stop-button')];
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
let isSpinning = false;
let totalGames = 0;

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

// --- SOUND ENGINE ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;

    if (type === 'spin') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 2);
        osc.start();
        osc.stop(now + 2);
    } else if (type === 'stop') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start();
        osc.stop(now + 0.2);
    } else if (type === 'flash') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start();
        osc.stop(now + 0.1);
    } else if (type === 'win') {
        osc.type = 'triangle';
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((f, i) => {
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'triangle';
            o.connect(g);
            g.connect(audioCtx.destination);
            o.frequency.setValueAtTime(f, now + i * 0.1);
            g.gain.setValueAtTime(0.2, now + i * 0.1);
            g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5);
            o.start(now + i * 0.1);
            o.stop(now + i * 0.1 + 0.5);
        });
    } else if (type === 'fail') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.5);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start();
        osc.stop(now + 0.5);
    }
}

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

async function showCountdown() {
    for (const value of ['3', '2', '1']) {
        countdown.textContent = value;
        countdown.classList.remove('show');
        void countdown.offsetWidth;
        countdown.classList.add('show');
        playSound('flash');
        await wait(620);
    }
}

function setJackpotTextures() {
    reels.forEach(reel => {
        reel.mesh.material.map.dispose();
        reel.mesh.material.map = createReelTexture('7️⃣');
        reel.mesh.material.needsUpdate = true;
    });
}

function triggerImpact() {
    impactRing.classList.remove('show');
    void impactRing.offsetWidth;
    impactRing.classList.add('show');
    triggerFlash();
}

async function spin() {
    if (isSpinning) return;
    isSpinning = true;
    spinButton.disabled = true;
    totalGames += 1;
    gameCount.textContent = String(totalGames).padStart(3, '0');
    payoutCount.textContent = '00';
    machine.classList.remove('jackpot');
    chanceLamp.classList.remove('active');
    stopButtons.forEach(button => button.classList.remove('ready', 'stopped'));

    if (activeParticleSystem) {
        scene.remove(activeParticleSystem.mesh);
        activeParticleSystem.mesh.geometry.dispose();
        activeParticleSystem.mesh.material.dispose();
        activeParticleSystem = null;
    }

    statusText.textContent = 'リール始動！ 高確率ゾーン突入';
    statusText.style.color = '#ffffff';
    statusText.style.fontSize = '';
    const isReset = FORCE_WIN || await fetchStatus();

    reels.forEach(reel => {
        reel.mesh.material.map.dispose();
        reel.mesh.material.map = createReelTexture();
        reel.mesh.material.needsUpdate = true;
        reel.currentSpeed = 0.72 + Math.random() * 0.25;
    });
    stopButtons.forEach(button => button.classList.add('ready'));
    playSound('spin');
    await wait(1500);

    statusText.textContent = '前兆発生… ボーナスの気配！';
    chanceLamp.classList.add('active');
    machine.classList.add('hype');
    showSpeedLines(true);
    await showCountdown();

    megaMessage.classList.remove('show');
    void megaMessage.offsetWidth;
    megaMessage.classList.add('show');
    statusText.textContent = '激熱！ 最終停止まで目を離すな！';
    await wait(900);

    for (let i = 0; i < reelCount; i++) {
        const isLastReel = i === reelCount - 1;
        if (isLastReel) {
            statusText.textContent = '最終リール… 超スローモーション！';
            setJackpotTextures();
            for (let pulse = 0; pulse < 4; pulse++) {
                triggerImpact();
                playSound('flash');
                await wait(240);
            }
        } else {
            statusText.textContent = `${i + 1}リール停止！ 期待度上昇！`;
        }

        const stopStartSpeed = reels[i].currentSpeed;
        const steps = isLastReel ? 72 : 24;
        for (let step = 0; step < steps; step++) {
            reels[i].currentSpeed = stopStartSpeed * Math.pow(1 - step / steps, isLastReel ? 1.4 : 2);
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
        reels[i].currentSpeed = 0;
        stopButtons[i].classList.remove('ready');
        stopButtons[i].classList.add('stopped');
        playSound('stop');
        triggerImpact();
        await wait(isLastReel ? 650 : 550);
    }

    showSpeedLines(false);
    machine.classList.remove('hype');

    if (isReset) {
        statusText.textContent = '777 超覚醒 BONUS 確定！';
        statusText.style.color = '#fff3a1';
        statusText.style.fontSize = 'clamp(18px, 4vw, 28px)';
        payoutCount.textContent = '77';
        machine.classList.add('jackpot');
        activeParticleSystem = initParticles('happy');
        playSound('win');
        for (let i = 0; i < 6; i++) setTimeout(() => {
            triggerFlash();
            playSound('flash');
        }, i * 170);
    } else {
        statusText.textContent = '惜しい！ 次ゲームに期待';
        statusText.style.color = '#ff6677';
        activeParticleSystem = initParticles('sad');
        playSound('fail');
    }

    await wait(3600);
    isSpinning = false;
    spinButton.disabled = false;
    chanceLamp.classList.remove('active');
    statusText.textContent = 'もう一度レバーを叩け！';
    statusText.style.fontSize = '';
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

function resizeRenderer() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
}

resizeRenderer();
window.addEventListener('resize', resizeRenderer);
new ResizeObserver(resizeRenderer).observe(container);
