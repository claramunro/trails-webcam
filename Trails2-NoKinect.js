// Trails - Webcam Edition
// Body silhouette filled with live video - photo-like captures
// Current body is always live, trails build up behind

let video;
let bodyPixNet;
let isModelReady = false;

// Trail buffer (history)
let trailBuffer;

// Current body frame (always live)
let currentBodyFrame;
let currentSegmentation = null;

// Settings
const FRAME_SKIP = 15; // Capture trail every N frames
let frameCount = 0;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noSmooth();

  // Create buffer for trail history
  trailBuffer = createGraphics(width, height);
  trailBuffer.noSmooth();
  trailBuffer.background(0);

  // Create buffer for current body
  currentBodyFrame = createGraphics(640, 480);
  currentBodyFrame.pixelDensity(1);

  // Set up video capture
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

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

function updateLoadingMessage(msg) {
  let loading = document.getElementById('loading');
  if (loading) loading.textContent = msg;
}

async function draw() {
  frameCount++;

  if (!isModelReady) {
    background(0);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(20);
    text('Loading AI model...', width / 2, height / 2);
    return;
  }

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
  if (frameCount % FRAME_SKIP === 0 && currentSegmentation) {
    captureToTrail(currentSegmentation);
  }

  // Draw trail history first
  image(trailBuffer, 0, 0);

  // Draw current live body on top (always real-time)
  if (currentSegmentation && currentSegmentation.data) {
    drawLiveBody(currentSegmentation);
  }
}

function captureToTrail(segmentation) {
  // Create masked image for trail
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

  // Add to trail buffer
  trailBuffer.push();
  trailBuffer.translate(width, 0);
  trailBuffer.scale(-width / 640, height / 480);
  trailBuffer.image(bodyFrame, 0, 0);
  trailBuffer.pop();

  bodyFrame.remove();
}

function drawLiveBody(segmentation) {
  // Draw current body directly to screen (live, no delay)
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

  // Draw live body on top of everything
  push();
  translate(width, 0);
  scale(-width / 640, height / 480);
  image(currentBodyFrame, 0, 0);
  pop();
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
  trailBuffer.noSmooth();
  trailBuffer.background(0);
}
