/* ==========================================================================
   NEON DASH ULTRA - ENGINE & WEB AUDIO SYNTHESIZER
   ========================================================================== */

// --- GLOBAL AUDIO SYNTHESIZER CLASS ---
class DynamicAudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.isPlaying = false;
        this.currentBpm = 130;
        this.currentScale = [];
        this.stepIndex = 0;
        this.timerId = null;
        this.muted = false;

        // Visualizer Callback
        this.onBeatCallback = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.8;

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.6;

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.7;

        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Sound FX Generators
    playJumpSound() {
        if (!this.ctx || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
    }

    playOrbPadSound(isPad = false) {
        if (!this.ctx || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const startFreq = isPad ? 400 : 700;
        const endFreq = isPad ? 1200 : 1500;

        osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playCrashSound() {
        if (!this.ctx || this.muted) return;
        // White noise burst for crash
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.3);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        whiteNoise.start();
        whiteNoise.stop(this.ctx.currentTime + 0.3);
    }

    playVictorySound() {
        if (!this.ctx || this.muted) return;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;

            const startTime = this.ctx.currentTime + idx * 0.1;
            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(startTime);
            osc.stop(startTime + 0.4);
        });
    }

    // Music Synthesizer Loop (Real-time Procedural Synth EDM)
    startMusic(bpm = 130, scaleType = 'cyan') {
        this.init();
        this.resume();
        this.stopMusic();

        this.currentBpm = bpm;
        this.isPlaying = true;
        this.stepIndex = 0;

        // Pentatonic / EDM Scale Frequency Maps
        if (scaleType === 'cyan') {
            this.currentScale = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63]; // C Minor Pentatonic
        } else if (scaleType === 'green') {
            this.currentScale = [146.83, 164.81, 185.00, 220.00, 246.94, 293.66, 329.63, 369.99]; // D Minor
        } else if (scaleType === 'purple') {
            this.currentScale = [110.00, 123.47, 130.81, 146.83, 164.81, 220.00, 246.94, 261.63]; // A Minor Synth
        } else if (scaleType === 'orange') {
            this.currentScale = [123.47, 138.59, 155.56, 185.00, 207.65, 246.94, 277.18, 311.13]; // B Phrygian
        } else {
            this.currentScale = [98.00, 110.00, 116.54, 130.81, 146.83, 196.00, 220.00, 233.08]; // G Dark Minor
        }

        const stepTimeMs = (60 / this.currentBpm / 4) * 1000;

        this.timerId = setInterval(() => {
            if (!this.isPlaying || this.muted) return;
            this.tickStep();
        }, stepTimeMs);
    }

    stopMusic() {
        this.isPlaying = false;
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    tickStep() {
        const step = this.stepIndex % 16;
        const now = this.ctx.currentTime;

        // Kick Drum on Beats 0, 4, 8, 12
        if (step % 4 === 0) {
            const kickOsc = this.ctx.createOscillator();
            const kickGain = this.ctx.createGain();
            kickOsc.frequency.setValueAtTime(140, now);
            kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

            kickGain.gain.setValueAtTime(0.7, now);
            kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            kickOsc.connect(kickGain);
            kickGain.connect(this.musicGain);
            kickOsc.start(now);
            kickOsc.stop(now + 0.08);

            if (this.onBeatCallback) this.onBeatCallback(true);
        } else {
            if (this.onBeatCallback) this.onBeatCallback(false);
        }

        // Snare / Noise on Beats 4, 12
        if (step === 4 || step === 12) {
            const snareGain = this.ctx.createGain();
            snareGain.gain.setValueAtTime(0.25, now);
            snareGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

            const osc = this.ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(180, now);

            osc.connect(snareGain);
            snareGain.connect(this.musicGain);
            osc.start(now);
            osc.stop(now + 0.1);
        }

        // Arpeggiated Synth Lead
        const noteFreq = this.currentScale[(step * 3) % this.currentScale.length];
        const synthOsc = this.ctx.createOscillator();
        const synthGain = this.ctx.createGain();

        synthOsc.type = (step % 2 === 0) ? 'sawtooth' : 'square';
        synthOsc.frequency.setValueAtTime(noteFreq * 2, now);

        synthGain.gain.setValueAtTime(0.12, now);
        synthGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        synthOsc.connect(synthGain);
        synthGain.connect(this.musicGain);

        synthOsc.start(now);
        synthOsc.stop(now + 0.1);

        // Sub Bassline
        if (step % 2 === 0) {
            const bassOsc = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            bassOsc.type = 'sawtooth';
            bassOsc.frequency.setValueAtTime(this.currentScale[step % 4] / 2, now);

            bassGain.gain.setValueAtTime(0.2, now);
            bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

            bassOsc.connect(bassGain);
            bassGain.connect(this.musicGain);

            bassOsc.start(now);
            bassOsc.stop(now + 0.15);
        }

        this.stepIndex++;
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 0.8;
        }
        return this.muted;
    }
}

