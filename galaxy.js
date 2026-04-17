const canvas = document.getElementById('galaxy-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let stars = [];
let planets = [];
let shootingStars = [];
let bigSpaceship;
let mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

// Initialize resizing
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initEnvironment();
}
window.addEventListener('resize', resize);

// Mouse interaction for parallax effect
window.addEventListener('mousemove', (e) => {
    mouse.targetX = (e.clientX - width / 2) * 0.05;
    mouse.targetY = (e.clientY - height / 2) * 0.05;
});

const starColors = ['#ffffff', '#ffe9c4', '#d4fbff', '#ffdddd'];

// Star Class (Multilayer depth)
class Star {
    constructor() {
        this.x = Math.random() * width * 2 - width * 0.5;
        this.y = Math.random() * height * 2 - height * 0.5;
        this.z = Math.random() * 3 + 0.1; // depth
        this.size = Math.random() * 1.2 + 0.2;
        this.baseX = this.x;
        this.baseY = this.y;
        this.blink = Math.random() * Math.PI * 2;
        this.color = starColors[Math.floor(Math.random() * starColors.length)];
    }
    update() {
        this.x = this.baseX - mouse.x * this.z;
        this.y = this.baseY - mouse.y * this.z;
        this.blink += 0.01;
    }
    draw() {
        const opacity = (Math.sin(this.blink) + 1) / 2 * 0.7 + 0.3;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Planet Class with Realistic Textures and Shadows
class Planet {
    constructor(x, y, radius, colors, speed, hasRings = false, ringAngle = 0, isSun = false) {
        this.baseX = x;
        this.baseY = y;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.colors = colors;
        this.speed = speed;
        this.hasRings = hasRings;
        this.ringAngle = ringAngle;
        this.isSun = isSun;
    }
    update() {
        this.x = this.baseX - mouse.x * this.speed;
        this.y = this.baseY - mouse.y * this.speed;
    }
    draw() {
        ctx.save();
        
        // 1. Base Planet Surface
        const grad = ctx.createLinearGradient(
            this.x - this.radius, this.y - this.radius, 
            this.x + this.radius, this.y + this.radius
        );
        this.colors.forEach((c, i) => grad.addColorStop(i / (this.colors.length - 1), c));
        
        if (this.isSun) {
            ctx.shadowBlur = 60;
            ctx.shadowColor = this.colors[1];
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 2. Realistic 3D Shadow (Crescent) for non-suns
        if (!this.isSun) {
            const shadowGrad = ctx.createRadialGradient(
                this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.1,
                this.x, this.y, this.radius
            );
            shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
            shadowGrad.addColorStop(0.6, 'rgba(0,0,0,0.5)');
            shadowGrad.addColorStop(1, 'rgba(0,0,0,0.95)');
            
            ctx.fillStyle = shadowGrad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. Rings
        if (this.hasRings) {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.ringAngle);
            
            // Outer dusty ring
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius * 2.2, this.radius * 0.25, 0, 0, Math.PI * 2);
            ctx.lineWidth = 15;
            ctx.strokeStyle = `rgba(180, 160, 130, 0.15)`;
            ctx.stroke();
            
            // Inner solid ring
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius * 1.9, this.radius * 0.22, 0, 0, Math.PI * 2);
            ctx.lineWidth = 5;
            ctx.strokeStyle = `rgba(200, 180, 150, 0.5)`;
            ctx.stroke();
            
            ctx.rotate(-this.ringAngle);
            ctx.translate(-this.x, -this.y);
        }
        ctx.restore();
    }
}

// Shooting Star Class
class ShootingStar {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * width * 1.5;
        this.y = -50;
        this.length = Math.random() * 80 + 40;
        this.speed = Math.random() * 10 + 10;
        this.opacity = 0;
        this.active = false;
        this.delay = Math.random() * 400 + 100;
    }
    update() {
        if (!this.active) {
            this.delay--;
            if (this.delay <= 0) this.active = true;
            return;
        }
        this.x -= this.speed;
        this.y += this.speed;
        this.opacity += 0.05;
        if (this.opacity > 1) this.opacity = 1;
        
        if (this.y > height + 100 || this.x < -100) {
            this.reset();
        }
    }
    draw() {
        if (!this.active) return;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.length, this.y - this.length);
        let grad = ctx.createLinearGradient(this.x, this.y, this.x + this.length, this.y - this.length);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }
}

