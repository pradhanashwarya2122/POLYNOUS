import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let neurons = [];
    let mouse = { x: null, y: null };
    let time = 0;
    let animationId = null;

    const COLORS = {
      left: '#00ff0f',
      right: '#ff2040',
      center: '#00ccff',
    };

    class Neuron {
      constructor(originX, originY, color, side) {
        this.originX = originX;
        this.originY = originY;
        this.x = originX;
        this.y = originY;
        this.color = color;
        this.side = side;
        this.radius = Math.random() * 2.0 + 2.5;
        this.swaySeed = Math.random() * 1000;
        this.swaySpeed = 0.0005 + Math.random() * 0.001;
        this.swayAmount = 15 + Math.random() * 20;
        this.vx = 0;
        this.vy = 0;
        this.activationLevel = 0;
        this.phase = Math.random() * Math.PI * 2;
      }

      update() {
        const swayX = Math.sin(time * this.swaySpeed + this.swaySeed) * this.swayAmount;
        const swayY = Math.cos(time * this.swaySpeed * 1.2 + this.swaySeed) * (this.swayAmount * 0.7);
        const targetX = this.originX + swayX;
        const targetY = this.originY + swayY;

        let repulsionX = 0;
        let repulsionY = 0;

        if (mouse.x !== null) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          const repulsionRadius = 250;
          if (distSq < repulsionRadius * repulsionRadius) {
            const dist = Math.sqrt(distSq);
            const force = (repulsionRadius - dist) / repulsionRadius;
            const angle = Math.atan2(dy, dx);
            repulsionX = Math.cos(angle) * force * 50;
            repulsionY = Math.sin(angle) * force * 50;
            this.activationLevel = Math.max(this.activationLevel, force);
          }
        }

        const springK = 0.08;
        const damping = 0.85;
        const ax = (targetX + repulsionX - this.x) * springK;
        const ay = (targetY + repulsionY - this.y) * springK;
        this.vx = (this.vx + ax) * damping;
        this.vy = (this.vy + ay) * damping;
        this.x += this.vx;
        this.y += this.vy;
        this.activationLevel *= 0.95;
        this.phase += 0.02;
      }

      draw() {
        const breathing = Math.sin(this.phase) * 0.5 + 0.5;
        const r = this.radius + (this.activationLevel * 6);
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.35 + (breathing * 0.15) + (this.activationLevel * 0.5);
        ctx.shadowBlur = 10 + (25 * this.activationLevel);
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    function createBrainPoints(width, height) {
      neurons = [];
      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) * 0.38;
      const density = 500;

      for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.5) * scale;
        const isLeft = Math.random() > 0.5;
        const lobeOffset = scale * 0.15;
        const stretchX = 1.1;
        const stretchY = 1.3;
        let px = Math.cos(angle) * r * stretchX;
        let py = Math.sin(angle) * r * stretchY;
        px += isLeft ? -lobeOffset : lobeOffset;
        const originX = centerX + px;
        const originY = centerY + py;
        let color;
        const distFromMid = Math.abs(px);
        if (distFromMid < scale * 0.2) color = COLORS.center;
        else if (px < 0) color = COLORS.left;
        else color = COLORS.right;
        neurons.push(new Neuron(originX, originY, color));
      }
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createBrainPoints(canvas.width, canvas.height);
    }

    function animate(timestamp) {
      time = timestamp;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const connectionRadius = 90;
      const connectionRadiusSq = connectionRadius * connectionRadius;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < neurons.length; i++) {
        const n1 = neurons[i];
        n1.update();
        for (let j = 1; j <= 12; j++) {
          const idx = (i + j) % neurons.length;
          const n2 = neurons[idx];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < connectionRadiusSq) {
            const dist = Math.sqrt(distSq);
            const opacity = (1 - dist / connectionRadius) * 0.18 + (n1.activationLevel * 0.35);
            if (opacity > 0.01) {
              ctx.beginPath();
              ctx.moveTo(n1.x, n1.y);
              ctx.lineTo(n2.x, n2.y);
              const grad = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
              grad.addColorStop(0, n1.color);
              grad.addColorStop(1, n2.color);
              ctx.strokeStyle = grad;
              ctx.globalAlpha = opacity;
              ctx.stroke();
            }
          }
        }
      }
      neurons.forEach(n => n.draw());
      animationId = requestAnimationFrame(animate);
    }

    const handleMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const handleMouseLeave = () => { mouse.x = null; mouse.y = null; };
    const handleMouseDown = (e) => {
      neurons.forEach(n => {
        const dx = n.x - e.clientX;
        const dy = n.y - e.clientY;
        if (Math.sqrt(dx*dx + dy*dy) < 200) {
          n.activationLevel = 1.0;
          n.vx += dx * 0.15;
          n.vy += dy * 0.15;
        }
      });
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mousedown', handleMouseDown);
    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousedown', handleMouseDown);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  const handleGetStarted = () => {
    // Check if already logged in
    const token = localStorage.getItem('polynous_token')
    if (token) {
      navigate('/dashboard')
    } else {
      navigate('/auth')
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText('npm install polynous');
    alert('Command copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-[#05050A] overflow-x-hidden font-['Hanken_Grotesk'] relative">
      <canvas ref={canvasRef} id="neural-canvas" className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none" />
      
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center">
        {/* Hero Section */}
        <div className="max-w-4xl space-y-8">
          <h1 className="font-['Sora'] text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
            <span className="block mb-2 bg-gradient-to-br from-white via-white to-[#8899aa] bg-clip-text text-transparent">The First AI Memory That</span>
            <span className="bg-gradient-to-r from-[#00ff0f] via-[#00ccff] to-[#ff2040] bg-clip-text text-transparent">Thinks Like a Brain</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-[#8899aa] font-['Hanken_Grotesk'] leading-relaxed opacity-80">
            5-layer cognitive architecture. Zero-LLM ingestion pipeline. Self-improving memory that decays, consolidates, and reasons - like a real brain. The memory OS that every other system forgot to build.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <button 
              onClick={handleGetStarted}
              className="px-8 py-4 rounded-full bg-[#00ccff] text-[#05050A] font-bold text-lg hover:shadow-[0_0_30px_rgba(0,204,255,0.4)] hover:brightness-110 active:scale-95 transition-all duration-300"
            >
              Get Started →
            </button>
            <a 
              href="https://github.com/pradhanashwarya2122/POLYNOUS"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white font-semibold text-lg flex items-center gap-2 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              <span className="material-symbols-outlined">terminal</span>
              View on GitHub
            </a>
          </div>
        </div>

        {/* Terminal Bottom */}
        <div className="mt-24 w-full max-w-lg">
          <div className="bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[#00ccff] font-['JetBrains_Mono']">$</span>
              <code className="font-['JetBrains_Mono'] text-white/90 text-sm relative">
                npm install polynous
                <span className="absolute -right-4 animate-pulse">_</span>
              </code>
            </div>
            <button 
              onClick={copyToClipboard}
              className="text-white/30 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">content_copy</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LandingPage;