// --- LEVEL DEFINITIONS ---
const LEVELS = [
    {
        id: 1,
        title: "STEREO MADNESS",
        difficulty: "EASY",
        bpm: 130,
        scale: "cyan",
        primaryColor: "#00f3ff",
        bgColor: "#090d16",
        mapLength: 3200,
        // Procedural level obstacle layouts
        obstacles: [
            { type: 'spike', x: 600 },
            { type: 'spike', x: 900 },
            { type: 'block', x: 1100, y: 0, w: 120, h: 40 },
            { type: 'spike', x: 1140, y: 40 },
            { type: 'spike', x: 1400 },
            { type: 'spike', x: 1440 },
            { type: 'pad', x: 1700 }, // Yellow pad
            { type: 'block', x: 1850, y: 80, w: 160, h: 40 },
            { type: 'orb', x: 2150, y: 120 }, // Yellow orb ring
            { type: 'spike', x: 2150, y: 0 },
            { type: 'spike', x: 2190, y: 0 },
            { type: 'block', x: 2400, y: 0, w: 200, h: 40 },
            { type: 'spike', x: 2500, y: 40 },
            { type: 'spike', x: 2800 },
            { type: 'spike', x: 2840 },
            { type: 'spike', x: 2880 }
        ]
    },
    {
        id: 2,
        title: "BACK ON TRACK",
        difficulty: "NORMAL",
        bpm: 140,
        scale: "green",
        primaryColor: "#00ff66",
        bgColor: "#06140c",
        mapLength: 3600,
        obstacles: [
            { type: 'spike', x: 500 },
            { type: 'pad', x: 750 },
            { type: 'block', x: 900, y: 80, w: 140, h: 40 },
            { type: 'spike', x: 1150 },
            { type: 'spike', x: 1190 },
            { type: 'orb', x: 1400, y: 110 },
            { type: 'spike', x: 1400, y: 0 },
            { type: 'block', x: 1650, y: 0, w: 120, h: 40 },
            { type: 'block', x: 1770, y: 40, w: 120, h: 40 },
            { type: 'spike', x: 1810, y: 80 },
            { type: 'pad', x: 2100 },
            { type: 'block', x: 2250, y: 100, w: 180, h: 40 },
            { type: 'spike', x: 2550 },
            { type: 'spike', x: 2590 },
            { type: 'spike', x: 2630 },
            { type: 'orb', x: 2900, y: 130 },
            { type: 'spike', x: 3200 }
        ]
    },
    {
        id: 3,
        title: "POLARGEIST",
        difficulty: "HARD",
        bpm: 150,
        scale: "purple",
        primaryColor: "#9d00ff",
        bgColor: "#10061a",
        mapLength: 4000,
        obstacles: [
            { type: 'spike', x: 500 },
            { type: 'spike', x: 540 },
            { type: 'block', x: 750, y: 0, w: 80, h: 40 },
            { type: 'orb', x: 950, y: 100 },
            { type: 'spike', x: 950, y: 0 },
            { type: 'block', x: 1150, y: 60, w: 160, h: 40 },
            { type: 'spike', x: 1200, y: 100 },
            { type: 'pad', x: 1450 },
            { type: 'block', x: 1600, y: 120, w: 200, h: 40 },
            { type: 'spike', x: 1680, y: 160 },
            { type: 'spike', x: 1950 },
            { type: 'spike', x: 1990 },
            { type: 'spike', x: 2030 },
            { type: 'orb', x: 2300, y: 120 },
            { type: 'block', x: 2500, y: 0, w: 200, h: 40 },
            { type: 'spike', x: 2550, y: 40 },
            { type: 'spike', x: 2590, y: 40 },
            { type: 'pad', x: 2900 },
            { type: 'spike', x: 3200 },
            { type: 'spike', x: 3240 },
            { type: 'spike', x: 3280 },
            { type: 'spike', x: 3320 }
        ]
    },
    {
        id: 4,
        title: "DRY OUT",
        difficulty: "HARDER",
        bpm: 155,
        scale: "orange",
        primaryColor: "#ffb700",
        bgColor: "#1a1202",
        mapLength: 4200,
        obstacles: [
            { type: 'spike', x: 450 },
            { type: 'spike', x: 490 },
            { type: 'pad', x: 700 },
            { type: 'block', x: 850, y: 100, w: 100, h: 40 },
            { type: 'orb', x: 1050, y: 140 },
            { type: 'spike', x: 1250 },
            { type: 'spike', x: 1290 },
            { type: 'spike', x: 1330 },
            { type: 'block', x: 1550, y: 0, w: 160, h: 40 },
            { type: 'block', x: 1710, y: 40, w: 160, h: 40 },
            { type: 'spike', x: 1750, y: 80 },
            { type: 'orb', x: 2000, y: 120 },
            { type: 'pad', x: 2200 },
            { type: 'block', x: 2350, y: 120, w: 240, h: 40 },
            { type: 'spike', x: 2430, y: 160 },
            { type: 'spike', x: 2470, y: 160 },
            { type: 'spike', x: 2800 },
            { type: 'spike', x: 2840 },
            { type: 'spike', x: 2880 },
            { type: 'orb', x: 3100, y: 100 },
            { type: 'spike', x: 3400 },
            { type: 'spike', x: 3440 },
            { type: 'spike', x: 3480 }
        ]
    },
    {
        id: 5,
        title: "DEADLOCKED",
        difficulty: "DEMON",
        bpm: 165,
        scale: "dark",
        primaryColor: "#ff0055",
        bgColor: "#1a020a",
        mapLength: 4600,
        obstacles: [
            { type: 'spike', x: 400 },
            { type: 'spike', x: 440 },
            { type: 'spike', x: 480 },
            { type: 'pad', x: 680 },
            { type: 'block', x: 820, y: 120, w: 80, h: 40 },
            { type: 'orb', x: 1000, y: 150 },
            { type: 'spike', x: 1000, y: 0 },
            { type: 'spike', x: 1200 },
            { type: 'spike', x: 1240 },
            { type: 'spike', x: 1280 },
            { type: 'block', x: 1480, y: 0, w: 120, h: 40 },
            { type: 'spike', x: 1520, y: 40 },
            { type: 'orb', x: 1750, y: 110 },
            { type: 'orb', x: 1950, y: 140 },
            { type: 'pad', x: 2150 },
            { type: 'block', x: 2300, y: 140, w: 200, h: 40 },
            { type: 'spike', x: 2360, y: 180 },
            { type: 'spike', x: 2400, y: 180 },
            { type: 'spike', x: 2440, y: 180 },
            { type: 'spike', x: 2750 },
            { type: 'spike', x: 2790 },
            { type: 'spike', x: 2830 },
            { type: 'spike', x: 2870 },
            { type: 'orb', x: 3100, y: 130 },
            { type: 'block', x: 3300, y: 80, w: 180, h: 40 },
            { type: 'spike', x: 3360, y: 120 },
            { type: 'spike', x: 3700 },
            { type: 'spike', x: 3740 },
            { type: 'spike', x: 3780 },
            { type: 'spike', x: 3820 }
        ]
    }
];

