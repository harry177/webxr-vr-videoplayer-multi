import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory";
import { TextureLoader } from "three/src/loaders/TextureLoader.js";

import FontJSON from "/assets/Roboto-msdf.json";
import FontImage from "/assets/Roboto-msdf.png";

import barbieImage from "/assets/barbie.jpg";
import pokeImage from "/assets/poke.jpg";
import strangerImage from "/assets/stranger.jpg";

import barbieSource from "/assets/barbie.mp4";
import pokeSource from "/assets/poke.mp4";
import strangerSource from "/assets/stranger.mp4";

let scene,
  camera,
  renderer,
  controls,
  vrButton,
  video,
  source,
  controllers = [],
  textures = [barbiePoster, pokePoster, strangerPoster],
  videos = [barbieSource, pokeSource, strangerSource],
  vrSession,
  raycaster = new THREE.Raycaster(),
  rotationMatrix = new THREE.Matrix4(),
  intersects,
  videoTexture,
  videoMesh,
  playButton,
  nextButton,
  prevButton,
  pauseText,
  playText;

const fontName = "Roboto";

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

window.addEventListener("load", preload);
window.addEventListener("resize", onWindowResize);

function preload() {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(WIDTH, HEIGHT);
  renderer.xr.enabled = true;
  renderer.autoClear = false;
  const vrButton = VRButton.createButton(renderer);
  document.body.appendChild(vrButton);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, WIDTH / HEIGHT, 0.1, 1000);
  camera.matrixAutoUpdate = false;

  camera.position.z = 5;

  if ("xr" in navigator) {
    navigator.xr &&
      navigator.xr
        .isSessionSupported("immersive-vr")
        .then((supported) => {
          if (supported) {
            vrButton.style.backgroundColor = "#44F84B";
          } else {
            vrButton.style.backgroundColor = "#E8111B";
          }
        })
        .catch((error) => {
          console.error("Error checking AR support:", error);
        });
  } else {
    vrButton.style.backgroundColor = "red";
  }

  const textureLoader = new TextureLoader();

  textureLoader.load(FontImage, (texture) => {
    ThreeMeshUI.FontLibrary.addFont(fontName, FontJSON, texture);
  });

  renderer.xr.addEventListener("sessionstart", init);
}

async function init() {
  vrSession = renderer.xr.getSession();

  renderer.setAnimationLoop(loop);
}

function loop() {
  ThreeMeshUI.update();

  if (controllers) {
    const controller1 = controllers[0];
    const controller2 = controllers[1];

    handleControllers(controller1, controller2);
  }

  renderer.render(scene, camera);
}