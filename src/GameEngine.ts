export interface GameState {
  score: number;
  health: number;
  maxHealth: number;
  intensity: number; // For the audio engine
  gameOver: boolean;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  
  private player = { x: 0, y: 0, width: 30, height: 40, speed: 6 };
  private bullets: {x: number, y: number, speed: number, size: number, color: string}[] = [];
  private enemies: {x: number, y: number, radius: number, speed: number, hp: number}[] = [];
  private particles: {x: number, y: number, vx: number, vy: number, life: number, color: string}[] = [];
  private stars: {x: number, y: number, speed: number, size: number}[] = [];
  
  private keys: {[key: string]: boolean} = {};
  
  private lastTime = 0;
  private lastShotTime = 0;
  private lastEnemyTime = 0;
  
  private state: GameState = {
    score: 0,
    health: 100,
    maxHealth: 100,
    intensity: 0,
    gameOver: false,
  };
  
  private onStateChange: (state: GameState) => void;
  private animationFrameId: number | null = null;
  
  constructor(canvas: HTMLCanvasElement, onStateChange: (state: GameState) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onStateChange = onStateChange;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.resize();
    
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    
    this.reset();
    
    // Init stars
    for(let i=0; i<100; i++) {
        this.stars.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            speed: Math.random() * 2 + 0.5,
            size: Math.random() * 2
        });
    }
  }
  
  private resize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    if (this.player.y === 0) {
      this.player.x = this.width / 2 - this.player.width / 2;
      this.player.y = this.height - 100;
    }
  };
  
  private handleKeyDown = (e: KeyboardEvent) => {
      this.keys[e.code] = true;
  };
  
  private handleKeyUp = (e: KeyboardEvent) => {
      this.keys[e.code] = false;
  };

  public reset() {
    this.player.x = this.width / 2 - this.player.width / 2;
    this.player.y = this.height - 100;
    this.bullets = [];
    this.enemies = [];
    this.particles = [];
    this.state = {
      score: 0,
      health: 100,
      maxHealth: 100,
      intensity: 0,
      gameOver: false,
    };
    this.onStateChange(this.state);
  }

  public start() {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private loop = (time: number) => {
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    
    if (!this.state.gameOver) {
        this.update(time, dt);
    }
    this.draw();
    
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(time: number, dt: number) {
    // Player movement
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) this.player.x -= this.player.speed;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) this.player.x += this.player.speed;
    if (this.keys['ArrowUp'] || this.keys['KeyW']) this.player.y -= this.player.speed;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) this.player.y += this.player.speed;
    
    // Constraints
    this.player.x = Math.max(0, Math.min(this.width - this.player.width, this.player.x));
    this.player.y = Math.max(0, Math.min(this.height - this.player.height, this.player.y));
    
    // Shooting
    if (this.keys['Space'] && time - this.lastShotTime > 150) {
        this.bullets.push({
            x: this.player.x + this.player.width / 2 - 2,
            y: this.player.y,
            speed: 12,
            size: 4,
            color: '#0ff'
        });
        this.lastShotTime = time;
    }
    
    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
        this.bullets[i].y -= this.bullets[i].speed;
        if (this.bullets[i].y < -10) {
            this.bullets.splice(i, 1);
        }
    }
    
    // Spawn enemies
    // Spawn faster as score increases
    const spawnRate = Math.max(200, 1000 - this.state.score * 5);
    if (time - this.lastEnemyTime > spawnRate) {
        this.enemies.push({
            x: Math.random() * (this.width - 40) + 20,
            y: -30,
            radius: 15 + Math.random() * 10,
            speed: 2 + Math.random() * 3 + (this.state.score / 200),
            hp: 1 + Math.floor(this.state.score / 500)
        });
        this.lastEnemyTime = time;
    }
    
    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        enemy.y += enemy.speed;
        
        // Out of bounds
        if (enemy.y > this.height + 30) {
            this.state.health -= 5;
            this.enemies.splice(i, 1);
            this.createGlitchEffect();
            continue;
        }
        
        // Collision with player
        const dx = (this.player.x + this.player.width / 2) - enemy.x;
        const dy = (this.player.y + this.player.height / 2) - enemy.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < enemy.radius + 15) {
            this.state.health -= 15;
            this.createExplosion(enemy.x, enemy.y, '#f0f');
            this.enemies.splice(i, 1);
            this.createGlitchEffect();
            continue;
        }
    }
    
    // Bullet collisions
    for (let i = this.bullets.length - 1; i >= 0; i--) {
        let hit = false;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
            const bx = this.bullets[i].x;
            const by = this.bullets[i].y;
            const ex = this.enemies[j].x;
            const ey = this.enemies[j].y;
            const dist = Math.sqrt((bx-ex)*(bx-ex) + (by-ey)*(by-ey));
            
            if (dist < this.enemies[j].radius) {
                this.enemies[j].hp--;
                hit = true;
                this.createHitParticles(bx, by, '#0ff');
                if (this.enemies[j].hp <= 0) {
                    this.state.score += 10;
                    this.createExplosion(ex, ey, '#f0f');
                    this.enemies.splice(j, 1);
                }
                break;
            }
        }
        if (hit) {
            this.bullets.splice(i, 1);
        }
    }
    
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
        this.particles[i].x += this.particles[i].vx;
        this.particles[i].y += this.particles[i].vy;
        this.particles[i].life -= dt * 3;
        if (this.particles[i].life <= 0) {
            this.particles.splice(i, 1);
        }
    }
    
    // Update stars
    for(let star of this.stars) {
        star.y += star.speed;
        if (star.y > this.height) {
            star.y = 0;
            star.x = Math.random() * this.width;
        }
    }
    
    // Clamp health
    if (this.state.health <= 0) {
        this.state.health = 0;
        this.state.gameOver = true;
    }
    
    // Update intensity
    // Based on enemy count + score multiplier
    const baseIntensity = Math.min(1, this.enemies.length / 10);
    const scoreFactor = Math.min(0.5, this.state.score / 2000);
    this.state.intensity = Math.min(1, baseIntensity + scoreFactor);
    
    this.onStateChange({...this.state});
  }

  private createExplosion(x: number, y: number, color: string) {
      for(let i=0; i<15; i++) {
          this.particles.push({
              x, y,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              life: 1.0,
              color: color
          });
      }
  }

  private createHitParticles(x: number, y: number, color: string) {
      for(let i=0; i<5; i++) {
          this.particles.push({
              x, y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              life: 0.5,
              color: color
          });
      }
  }

  private createGlitchEffect() {
      // Small screen shake implemented in the draw method
      this.ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
  }

  private draw() {
    this.ctx.fillStyle = '#00020a';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw stars
    this.ctx.fillStyle = '#ffffff';
    for(let star of this.stars) {
        this.ctx.globalAlpha = Math.random() > 0.9 ? 0.3 : 0.8;
        this.ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    this.ctx.globalAlpha = 1.0;
    
    // Draw player
    this.ctx.fillStyle = '#0ff';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#0ff';
    
    // Cyberpunk ship shape
    this.ctx.beginPath();
    this.ctx.moveTo(this.player.x + this.player.width / 2, this.player.y);
    this.ctx.lineTo(this.player.x + this.player.width, this.player.y + this.player.height);
    this.ctx.lineTo(this.player.x + this.player.width / 2, this.player.y + this.player.height - 10);
    this.ctx.lineTo(this.player.x, this.player.y + this.player.height);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Draw bullets
    this.ctx.shadowColor = '#0ff';
    for(let b of this.bullets) {
        this.ctx.fillStyle = b.color;
        this.ctx.fillRect(b.x, b.y, b.size, b.size * 3);
    }
    
    // Draw enemies
    this.ctx.shadowColor = '#f0f';
    for(let e of this.enemies) {
        this.ctx.fillStyle = '#000';
        this.ctx.strokeStyle = '#f0f';
        this.ctx.lineWidth = 2;
        
        // Diamond shape
        this.ctx.beginPath();
        this.ctx.moveTo(e.x, e.y - e.radius);
        this.ctx.lineTo(e.x + e.radius, e.y);
        this.ctx.lineTo(e.x, e.y + e.radius);
        this.ctx.lineTo(e.x - e.radius, e.y);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    // Draw particles
    for(let p of this.particles) {
        this.ctx.fillStyle = p.color;
        this.ctx.shadowColor = p.color;
        this.ctx.globalAlpha = p.life;
        this.ctx.fillRect(p.x, p.y, 4, 4);
    }
    this.ctx.globalAlpha = 1.0;
    this.ctx.shadowBlur = 0;
    
    // Reset transform (if glitch shake was applied)
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}
