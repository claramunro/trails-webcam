// Trails - Webcam Edition
// Multiple effects with switchable modes

let video;
let bodyPixNet;
let isModelReady = false;
let needsBodyPix = true;

// Buffers
let trailBuffer;
let currentBodyFrame;
let currentSegmentation = null;

// Settings
let frameCount = 0;
let hueOffset = 0;

// Current effect mode
let currentEffect = 'trails2'; // 'trails2', 'colortrip', 'natural'

// Effect settings
const SETTINGS = {
  trails2: { frameSkip: 15, needsBodyPix: true },
  colortrip: { frameSkip: 1, needsBodyPix: false },
  natural: { frameSkip: 12, needsBodyPix: false }
};

async function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  pixelDensity(1);
  noSmooth();

  // Create buffers
  trailBuffer = createGraphics(width, height);
  trailBuffer.colorMode(HSB, 360, 100, 100, 100);
  trailBuffer.noSmooth();
  trailBuffer.background(0);

  currentBodyFrame = createGraphics(640, 480);
  currentBodyFrame.pixelDensity(1);

  // Set up video capture
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // Set up button handlers
  setupButtons();

  updateLoadingMessage('Loading AI model...');

  // Load BodyPix model
  try {
    bodyPixNet = await bodyPix.load({
      architecture: 'MobileNetV1',
      outputStride: 16,
      multiplier: 0.75,
      quantBytes: 2
    });
    console.log('BodyPix model loaded!');
    isModelReady = true;

    let loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
  } catch (err) {
    console.error('Failed to load model:', err);
    updateLoadingMessage('Failed to load model: ' + err.message);
  }
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

async function draw() {
  frameCount++;
  hueOffset = (hueOffset + 0.5) % 360;

  // Show loading for effects that need BodyPix
  if (SETTINGS[currentEffect].needsBodyPix && !isModelReady) {
    background(0);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(20);
    text('Loading AI model...', width / 2, height / 2);
    return;
  }

  // Run the current effect
  switch (currentEffect) {
    case 'trails2':
      await drawTrails2();
      break;
    case 'colortrip':
      drawColorTrip();
      break;
    case 'natural':
      drawNatural();
      break;
  }
}

// === EFFECT: Body Trails (trails2) ===
async function drawTrails2() {
  // Get segmentation every frame for live body
  try {
    currentSegmentation = await bodyPixNet.segmentPerson(video.elt, {
      flipHorizontal: false,
      internalResolution: 'medium',
      segmentationThreshold: 0.7
    });
  } catch (err) {
    // Keep previous segmentation on error
  }

  // Capture to trail buffer every N frames
  if (frameCount % SETTINGS.trails2.frameSkip === 0 && currentSegmentation) {
    captureBodyToTrail(currentSegmentation);
  }

  // Draw trail history first
  image(trailBuffer, 0, 0);

  // Draw current live body on top (always real-time)
  if (currentSegmentation && currentSegmentation.data) {
    drawLiveBody(currentSegmentation);
  }
}

function captureBodyToTrail(segmentation) {
  let bodyFrame = createGraphics(640, 480);
  bodyFrame.pixelDensity(1);

  video.loadPixels();
  bodyFrame.loadPixels();

  const data = segmentation.data;

  for (let i = 0; i < data.length; i++) {
    const pixelIndex = i * 4;

    if (data[i] === 1) {
      bodyFrame.pixels[pixelIndex] = video.pixels[pixelIndex];
      bodyFrame.pixels[pixelIndex + 1] = video.pixels[pixelIndex + 1];
      bodyFrame.pixels[pixelIndex + 2] = video.pixels[pixelIndex + 2];
      bodyFrame.pixels[pixelIndex + 3] = 255;
    } else {
      bodyFrame.pixels[pixelIndex + 3] = 0;
    }
  }

  bodyFrame.updatePixels();

  trailBuffer.push();
  trailBuffer.translate(width, 0);
  trailBuffer.scale(-width / 640, height / 480);
  trailBuffer.image(bodyFrame, 0, 0);
  trailBuffer.pop();

  bodyFrame.remove();
}

function drawLiveBody(segmentation) {
  video.loadPixels();
  currentBodyFrame.loadPixels();

  const data = segmentation.data;

  for (let i = 0; i < data.length; i++) {
    const pixelIndex = i * 4;

    if (data[i] === 1) {
      currentBodyFrame.pixels[pixelIndex] = video.pixels[pixelIndex];
      currentBodyFrame.pixels[pixelIndex + 1] = video.pixels[pixelIndex + 1];
      currentBodyFrame.pixels[pixelIndex + 2] = video.pixels[pixelIndex + 2];
      currentBodyFrame.pixels[pixelIndex + 3] = 255;
    } else {
      currentBodyFrame.pixels[pixelIndex + 3] = 0;
    }
  }

  currentBodyFrame.updatePixels();

  push();
  translate(width, 0);
  scale(-width / 640, height / 480);
  image(currentBodyFrame, 0, 0);
  pop();
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
