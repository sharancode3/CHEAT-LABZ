import { GameShell } from './game-shell.js';

export default class LoopRally extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas, config);

    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.arenaRadius = 250;
    
    this.arena = { scale: 1.0 };

    this.player = { angle: Math.PI / 2, width: 0.8, radius: this.arenaRadius - 10, vAngle: 0 };
    this.ai = { angle: -Math.PI / 2, width: 0.8, radius: this.arenaRadius - 10, speed: 0.6 };
    
    this.baseSpeed = 300;
    this.ball = { x: this.centerX, y: this.centerY, vx: 0, vy: 0, radius: 8, speed: this.baseSpeed };
    this.ballTrail = [];
    this.lives = 3;
    
    this.rallyCount = 0;

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.state === 'PLAYING') {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX - this.centerX;
        const my = (e.clientY - rect.top) * scaleY - this.centerY;
        
        const newAngle = Math.atan2(my, mx);
        let diff = newAngle - this.player.angle;
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        this.player.vAngle = diff * 60;
        this.player.angle = newAngle;
      }
    });
  }

  onStart() {
    this.lives = 3;
    this.score = 0;
    this.updateScore(0);
    this.rallyCount = 0;
    this.ai.speed = 0.6;
    this.resetBall();
    this.player.angle = Math.PI / 2;
    this.ai.angle = -Math.PI / 2;
  }

  resetBall() {
    this.ball.x = this.centerX;
    this.ball.y = this.centerY;
    this.ball.speed = this.baseSpeed;
    this.rallyCount = 0;
    const angle = (Math.random() - 0.5) * Math.PI - Math.PI/2;
    this.ball.vx = Math.cos(angle) * this.ball.speed;
    this.ball.vy = Math.sin(angle) * this.ball.speed;
    this.ballTrail = [];
  }

  update(dtMs) {
    const dt = dtMs / 1000;

    const ballDx = this.ball.x - this.centerX;
    const ballDy = this.ball.y - this.centerY;
    const targetAngle = Math.atan2(ballDy, ballDx);
    
    let aiDiff = targetAngle - this.ai.angle;
    while(aiDiff > Math.PI) aiDiff -= Math.PI * 2;
    while(aiDiff < -Math.PI) aiDiff += Math.PI * 2;
    
    this.ai.angle += aiDiff * 0.05 * this.ai.speed;

    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    this.ballTrail.push({x: this.ball.x, y: this.ball.y});
    if (this.ballTrail.length > 8) this.ballTrail.shift();

    const dx = this.ball.x - this.centerX;
    const dy = this.ball.y - this.centerY;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist + this.ball.radius >= this.arenaRadius) {
      const hitAngle = Math.atan2(dy, dx);
      
      let hitPlayer = this.isAngleInArc(hitAngle, this.player.angle, this.player.width);
      let hitAi = this.isAngleInArc(hitAngle, this.ai.angle, this.ai.width);

      if (hitPlayer || hitAi) {
        let diff = hitAngle - (hitPlayer ? this.player.angle : this.ai.angle);
        while(diff > Math.PI) diff -= Math.PI * 2;
        while(diff < -Math.PI) diff += Math.PI * 2;
        
        const paddleWidth = hitPlayer ? this.player.width : this.ai.width;
        const paddleZone = (diff / paddleWidth) + 0.5;
        const angleOffset = (paddleZone - 0.5) * 120 * (Math.PI/180);
        
        const outAngle = (hitPlayer ? this.player.angle : this.ai.angle) + Math.PI + angleOffset;

        this.rallyCount++;
        this.ball.speed = Math.min(this.baseSpeed * 2.0, this.ball.speed * 1.02);

        this.ball.vx = this.ball.speed * Math.cos(outAngle);
        this.ball.vy = this.ball.speed * Math.sin(outAngle);

        const nx = dx / dist;
        const ny = dy / dist;
        this.ball.x = this.centerX + nx * (this.arenaRadius - this.ball.radius - 1);
        this.ball.y = this.centerY + ny * (this.arenaRadius - this.ball.radius - 1);

        if (window.gsap) {
          gsap.killTweensOf(this.arena);
          this.arena.scale = 0.95;
          gsap.to(this.arena, { scale: 1.0, duration: 0.8, ease: "elastic.out(1, 0.3)" });
        }
        
        if (hitAi) {
          this.scorePoint();
        }
      } else {
        if (dy > 0) {
          this.loseLife();
        } else {
          this.resetBall();
        }
      }
    }
  }

  isAngleInArc(angle, centerAngle, width) {
    let diff = angle - centerAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) <= width / 2;
  }

  scorePoint() {
    this.score += 10;
    this.updateScore(this.score);
    this.ai.speed = Math.min(1.0, this.ai.speed + 0.05);
  }

  loseLife() {
    this.lives--;
    this.canvas.classList.add('shake');
    setTimeout(() => this.canvas.classList.remove('shake'), 200);

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.resetBall();
    }
  }

  draw() {
    this.ctx.fillStyle = '#09090B';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.scale(this.arena.scale, this.arena.scale);

    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, this.arenaRadius);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.02)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.1)');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.arenaRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.setLineDash([5, 10]);
    this.ctx.beginPath();
    this.ctx.moveTo(-this.arenaRadius, 0);
    this.ctx.lineTo(this.arenaRadius, 0);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.player.radius, this.player.angle - this.player.width/2, this.player.angle + this.player.width/2);
    this.ctx.strokeStyle = '#8B5CF6';
    this.ctx.lineWidth = 8;
    this.ctx.lineCap = 'round';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#8B5CF6';
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.ai.radius, this.ai.angle - this.ai.width/2, this.ai.angle + this.ai.width/2);
    this.ctx.strokeStyle = '#EF4444';
    this.ctx.lineWidth = 8;
    this.ctx.lineCap = 'round';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#EF4444';
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    this.ctx.restore();

    for (let i = 0; i < this.ballTrail.length; i++) {
      const pos = this.ballTrail[i];
      const alpha = (i + 1) / this.ballTrail.length * 0.5;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.ball.radius * 0.8, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
      this.ctx.fill();
    }

    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = '#06B6D4';
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = '#06B6D4';
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = '#EF4444';
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('♥'.repeat(this.lives), 20, 40);
  }
}
