// Trails - Webcam Edition
// Video frame trails / ghosting effect

let video;
let trailBuffer;

let hueOffset = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  pixelDensity(1);

  // Create buffer for trail effect
  trailBuffer = createGraphics(width, height);
  trailBuffer.colorMode(HSB, 360, 100, 100, 100);
  trailBuffer.background(0);

  // Set up video capture
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // Hide loading message
  let loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
}

function draw() {
  // Shift colors over time for rainbow effect
  hueOffset = (hueOffset + 0.5) % 360;

  // Draw the video frame with blend mode so it layers
  trailBuffer.push();

  // Mirror horizontally and scale to fill canvas
  trailBuffer.translate(width, 0);
  trailBuffer.scale(-width / 640, height / 480);

  // Use lighten blend mode - only brighter pixels show through
  trailBuffer.drawingContext.globalCompositeOperation = 'lighten';

  // Apply color tint that shifts over time
  trailBuffer.tint(hueOffset, 70, 100, 255);
  trailBuffer.image(video, 0, 0);
  trailBuffer.noTint();

  trailBuffer.drawingContext.globalCompositeOperation = 'source-over';
  trailBuffer.pop();

  // Draw the trail buffer to screen
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
  trailBuffer.background(0);
}
