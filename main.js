const G = 0.5; // Gravitational constant for our simplified simulation
const FPS = 60;
const TIME_STEP = 1000 / FPS;

const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

let planets = [];
let comets = [];
let particles = [];
let mode = 'planet'; // 'planet' or 'comet' or 'edit'
let showOrbits = true;
let simulationSpeed = 1;
let selectedObject = null;
let selectedType = null;

// Zoom configuration
const zoomLevels = [1, 0.5, 0.25];
let zoomIndex = 0;

function getMousePos(clientX, clientY) {
  const zoom = zoomLevels[zoomIndex];
  return {
    x: (clientX - canvas.width / 2) / zoom + canvas.width / 2,
    y: (clientY - canvas.height / 2) / zoom + canvas.height / 2
  };
}

// UI Elements
const btnPlanet = document.getElementById('btnPlanet');
const btnComet = document.getElementById('btnComet');
const btnEdit = document.getElementById('btnEdit');
const massInput = document.getElementById('massInput');
const massValue = document.getElementById('massValue');
const radiusInput = document.getElementById('radiusInput');
const radiusValue = document.getElementById('radiusValue');
const btnToggleOrbits = document.getElementById('btnToggleOrbits');
const btnClear = document.getElementById('btnClear');
const instructionText = document.getElementById('instructionText');
const massControlGroup = document.getElementById('massControlGroup');
const btnDelete = document.getElementById('btnDelete');
const editActions = document.getElementById('editActions');
const chkPermanentOrbits = document.getElementById('chkPermanentOrbits');
const chkCollisions = document.getElementById('chkCollisions');
const cometControlGroup = document.getElementById('cometControlGroup');
const editControlGroup = document.getElementById('editControlGroup');
const chkShowMass = document.getElementById('chkShowMass');
const btnSpeed1 = document.getElementById('btnSpeed1');
const btnSpeed5 = document.getElementById('btnSpeed5');
const btnSpeed20 = document.getElementById('btnSpeed20');

// Resize canvas to fill window
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// UI Event Listeners
btnPlanet.addEventListener('click', () => {
  mode = 'planet';
  btnPlanet.classList.add('active');
  btnComet.classList.remove('active');
  btnEdit.classList.remove('active');
  selectedObject = null;
  selectedType = null;
  editActions.style.display = 'none';
  cometControlGroup.style.display = 'none';
  editControlGroup.style.display = 'none';
  massControlGroup.style.display = 'flex';
  btnClear.style.display = 'none';
  instructionText.innerHTML = "<b>Planet Mode:</b> Click anywhere to place a Planet.";
});

btnComet.addEventListener('click', () => {
  mode = 'comet';
  btnComet.classList.add('active');
  btnPlanet.classList.remove('active');
  btnEdit.classList.remove('active');
  selectedObject = null;
  selectedType = null;
  editActions.style.display = 'none';
  cometControlGroup.style.display = 'flex'; // Show comet controls only here
  editControlGroup.style.display = 'none';
  massControlGroup.style.display = 'none';
  btnClear.style.display = 'none';
  instructionText.innerHTML = "<b>Comet Mode:</b> Click and drag to shoot a comet. Longer drag = higher speed.";
});

btnEdit.addEventListener('click', () => {
  mode = 'edit';
  btnEdit.classList.add('active');
  btnPlanet.classList.remove('active');
  btnComet.classList.remove('active');
  selectedObject = null;
  selectedType = null;
  editActions.style.display = 'none';
  cometControlGroup.style.display = 'none';
  editControlGroup.style.display = 'flex';
  massControlGroup.style.display = 'flex'; // Default show for instructions
  btnClear.style.display = 'block';
  instructionText.innerHTML = "<b>Edit Mode:</b> Click an object to select it, change mass, or delete it.";
});

massInput.addEventListener('input', (e) => {
  massValue.textContent = e.target.value;
  if (selectedObject && selectedType === 'planet' && mode === 'edit') {
    selectedObject.mass = parseFloat(e.target.value);
  }
});

