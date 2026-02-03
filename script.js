const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const video = document.getElementById("video");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const cx = () => canvas.width / 2;
const cy = () => canvas.height / 2;

let particles = [];
let textTargets = [];
let mode = "planet";
let lastGestureTime = 0;

// ---------------- PARTICLE CLASS ----------------
class Particle {
  constructor(angle, radius, color) {
    this.angle = angle;
    this.radius = radius;
    this.color = color || `hsl(${Math.random()*360},80%,70%)`;
    this.x = cx() + Math.cos(angle) * radius;
    this.y = cy() + Math.sin(angle) * radius;
    this.tx = this.x;
    this.ty = this.y;
    this.size = Math.random()*2 + 1;
  }

  update() {
    if (mode === "planet") {
      this.angle += 0.004;
      this.x = cx() + Math.cos(this.angle) * this.radius;
      this.y = cy() + Math.sin(this.angle) * this.radius;
    } else if (mode === "text") {
      this.x += (this.tx - this.x) * 0.08;
      this.y += (this.ty - this.y) * 0.08;
    }
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = Math.random()*0.7 + 0.3; // sparkle effect
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ---------------- INIT PLANET ----------------
function initPlanet() {
  particles = [];
  const R = 120;
  for(let i=0;i<700;i++){
    const a = Math.random()*Math.PI*2;
    const r = R + Math.random()*25;
    particles.push(new Particle(a,r));
  }
}
initPlanet();

// ---------------- TEXT MORPH ----------------
function morphToText(text){
  const temp = document.createElement("canvas");
  temp.width = canvas.width;
  temp.height = canvas.height;
  const tctx = temp.getContext("2d");

  tctx.clearRect(0,0,temp.width,temp.height);
  tctx.font = "bold 48px Arial";
  tctx.textAlign = "center";
  tctx.textBaseline = "middle";
  tctx.fillStyle = "white";
  tctx.fillText(text, cx(), cy());

  const data = tctx.getImageData(0,0,temp.width,temp.height).data;
  textTargets = [];

  for(let y=0;y<temp.height;y+=6){
    for(let x=0;x<temp.width;x+=6){
      const idx = (y*temp.width+x)*4+3;
      if(data[idx]>150){
        textTargets.push({x,y});
      }
    }
  }

  // assign particle targets
  particles.forEach((p,i)=>{
    const t = textTargets[i % textTargets.length];
    p.tx = t.x;
    p.ty = t.y;
  });

  mode = "text";

  // smooth dissolve back to planet
  setTimeout(()=>{ 
    mode="planet"; 
    initPlanet();
  }, 2500);
}

// ---------------- GESTURE DETECTION ----------------
function detectGesture(lm){
  const iUp = lm[8].y < lm[6].y - 0.03;
  const mUp = lm[12].y < lm[10].y - 0.03;
  const rUp = lm[16].y < lm[14].y - 0.03;

  if(iUp && mUp && !rUp) return "v";
  if(iUp && mUp && rUp) return "open";
  if(!iUp && !mUp && !rUp) return "fist";
  return "";
}

// ---------------- MEDIAPIPE HANDS ----------------
const hands = new Hands({ locateFile: f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hands.setOptions({ maxNumHands:1, modelComplexity:0, minDetectionConfidence:0.6, minTrackingConfidence:0.6 });

hands.onResults(results=>{
  if(!results.multiHandLandmarks.length) return;

  const g = detectGesture(results.multiHandLandmarks[0]);
  const now = Date.now();
  if(g && now - lastGestureTime > 1500){
    lastGestureTime = now;
    if(g==="v") morphToText("You’re kinda special ✨");
    if(g==="open") morphToText("Hey… smile 😊");
    if(g==="fist") morphToText("This is for you ❤️");
  }
});

const cameraMP = new Camera(video,{
  onFrame: async()=>await hands.send({image:video}),
  width:640,height:480
});
cameraMP.start();

// ---------------- ANIMATION LOOP ----------------
function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Planet glow background
  const grad = ctx.createRadialGradient(cx(),cy(),40,cx(),cy(),160);
  grad.addColorStop(0,"rgba(100,200,255,0.3)");
  grad.addColorStop(1,"transparent");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx(),cy(),160,0,Math.PI*2);
  ctx.fill();

  // draw particles
  particles.forEach(p=>{ p.update(); p.draw(); });

  requestAnimationFrame(animate);
}
animate();
