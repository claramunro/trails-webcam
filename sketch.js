// Trails - Webcam Edition
// Multiple effects with switchable modes

let video;
let trailBuffer;

// Settings
let frameCount = 0;
let hueOffset = 0;

// Current effect mode
let currentEffect = 'colortrip'; // 'colortrip', 'natural'

// Effect settings
const SETTINGS = {
  colortrip: { frameSkip: 1 },
  natural: { frameSkip: 12 }
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  pixelDensity(1);
  noSmooth();

  // Create buffer
  trailBuffer = createGraphics(width, height);
  trailBuffer.colorMode(HSB, 360, 100, 100, 100);
  trailBuffer.noSmooth();
  trailBuffer.background(0);

  // Set up video capture
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // Set up button handlers
  setupButtons();

  // Hide loading
  let loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
}

function setupButtons() {
  const buttons = document.querySelectorAll('.effect-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Switch effect
      currentEffect = btn.dataset.effect;

      // Clear canvas when switching
      trailBuffer.background(0);
    });
  });
}

function updateLoadingMessage(msg) {
  let loading = document.getElementById('loading');
  if (loading) loading.textContent = msg;
}

function draw() {
  frameCount++;
  hueOffset = (hueOffset + 0.5) % 360;

  // Run the current effect
  if (currentEffect === 'colortrip') {
    drawColorTrip();
  } else if (currentEffect === 'natural') {
    drawNatural();
  }
}

// === EFFECT: Color Trip (colortrip) ===
function drawColorTrip() {
  trailBuffer.push();
  trailBuffer.translate(width, 0);
  trailBuffer.scale(-width / 640, height / 480);

  // Lighten blend mode - layers build up
  trailBuffer.drawingContext.globalCompositeOperation = 'lighten';

  // Rainbow color tint
  trailBuffer.tint(hueOffset, 70, 100, 255);
  trailBuffer.image(video, 0, 0);
  trailBuffer.noTint();

  trailBuffer.drawingContext.globalCompositeOperation = 'source-over';
  trailBuffer.pop();

  image(trailBuffer, 0, 0);
}

// === EFFECT: Natural Layers (natural) ===
function drawNatural() {
  // Only capture every N frames
  if (frameCount % SETTINGS.natural.frameSkip === 0) {
    trailBuffer.push();
    trailBuffer.translate(width, 0);
    trailBuffer.scale(-width / 640, height / 480);

    // Lighten blend - layers stack
    trailBuffer.drawingContext.globalCompositeOperation = 'lighten';

    // No tint - natural colors
    trailBuffer.image(video, 0, 0);

    trailBuffer.drawingContext.globalCompositeOperation = 'source-over';
    trailBuffer.pop();
  }

  image(trailBuffer, 0, 0);
}

function keyPressed() {
  if (key === 'c' || key === 'C') {
    trailBuffer.background(0);
  }

  if (key === 's' || key === 'S') {
    saveCanvas('trails-artwork', 'png');
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  trailBuffer = createGraphics(width, height);
  trailBuffer.colorMode(HSB, 360, 100, 100, 100);
  trailBuffer.noSmooth();
  trailBuffer.background(0);
}