radiusInput.addEventListener('input', (e) => {
  radiusValue.textContent = e.target.value;
  if (selectedObject && selectedType === 'planet' && mode === 'edit') {
    selectedObject.radius = parseFloat(e.target.value);
  }
});

btnToggleOrbits.addEventListener('click', () => {
  showOrbits = !showOrbits;
  btnToggleOrbits.textContent = showOrbits ? 'Hide Orbits' : 'Show Orbits';
});

btnClear.addEventListener('click', () => {
  planets = [];
  comets = [];
  particles = [];
  selectedObject = null;
  selectedType = null;
  editActions.style.display = 'none';
});

btnDelete.addEventListener('click', () => {
  if (selectedType === 'planet') {
    planets = planets.filter(p => p !== selectedObject);
  } else if (selectedType === 'comet') {
    comets = comets.filter(c => c !== selectedObject);
  }
  selectedObject = null;
  selectedType = null;
  editActions.style.display = 'none';
  massControlGroup.style.display = 'none';
});

function setSpeed(speed, activeBtn) {
  simulationSpeed = speed;
  btnSpeed1.classList.remove('active');
  btnSpeed5.classList.remove('active');
  btnSpeed20.classList.remove('active');
  activeBtn.classList.add('active');
}

btnSpeed1.addEventListener('click', () => setSpeed(1, btnSpeed1));
btnSpeed5.addEventListener('click', () => setSpeed(5, btnSpeed5));
btnSpeed20.addEventListener('click', () => setSpeed(20, btnSpeed20));

class Particle {
  constructor(x, y, vx, vy, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color || '#00ffff';
    this.life = 1.0;
    this.decay = Math.random() * 0.02 + 0.02; // Random decay rate
    this.radius = Math.random() * 2 + 1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.globalAlpha = this.life;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.globalAlpha = 1.0; // reset
  }
}

function createExplosion(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    particles.push(new Particle(x, y, vx, vy, color));
  }
}

class Planet {
  constructor(x, y, mass, radius) {
    this.x = x;
    this.y = y;
    this.mass = mass;
    this.radius = radius;
    // Give it a random vibrant color
    const hue = Math.floor(Math.random() * 360);
    this.color = `hsl(${hue}, 80%, 60%)`;
  }

  draw(ctx) {
    // Glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Draw mass text
    if (chkShowMass && chkShowMass.checked && mode === 'edit') {
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 12px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.mass, this.x, this.y);
    }

    // Highlight if selected
    if (this === selectedObject) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

class Comet {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 4;
    this.color = '#ffffff';
    this.path = []; // To store previous positions
  }

  update() {
    // Calculate gravitational influence from all planets
    let ax = 0;
    let ay = 0;
    const lastX = this.x;
    const lastY = this.y;

    for (const p of planets) {
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      // F = G * M / r^2 (simplified, m of comet is 1 so F = a)
      const force = (G * p.mass) / (distSq + 1); // +1 to prevent singularity

      const dirX = dx / dist;
      const dirY = dy / dist;

      ax += dirX * force;
      ay += dirY * force;
    }

    this.vx += ax;
    this.vy += ay;
    this.x += this.vx;
    this.y += this.vy;

    // Check collision with planets (continuous to prevent tunneling on small planets)
    for (const p of planets) {
      const l2 = this.vx * this.vx + this.vy * this.vy;
      let t = 0;
      if (l2 > 0) {
        t = ((p.x - lastX) * this.vx + (p.y - lastY) * this.vy) / l2;
        t = Math.max(0, Math.min(1, t));
      }
      const projX = lastX + t * this.vx;
      const projY = lastY + t * this.vy;
      const dxObj = p.x - projX;
      const dyObj = p.y - projY;

      if (dxObj * dxObj + dyObj * dyObj <= p.radius * p.radius) {
        this.dead = true;
        createExplosion(projX, projY, 15, this.color);
        return;
      }
    }

    // Collisions with other comets
    if (chkCollisions.checked) {
      for (const other of comets) {
        if (other !== this && !other.dead && !this.dead) {
          const cdx = this.x - other.x;
          const cdy = this.y - other.y;
          const distToOther = Math.sqrt(cdx * cdx + cdy * cdy);
          if (distToOther < this.radius + other.radius) {
            this.dead = true;
            other.dead = true;
            // Spawn explosion at the midpoint
            const midX = (this.x + other.x) / 2;
            const midY = (this.y + other.y) / 2;
            createExplosion(midX, midY, 30, '#ff9900'); // fiery explosion
            return;
          }
        }
      }
    }

    // Save path for orbit rendering
    if (showOrbits) {
      this.path.push({ x: this.x, y: this.y });
      // Keep path length reasonable unless permanent
      if (!chkPermanentOrbits.checked) {
        while (this.path.length > 300) {
          this.path.shift();
        }
      }
    } else {
      this.path = [];
    }
  }