// Huge Background Spaceship (Star Citizen Style - White/Dark Bulky Dropship)
class BigSpaceship {
    constructor() {
        this.reset();
    }
    reset() {
        // Start far off-screen
        this.x = -500;
        this.y = height * 0.7 + (Math.random() * 200 - 100); // Lower half mostly
        this.speedX = 0.5 + Math.random() * 0.3; // Slow majestic movement
        this.speedY = (Math.random() - 0.5) * 0.1;
        this.scale = 0.8 + Math.random() * 0.4;
        this.engineFlicker = 0;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.engineFlicker += 0.2;
        
        // Reset if it goes way past the screen
        if (this.x > width + 800) {
            this.reset();
            this.x = -800; // start further back next time
        }
    }
    draw() {
        ctx.save();
        // Base translation and slight parallax effect
        ctx.translate(this.x - mouse.x * 0.2, this.y - mouse.y * 0.2);
        ctx.scale(this.scale, this.scale);
        
        // Tilt slightly based on movement
        ctx.rotate(Math.atan2(this.speedY, this.speedX));

        // --- ENGINE FIRE & THRUSTERS (Blue Plasma) ---
        let flicker = Math.sin(this.engineFlicker) * 0.2 + 0.8; // values between 0.6 and 1.0
        
        const drawFlame = (x, y, len, w) => {
            let grad = ctx.createLinearGradient(x, y, x - len, y);
            grad.addColorStop(0, `rgba(255, 255, 255, ${flicker})`); // White hot core
            grad.addColorStop(0.2, `rgba(80, 216, 255, ${flicker * 0.9})`); // Bright Cyan
            grad.addColorStop(0.6, `rgba(0, 100, 255, ${flicker * 0.5})`);  // Deep Blue
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(x, y - w/2);
            ctx.lineTo(x - len, y);
            ctx.lineTo(x, y + w/2);
            ctx.fill();
        };

        ctx.shadowBlur = 40 * flicker;
        ctx.shadowColor = '#50d8ff';
        
        // Main rear flames
        drawFlame(-100, -15, 150 + Math.random()*30, 25);
        drawFlame(-100, 15, 150 + Math.random()*30, 25);
        
        // Large Pod rear flames
        drawFlame(-80, -110, 120 + Math.random()*20, 30);
        drawFlame(-80, 110, 120 + Math.random()*20, 30);

        // Small front pod flames
        drawFlame(20, -65, 80 + Math.random()*15, 15);
        drawFlame(20, 65, 80 + Math.random()*15, 15);

        ctx.shadowBlur = 0;

        // --- SHIP HULL (Bulky White/Dark Grey Design) ---
        
        // Dark Underbelly / Main Wing structures
        ctx.fillStyle = '#1e2124';
        ctx.beginPath();
        ctx.moveTo(120, 0);
        ctx.lineTo(60, 60);
        ctx.lineTo(-30, 120); // Wing out
        ctx.lineTo(-80, 120); // Wing back
        ctx.lineTo(-60, 60);  // Wing in
        ctx.lineTo(-100, 40); // Rear body
        ctx.lineTo(-100, -40);
        ctx.lineTo(-60, -60);
        ctx.lineTo(-80, -120);
        ctx.lineTo(-30, -120);
        ctx.lineTo(60, -60);
        ctx.closePath();
        ctx.fill();

        // White Main Armor (Top Carapace)
        ctx.fillStyle = '#f0f2f5';
        ctx.beginPath();
        ctx.moveTo(130, 0);     // Nose
        ctx.lineTo(110, 15);
        ctx.lineTo(70, 35);
        ctx.lineTo(0, 45);
        ctx.lineTo(-80, 40);
        ctx.lineTo(-90, 0);
        ctx.lineTo(-80, -40);
        ctx.lineTo(0, -45);
        ctx.lineTo(70, -35);
        ctx.lineTo(110, -15);
        ctx.closePath();
        ctx.fill();

        // Secondary Dark Panels on top
        ctx.fillStyle = '#2c3035';
        ctx.beginPath();
        ctx.moveTo(80, -20);
        ctx.lineTo(90, -10);
        ctx.lineTo(90, 10);
        ctx.lineTo(80, 20);
        ctx.lineTo(-60, 25);
        ctx.lineTo(-70, 0);
        ctx.lineTo(-60, -25);
        ctx.closePath();
        ctx.fill();
        
        // White top center ridge
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(50, -10);
        ctx.lineTo(60, 0);
        ctx.lineTo(50, 10);
        ctx.lineTo(-50, 12);
        ctx.lineTo(-50, -12);
        ctx.closePath();
        ctx.fill();

        // Cockpit Window (Dark Glass)
        ctx.fillStyle = '#0d1117';
        ctx.beginPath();
        ctx.moveTo(115, 0);
        ctx.lineTo(100, 10);
        ctx.lineTo(85, 10);
        ctx.lineTo(95, 0);
        ctx.lineTo(85, -10);
        ctx.lineTo(100, -10);
        ctx.closePath();
        ctx.fill();

        // Large Engine Pods (VTOL nacelles)
        const drawPod = (x, y) => {
            ctx.save();
            ctx.translate(x, y);
            
            // Pod shadow/base
            ctx.fillStyle = '#15181b';
            ctx.fillRect(-45, -25, 90, 50);
            
            // Pod white armor
            ctx.fillStyle = '#f0f2f5';
            ctx.beginPath();
            ctx.moveTo(40, -15);
            ctx.lineTo(-30, -20);
            ctx.lineTo(-40, -10);
            ctx.lineTo(-40, 10);
            ctx.lineTo(-30, 20);
            ctx.lineTo(40, 15);
            ctx.closePath();
            ctx.fill();
            
            // Pod dark accents
            ctx.fillStyle = '#2c3035';
            ctx.fillRect(-20, -15, 30, 30);
            
            // Front intake
            ctx.fillStyle = '#0a0a0c';
            ctx.fillRect(35, -10, 10, 20);
            
            ctx.restore();
        };

        drawPod(-40, -110); // Left Large Pod
        drawPod(-40, 110);  // Right Large Pod
        
        // Front smaller pods
        const drawSmallPod = (x, y) => {
            ctx.save();
            ctx.translate(x, y);
            // Shadow/base
            ctx.fillStyle = '#15181b';
            ctx.fillRect(-25, -12, 50, 24);
            // White armor
            ctx.fillStyle = '#f0f2f5';
            ctx.fillRect(-20, -10, 40, 20);
            // Dark accent
            ctx.fillStyle = '#2c3035';
            ctx.fillRect(-10, -8, 20, 16);
            // Intake
            ctx.fillStyle = '#0a0a0c';
            ctx.fillRect(15, -6, 5, 12);
            ctx.restore();
        };
        
        drawSmallPod(40, -65);
        drawSmallPod(40, 65);

        // Front prongs / heavy forward guns
        ctx.fillStyle = '#1e2124';
        ctx.fillRect(120, -25, 30, 4);
        ctx.fillRect(120, 21, 30, 4);
        ctx.fillRect(140, -26, 20, 2);
        ctx.fillRect(140, 24, 20, 2);

        // Ship lights (Blinking red and blue)
        let blink = Math.sin(this.engineFlicker * 0.5) > 0 ? 1 : 0.2;
        ctx.fillStyle = `rgba(255, 0, 50, ${blink})`;
        ctx.beginPath(); ctx.arc(-30, -120, 3, 0, Math.PI*2); ctx.fill(); // Top pod light
        ctx.fillStyle = `rgba(0, 200, 255, ${blink})`;
        ctx.beginPath(); ctx.arc(-30, 120, 3, 0, Math.PI*2); ctx.fill(); // Bottom pod light
        
        ctx.restore();
    }
}