// --- MAIN GAME ENGINE CLASS ---
class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.audio = new DynamicAudioEngine();

        // Game State
        this.currentLevelIndex = 0;
        this.attempts = 1;
        this.isRunning = false;
        this.isPaused = false;
        this.isGameOver = false;
        this.progress = 0;

        // Player Properties
        this.player = {
            x: 120,
            y: 0,
            size: 40,
            vy: 0,
            rotation: 0,
            isGrounded: false,
            gravity: 0.85,
            jumpForce: -14.5,
            groundY: 0
        };

        // Camera Offset
        this.cameraX = 0;
        this.speed = 7.5;

        // Input state
        this.holdingJump = false;

        // Particles & Visuals
        this.particles = [];
        this.trail = [];
        this.beatPulseScale = 1;

        // Visualizer DOM elements
        this.visBars = document.querySelectorAll('.vis-bar');

        // Setup Event Listeners
        this.initEvents();

        // Audio beat pulse reaction
        this.audio.onBeatCallback = (isKick) => {
            if (isKick) {
                this.beatPulseScale = 1.08;
                this.triggerVisualizer();
            }
        };
    }

    initEvents() {
        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.onJumpPress();
            }
            if (e.code === 'KeyP') {
                this.togglePause();
            }
            if (e.code === 'KeyR') {
                this.restartLevel();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                this.holdingJump = false;
            }
        });

        // Mouse / Touch Controls
        this.canvas.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.onJumpPress();
        });

        this.canvas.addEventListener('mouseup', () => {
            this.holdingJump = false;
        });

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.onJumpPress();
        }, { passive: false });

        this.canvas.addEventListener('touchend', () => {
            this.holdingJump = false;
        });

        // UI Buttons
        document.getElementById('btn-start-game').addEventListener('click', () => {
            document.getElementById('start-overlay').classList.remove('active');
            this.showLevelSelect();
        });

        document.getElementById('btn-prev-level').addEventListener('click', () => {
            if (this.currentLevelIndex > 0) {
                this.currentLevelIndex--;
                this.updateLevelSelectUI();
            }
        });

        document.getElementById('btn-next-level').addEventListener('click', () => {
            if (this.currentLevelIndex < LEVELS.length - 1) {
                this.currentLevelIndex++;
                this.updateLevelSelectUI();
            }
        });

        document.getElementById('btn-play-selected').addEventListener('click', () => {
            document.getElementById('level-overlay').classList.add('hidden');
            this.startLevel(this.currentLevelIndex);
        });

        document.getElementById('btn-pause-game').addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('btn-resume').addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('btn-restart').addEventListener('click', () => {
            document.getElementById('pause-overlay').classList.add('hidden');
            this.restartLevel();
        });

        document.getElementById('btn-exit').addEventListener('click', () => {
            document.getElementById('pause-overlay').classList.add('hidden');
            this.showLevelSelect();
        });

        document.getElementById('btn-audio-toggle').addEventListener('click', () => {
            const isMuted = this.audio.toggleMute();
            const icon = document.getElementById('audio-icon');
            icon.className = isMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
        });

        document.getElementById('btn-victory-continue').addEventListener('click', () => {
            document.getElementById('victory-overlay').classList.add('hidden');
            if (this.currentLevelIndex < LEVELS.length - 1) {
                this.currentLevelIndex++;
                this.startLevel(this.currentLevelIndex);
            } else {
                this.showLevelSelect();
            }
        });

        document.getElementById('btn-victory-menu').addEventListener('click', () => {
            document.getElementById('victory-overlay').classList.add('hidden');
            this.showLevelSelect();
        });
    }

    showLevelSelect() {
        this.audio.stopMusic();
        this.isRunning = false;
        document.getElementById('level-overlay').classList.remove('hidden');
        this.updateLevelSelectUI();
    }

    updateLevelSelectUI() {
        const level = LEVELS[this.currentLevelIndex];
        const container = document.getElementById('level-carousel');
        document.getElementById('level-index-indicator').innerText = `${this.currentLevelIndex + 1} / ${LEVELS.length}`;

        container.innerHTML = `
            <div class="level-card" style="border-color: ${level.primaryColor}">
                <div class="level-card-header">
                    <span class="level-difficulty" style="background: ${level.primaryColor}; color: #000;">${level.difficulty}</span>
                    <span class="level-bpm"><i class="fa-solid fa-music"></i> ${level.bpm} BPM</span>
                </div>
                <div class="level-title" style="color: ${level.primaryColor}">${level.title}</div>
                <div class="level-stats">
                    <span>LENGTH: ${level.mapLength}m</span>
                    <span>ATTEMPTS: ${this.attempts}</span>
                </div>
            </div>
        `;
    }

    startLevel(index) {
        this.currentLevelIndex = index;
        const level = LEVELS[index];

        // Reset Physics
        this.player.y = 0;
        this.player.vy = 0;
        this.player.rotation = 0;
        this.player.isGrounded = true;
        this.cameraX = 0;
        this.speed = 7.5 + index * 0.5; // Slightly faster for harder levels
        this.particles = [];
        this.trail = [];

        this.isRunning = true;
        this.isPaused = false;
        this.isGameOver = false;

        // UI Headers
        document.getElementById('hud-level-title').innerText = level.title;
        document.getElementById('hud-attempts').innerText = `ATTEMPT ${this.attempts}`;
        document.getElementById('progress-bar-fill').style.width = '0%';
        document.getElementById('progress-text').innerText = '0%';

        // Start Music Synth
        this.audio.startMusic(level.bpm, level.scale);

        // Start Game Loop
        requestAnimationFrame(() => this.gameLoop());
    }

    restartLevel() {
        this.attempts++;
        this.startLevel(this.currentLevelIndex);
    }

    togglePause() {
        if (!this.isRunning || this.isGameOver) return;
        this.isPaused = !this.isPaused;
        const pauseOverlay = document.getElementById('pause-overlay');

        if (this.isPaused) {
            pauseOverlay.classList.remove('hidden');
            document.getElementById('pause-progress').innerText = `${Math.floor(this.progress)}%`;
            document.getElementById('pause-attempts').innerText = this.attempts;
            this.audio.stopMusic();
        } else {
            pauseOverlay.classList.add('hidden');
            const level = LEVELS[this.currentLevelIndex];
            this.audio.startMusic(level.bpm, level.scale);
            requestAnimationFrame(() => this.gameLoop());
        }
    }

    onJumpPress() {
        if (!this.isRunning || this.isPaused || this.isGameOver) return;
        this.holdingJump = true;

        const level = LEVELS[this.currentLevelIndex];
        const groundY = 120; // Floor height from bottom
        const playerBottom = this.canvas.height - groundY - this.player.y - this.player.size;

        // Check Orb Ring interactions
        let hitOrb = false;
        level.obstacles.forEach(obs => {
            if (obs.type === 'orb') {
                const orbX = obs.x - this.cameraX;
                const orbY = this.canvas.height - groundY - obs.y - 20;
                const dist = Math.hypot((this.player.x + 20) - orbX, (this.canvas.height - groundY - this.player.y - 20) - orbY);

                if (dist < 45) {
                    this.player.vy = -16;
                    this.audio.playOrbPadSound(false);
                    this.createOrbBurst(orbX, orbY, '#ffb700');
                    hitOrb = true;
                }
            }
        });

        // Ground or Block Jump
        if (!hitOrb && this.player.isGrounded) {
            this.player.vy = this.player.jumpForce;
            this.player.isGrounded = false;
            this.audio.playJumpSound();
        }
    }

    triggerCrash() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.audio.playCrashSound();
        this.audio.stopMusic();

        // Create Shatter Particles
        const px = this.player.x + this.player.size / 2;
        const py = this.canvas.height - 120 - this.player.y - this.player.size / 2;

        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: px,
                y: py,
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.5) * 16,
                size: Math.random() * 8 + 4,
                color: LEVELS[this.currentLevelIndex].primaryColor,
                life: 1.0
            });
        }

        setTimeout(() => {
            this.restartLevel();
        }, 800);
    }

    triggerVictory() {
        this.isRunning = false;
        this.audio.stopMusic();
        this.audio.playVictorySound();
        document.getElementById('victory-stats').innerText = `Completed 100% in ${this.attempts} Attempts!`;
        document.getElementById('victory-overlay').classList.remove('hidden');
    }

    createOrbBurst(x, y, color) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                size: Math.random() * 5 + 2,
                color: color,
                life: 0.8
            });
        }
    }

    triggerVisualizer() {
        this.visBars.forEach(bar => {
            const h = Math.random() * 0.8 + 0.2;
            bar.style.transform = `scaleY(${h})`;
        });
    }

    // Main Game Engine Loop
    gameLoop() {
        if (!this.isRunning || this.isPaused) return;

        this.update();
        this.render();

        if (!this.isGameOver) {
            requestAnimationFrame(() => this.gameLoop());
        } else {
            // Render trailing particle animations during death screen
            this.render();
            requestAnimationFrame(() => this.gameLoop());
        }
    }

    update() {
        const level = LEVELS[this.currentLevelIndex];

        if (!this.isGameOver) {
            // Camera Forward Motion
            this.cameraX += this.speed;

            // Calculate Progress
            this.progress = Math.min(100, (this.cameraX / level.mapLength) * 100);
            document.getElementById('progress-bar-fill').style.width = `${this.progress}%`;
            document.getElementById('progress-text').innerText = `${Math.floor(this.progress)}%`;

            if (this.cameraX >= level.mapLength) {
                this.triggerVictory();
                return;
            }

            // Gravity & Physics Velocity
            this.player.vy += this.player.gravity;
            this.player.y -= this.player.vy;

            // Player Rotation in Air
            if (!this.player.isGrounded) {
                this.player.rotation += 8;
            } else {
                // Snap rotation to nearest 90 deg when landed
                this.player.rotation = Math.round(this.player.rotation / 90) * 90;
            }

            // Ground Floor Collision
            if (this.player.y <= 0) {
                this.player.y = 0;
                this.player.vy = 0;
                this.player.isGrounded = true;
            }

            // Auto-jump if holding down key/mouse
            if (this.holdingJump && this.player.isGrounded) {
                this.onJumpPress();
            }

            // Player Trail Particles
            if (Math.random() < 0.6) {
                this.trail.push({
                    x: this.player.x,
                    y: this.canvas.height - 120 - this.player.y - this.player.size / 2,
                    size: this.player.size * 0.6,
                    alpha: 0.6
                });
            }

            // Collisions with Level Objects
            const groundY = 120;
            const playerBox = {
                left: this.player.x + 6,
                right: this.player.x + this.player.size - 6,
                top: this.canvas.height - groundY - this.player.y - this.player.size + 6,
                bottom: this.canvas.height - groundY - this.player.y - 6
            };

            level.obstacles.forEach(obs => {
                const obsX = obs.x - this.cameraX;

                // Spike Hazard Hitbox
                if (obs.type === 'spike') {
                    const spikeY = obs.y || 0;
                    const spikeBox = {
                        left: obsX + 10,
                        right: obsX + 30,
                        top: this.canvas.height - groundY - spikeY - 40 + 10,
                        bottom: this.canvas.height - groundY - spikeY
                    };

                    if (this.checkAABB(playerBox, spikeBox)) {
                        this.triggerCrash();
                    }
                }

                // Block Platform
                if (obs.type === 'block') {
                    const blockBox = {
                        left: obsX,
                        right: obsX + obs.w,
                        top: this.canvas.height - groundY - obs.y - obs.h,
                        bottom: this.canvas.height - groundY - obs.y
                    };

                    if (this.checkAABB(playerBox, blockBox)) {
                        // Check if landed on top
                        const prevPlayerBottom = this.canvas.height - groundY - (this.player.y + this.player.vy) - 6;
                        if (prevPlayerBottom <= blockBox.top + 12 && this.player.vy >= 0) {
                            this.player.y = obs.y + obs.h;
                            this.player.vy = 0;
                            this.player.isGrounded = true;
                        } else {
                            // Hit side or bottom of block
                            this.triggerCrash();
                        }
                    }
                }

                // Yellow Jump Pad
                if (obs.type === 'pad') {
                    const padBox = {
                        left: obsX,
                        right: obsX + 40,
                        top: this.canvas.height - groundY - 10,
                        bottom: this.canvas.height - groundY
                    };

                    if (this.checkAABB(playerBox, padBox)) {
                        this.player.vy = -18; // Super Jump Boost
                        this.player.isGrounded = false;
                        this.audio.playOrbPadSound(true);
                        this.createOrbBurst(obsX + 20, this.canvas.height - groundY, '#00ff66');
                    }
                }
            });
        }

        // Particle System Decay Update
        this.particles.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;
            if (p.life <= 0) this.particles.splice(index, 1);
        });

        this.trail.forEach((t, index) => {
            t.alpha -= 0.05;
            if (t.alpha <= 0) this.trail.splice(index, 1);
        });

        // Beat Pulse Smoothing
        this.beatPulseScale += (1 - this.beatPulseScale) * 0.1;
    }

    checkAABB(rect1, rect2) {
        return (
            rect1.left < rect2.right &&
            rect1.right > rect2.left &&
            rect1.top < rect2.bottom &&
            rect1.bottom > rect2.top
        );
    }

    render() {
        const level = LEVELS[this.currentLevelIndex];
        const width = this.canvas.width;
        const height = this.canvas.height;
        const groundY = 120;

        // Clear Canvas with Beat-Reactive Background Glow
        this.ctx.fillStyle = level.bgColor;
        this.ctx.fillRect(0, 0, width, height);

        // Grid Background Visual Effect
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
        this.ctx.lineWidth = 1;
        const gridSize = 60;
        const offsetX = (this.cameraX * 0.5) % gridSize;

        for (let x = -offsetX; x < width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height - groundY);
            this.ctx.stroke();
        }

        // Render Ground Floor
        this.ctx.fillStyle = "#0c101c";
        this.ctx.fillRect(0, height - groundY, width, groundY);

        // Ground Neon Top Line
        this.ctx.strokeStyle = level.primaryColor;
        this.ctx.shadowColor = level.primaryColor;
        this.ctx.shadowBlur = 15 * this.beatPulseScale;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(0, height - groundY);
        this.ctx.lineTo(width, height - groundY);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0; // Reset Shadow

        // Render Player Trail
        this.trail.forEach(t => {
            this.ctx.fillStyle = level.primaryColor;
            this.ctx.globalAlpha = t.alpha;
            this.ctx.fillRect(t.x - t.size / 2, t.y - t.size / 2, t.size, t.size);
        });
        this.ctx.globalAlpha = 1.0;

        // Render Player Cube
        if (!this.isGameOver) {
            this.ctx.save();
            const px = this.player.x + this.player.size / 2;
            const py = height - groundY - this.player.y - this.player.size / 2;

            this.ctx.translate(px, py);
            this.ctx.rotate((this.player.rotation * Math.PI) / 180);

            // Cube Body Glow
            this.ctx.shadowColor = level.primaryColor;
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = level.primaryColor;
            this.ctx.fillRect(-this.player.size / 2, -this.player.size / 2, this.player.size, this.player.size);

            // Cube Inner Face Design
            this.ctx.fillStyle = "#05070c";
            this.ctx.fillRect(-this.player.size / 4, -this.player.size / 4, this.player.size / 2, this.player.size / 2);

            this.ctx.restore();
        }

        // Render Obstacles
        level.obstacles.forEach(obs => {
            const obsX = obs.x - this.cameraX;
            if (obsX < -100 || obsX > width + 100) return; // Culling

            const obsY = obs.y || 0;

            // Spike Hazard Render
            if (obs.type === 'spike') {
                const sy = height - groundY - obsY;
                this.ctx.fillStyle = "#ff0055";
                this.ctx.shadowColor = "#ff0055";
                this.ctx.shadowBlur = 10;

                this.ctx.beginPath();
                this.ctx.moveTo(obsX, sy);
                this.ctx.lineTo(obsX + 20, sy - 40);
                this.ctx.lineTo(obsX + 40, sy);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }

            // Solid Block Render
            if (obs.type === 'block') {
                const by = height - groundY - obsY - obs.h;
                this.ctx.fillStyle = "rgba(20, 30, 50, 0.9)";
                this.ctx.strokeStyle = level.primaryColor;
                this.ctx.lineWidth = 2;
                this.ctx.fillRect(obsX, by, obs.w, obs.h);
                this.ctx.strokeRect(obsX, by, obs.w, obs.h);
            }

            // Jump Pad Render
            if (obs.type === 'pad') {
                const py = height - groundY - 8;
                this.ctx.fillStyle = "#00ff66";
                this.ctx.shadowColor = "#00ff66";
                this.ctx.shadowBlur = 12;
                this.ctx.fillRect(obsX, py, 40, 8);
                this.ctx.shadowBlur = 0;
            }

            // Orb Ring Render
            if (obs.type === 'orb') {
                const oy = height - groundY - obsY;
                this.ctx.strokeStyle = "#ffb700";
                this.ctx.shadowColor = "#ffb700";
                this.ctx.shadowBlur = 15 * this.beatPulseScale;
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.arc(obsX, oy, 18, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
            }
        });

        // Render Particle FX
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        this.ctx.globalAlpha = 1.0;
    }
}

// Initialize Game Engine on Load
window.addEventListener('load', () => {
    new GameEngine();
});
</script>