  draw(ctx) {
    if (this.dead) return;

    // Draw past path
    if (showOrbits && this.path.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.path[0].x, this.path[0].y);
      for (let i = 1; i < this.path.length; i++) {
        ctx.lineTo(this.path[i].x, this.path[i].y);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Glow for comet head
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Highlight if selected
    if (this === selectedObject) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

// Interaction logic
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let currentMouseX = 0;
let currentMouseY = 0;

function handlePointerDown(clientX, clientY) {
  const pos = getMousePos(clientX, clientY);
  const wx = pos.x;
  const wy = pos.y;

  if (mode === 'planet') {
    const mass = parseFloat(massInput.value);
    const radius = parseFloat(radiusInput.value);
    planets.push(new Planet(wx, wy, mass, radius));
  } else if (mode === 'comet') {
    isDragging = true;
    dragStartX = wx;
    dragStartY = wy;
    currentMouseX = wx;
    currentMouseY = wy;
  } else if (mode === 'edit') {
    selectedObject = null;
    selectedType = null;
    editActions.style.display = 'none';
    cometControlGroup.style.display = 'none';
    massControlGroup.style.display = 'none';

    // Check comets first (since they are smaller, might be drawn on top conceptually)
    for (const c of comets) {
      const dx = c.x - wx;
      const dy = c.y - wy;
      if (Math.sqrt(dx * dx + dy * dy) <= c.radius + 15 / zoomLevels[zoomIndex]) { // scale hit margin with zoom
        selectedObject = c;
        selectedType = 'comet';
        cometControlGroup.style.display = 'flex';
        editActions.style.display = 'flex';
        return; // Exit early if we clicked a comet
      }
    }

    // Check planets
    for (const p of planets) {
      const dx = p.x - wx;
      const dy = p.y - wy;
      if (Math.sqrt(dx * dx + dy * dy) <= p.radius + 15 / zoomLevels[zoomIndex]) {
        selectedObject = p;
        selectedType = 'planet';
        massControlGroup.style.display = 'flex';
        editActions.style.display = 'flex';
        massInput.value = p.mass;
        massValue.textContent = p.mass;
        radiusInput.value = p.radius;
        radiusValue.textContent = Math.round(p.radius);
        break;
      }
    }
  }
}

function handlePointerMove(clientX, clientY) {
  const pos = getMousePos(clientX, clientY);
  currentMouseX = pos.x;
  currentMouseY = pos.y;
}

function handlePointerUp(clientX, clientY) {
  if (mode === 'comet' && isDragging) {
    const pos = getMousePos(clientX, clientY);
    isDragging = false;
    // Calculate velocity based on drag vector (inverted logic like a slingshot)
    const dx = dragStartX - pos.x;
    const dy = dragStartY - pos.y;
    const vx = dx * 0.05; // Scaling factor
    const vy = dy * 0.05;

    comets.push(new Comet(dragStartX, dragStartY, vx, vy));
  }
}

// Mouse events
canvas.addEventListener('wheel', (e) => {
  if (e.deltaY > 0) {
    // Zoom out
    zoomIndex = Math.min(zoomLevels.length - 1, zoomIndex + 1);
  } else {
    // Zoom in
    zoomIndex = Math.max(0, zoomIndex - 1);
  }
});

canvas.addEventListener('mousedown', (e) => handlePointerDown(e.clientX, e.clientY));
canvas.addEventListener('mousemove', (e) => handlePointerMove(e.clientX, e.clientY));
canvas.addEventListener('mouseup', (e) => handlePointerUp(e.clientX, e.clientY));

// Touch events (mobile)
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevent scrolling when touching canvas
  if (e.touches.length > 0) {
    handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (e.touches.length > 0) {
    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (e.changedTouches.length > 0) {
    handlePointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  }
}, { passive: false });

function loop() {
  // Simulation updates (fast forward support)
  for (let s = 0; s < simulationSpeed; s++) {
    // Update comets
    for (let i = comets.length - 1; i >= 0; i--) {
      let c = comets[i];
      c.update();
      if (c.dead) {
        comets.splice(i, 1);
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.update();
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const zoom = zoomLevels[zoomIndex];
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  // Draw planets
  for (const p of planets) {
    p.draw(ctx);
  }

  // Draw drag line and simulate trajectory
  if (isDragging && mode === 'comet') {
    // 1. Draw the actual slingshot line
    ctx.beginPath();
    ctx.moveTo(dragStartX, dragStartY);
    ctx.lineTo(currentMouseX, currentMouseY);
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Predict the trajectory
    if (showOrbits) {
      const dx = dragStartX - currentMouseX;
      const dy = dragStartY - currentMouseY;
      let simX = dragStartX;
      let simY = dragStartY;
      let simVx = dx * 0.05;
      let simVy = dy * 0.05;

      const MAX_PREVIEW_STEPS = 500;
      let isDead = false;

      ctx.beginPath();
      ctx.moveTo(simX, simY);

      for (let step = 0; step < MAX_PREVIEW_STEPS; step++) {
        let ax = 0;
        let ay = 0;
        let lastSimX = simX;
        let lastSimY = simY;

        for (const p of planets) {
          const pdx = p.x - simX;
          const pdy = p.y - simY;
          const distSq = pdx * pdx + pdy * pdy;
          const dist = Math.sqrt(distSq);

          const force = (G * p.mass) / (distSq + 1);
          ax += (pdx / dist) * force;
          ay += (pdy / dist) * force;
        }

        simVx += ax;
        simVy += ay;
        simX += simVx;
        simY += simVy;

        for (const p of planets) {
          const l2 = simVx * simVx + simVy * simVy;
          let t = 0;
          if (l2 > 0) {
            t = ((p.x - lastSimX) * simVx + (p.y - lastSimY) * simVy) / l2;
            t = Math.max(0, Math.min(1, t));
          }
          const projX = lastSimX + t * simVx;
          const projY = lastSimY + t * simVy;
          const dxObj = p.x - projX;
          const dyObj = p.y - projY;

          if (dxObj * dxObj + dyObj * dyObj <= p.radius * p.radius) {
            isDead = true;
            break;
          }
        }

        if (isDead) break;

        ctx.lineTo(simX, simY);

        // Optimization: stop drawing if the comet leaves the screen far away
        if (simX < -15000 || simX > canvas.width + 15000 || simY < -15000 || simY > canvas.height + 15000) {
          break;
        }
      }

      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Draw comets
  for (let i = comets.length - 1; i >= 0; i--) {
    comets[i].draw(ctx);
  }

  // Draw particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].draw(ctx);
  }

  ctx.restore();

  requestAnimationFrame(loop);
}

// Ensure default instructions
instructionText.innerHTML = "<b>Planet Mode:</b> Click anywhere to place a Planet.";

// Load initial beautiful setup
const centerX = window.innerWidth / 2;
const centerY = window.innerHeight / 2;
// Default planet
planets.push(new Planet(centerX, centerY, 3000, 44));
// Default comet with orbit
comets.push(new Comet(centerX, centerY - 250, 2.5, 0));

// Start loop
loop();