function initEnvironment() {
    stars = [];
    for (let i = 0; i < 800; i++) {
        stars.push(new Star());
    }
    
    planets = [
        // Realistic Saturn/Jupiter gas giant
        new Planet(width * 0.85, height * 0.25, 80, ['#e3c193', '#c79b63', '#a36d38', '#5c3a21'], 1.2, true, Math.PI / 7),
        // Realistic Earth-like water planet
        new Planet(width * 0.15, height * 0.75, 45, ['#4b8fa6', '#2b5d73', '#1a3c4b'], 2.5),
        // Realistic Mars-like rocky planet
        new Planet(width * 0.75, height * 0.8, 20, ['#c1440e', '#e77d11', '#451804'], 3.5),
        // Distant realistic Sun
        new Planet(width * 0.1, height * 0.15, 50, ['#ffffff', '#fff4e0', '#ffcc80'], 0.3, false, 0, true)
    ];

    shootingStars = [];
    for (let i = 0; i < 3; i++) {
        shootingStars.push(new ShootingStar());
    }

    bigSpaceship = new BigSpaceship();
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    // Smooth mouse follow
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    // Realistic Deep Space Background
    ctx.fillStyle = '#020204';
    ctx.fillRect(0, 0, width, height);
    
    // Milky way faint glow
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, 'rgba(15, 20, 35, 0.6)');
    bgGrad.addColorStop(0.5, 'rgba(5, 5, 12, 0.8)');
    bgGrad.addColorStop(1, 'rgba(25, 15, 25, 0.5)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Draw everything
    stars.forEach(s => { s.update(); s.draw(); });
    
    // Draw the big spaceship behind the planets
    bigSpaceship.update();
    bigSpaceship.draw();

    planets.forEach(p => { p.update(); p.draw(); });
    shootingStars.forEach(s => { s.update(); s.draw(); });

    requestAnimationFrame(animate);
}

// Start
resize();
animate();