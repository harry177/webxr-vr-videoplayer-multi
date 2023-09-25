import * as THREE from "three";
import ThreeMeshUI from "three-mesh-ui";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory";
import { TextureLoader } from "three/src/loaders/TextureLoader.js";
import { socket } from "./socket";

import FontJSON from "/assets/Roboto-msdf.json";
import FontImage from "/assets/Roboto-msdf.png";

import barbieImage from "/assets/barbie.jpg";
import pokeImage from "/assets/poke.jpg";
import strangerImage from "/assets/stranger.jpg";

import barbieSource from "/assets/barbie.mp4";
import pokeSource from "/assets/poke.mp4";
import strangerSource from "/assets/stranger.mp4";

const textureLoader = new TextureLoader();

const barbiePoster = {
  poster: new THREE.TextureLoader().load(barbieImage),
  id: "barbie",
};
const pokePoster = {
  poster: new THREE.TextureLoader().load(pokeImage),
  id: "poke",
};
const strangerPoster = {
  poster: new THREE.TextureLoader().load(strangerImage),
  id: "stranger",
};

const fontName = "Roboto";

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

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
  playText,
  currentVideo,
  currentPoster,
  isVideoPlaying;

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
  vrButton = VRButton.createButton(renderer);
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

  textureLoader.load(FontImage, (texture) => {
    ThreeMeshUI.FontLibrary.addFont(fontName, FontJSON, texture);
  });

  renderer.setAnimationLoop(loop);

  renderer.xr.addEventListener("sessionstart", init);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function init() {
  vrSession = renderer.xr.getSession();

  controls = new OrbitControls(camera, renderer.domElement);
  camera.position.set(0, 1.6, 3);
  controls.target = new THREE.Vector3(0, 1, -1.8);
  controls.update();

  controllers = buildControllers();

  function onSelectStart(event, controller) {
    //controller.children[0].scale.z = 10;
    //rotationMatrix = new THREE.Matrix4();
    rotationMatrix.extractRotation(controller.matrixWorld);
    //raycaster = new THREE.Raycaster();
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(rotationMatrix);
    intersects = raycaster.intersectObjects([playButton]);
    const next = raycaster.intersectObjects([nextButton]);
    const prev = raycaster.intersectObjects([prevButton]);
    console.log(intersects);
    if (intersects.length > 0) {
      if (video.paused) {
        socket.emit("play");
      } else {
        socket.emit("pause");
      }
    } else if (next.length > 0) {

      const nextVideoEl = videos[1];
      const nextPosterEl = textures[1];

      socket.emit("videoVariant", {
        video: nextVideoEl,
        poster: nextPosterEl,
      });
    } else if (prev.length > 0) {

      const lastVideoEl = videos[videos.length - 1];
      const lastPosterEl = textures[textures.length - 1];

      socket.emit("videoVariant", {
        video: lastVideoEl,
        poster: lastPosterEl,
      });
    }
  }

  controllers.forEach((controller) => {
    controller.addEventListener("selectstart", (event) =>
      onSelectStart(event, controller)
    );
  });

  createMenu();
  createPlayer();

  socket.emit("newConnect");

  socket.on("echo", () => {
    console.log(video.currentTime);
    video.pause();
    playText.setState("play");
    currentVideo &&
      socket.emit("videoVariant", {
        video: currentVideo,
        poster: currentPoster,
        time: video.currentTime
      });
  });

  socket.on("newVideo", (update) => {
    if (update.video !== videos[0] || update.time) {
      const indexVideo = videos.indexOf(update.video);

      const extractedVideos = videos.splice(0, indexVideo);

      videos.push(...extractedVideos);

      source.src = videos[0];
      currentVideo = videos[0];
      video.load();

      const newPoster = textures.findIndex(
        (poster) => poster.id === update.poster.id
      );
      const extractedPosters = textures.splice(0, newPoster);

      textures.push(...extractedPosters);

      //videoMesh.material.map = textures[0].poster;
      currentPoster = textures[0];

      if (playText.content === "Pause") {
        videoMesh.material.map = videoTexture;
        setTimeout(() => {
          video.play();
        }, 100);
        playText.setState("pause");
        isVideoPlaying = true;
        
      } else if (playText.content === "Play" && update.time) {
        console.log(update.time);
        videoMesh.material.map = videoTexture;
        video.currentTime = update.time;
        setTimeout(() => {
          video.play();
        }, 100);
        playText.setState("pause");
      } else {
        videoMesh.material.map = textures[0].poster;
        setTimeout(() => {
          video.pause();
        }, 100);
        isVideoPlaying = false;
        currentPoster = textures[0];
      }
    } else if (!video.paused && !video.currentTime) {
      setTimeout(() => {
        video.play();
      }, 100);
      playText.setState("pause");
    }
  });

  socket.on("playConfirm", () => {
    videoMesh.material.map = videoTexture;
    setTimeout(() => {
      video.play();
    }, 100);
    isVideoPlaying = true;
    playText.setState("pause");
  });

  socket.on("pauseConfirm", () => {
    setTimeout(() => {
      video.pause();
    }, 100);
    isVideoPlaying = false;
    playText.setState("play");
  });
}

function createMenu() {
  const container = new ThreeMeshUI.Block({
    width: 8.5,
    height: 8,
    padding: 0.05,
    borderRadius: 0.2,
    justifyContent: "end",
    textAlign: "center",
  });

  container.set({
    fontFamily: fontName,
    fontTexture: fontName,
  });

  container.position.set(0, 1, -5);

  scene.add(container);

  const innerContainer = new ThreeMeshUI.Block({
    width: 7,
    height: 2.3,
    padding: 0.05,
    borderRadius: 0.2,
    backgroundColor: new THREE.Color(0x614747),
    justifyContent: "space-around",
    textAlign: "center",
    contentDirection: "row",
  });

  playButton = new ThreeMeshUI.Block({
    width: 1.5,
    height: 1.5,
    backgroundOpacity: 1,
    backgroundColor: new THREE.Color(0x777777),
    justifyContent: "center",
    textAlign: "center",
    fontColor: new THREE.Color("white"),
  });

  nextButton = new ThreeMeshUI.Block({
    width: 1.5,
    height: 1.5,
    backgroundOpacity: 1,
    backgroundColor: new THREE.Color(0x777777),
    justifyContent: "center",
    textAlign: "center",
    fontColor: new THREE.Color("white"),
  });

  const nextText = new ThreeMeshUI.Text({
    content: "Next",
    fontSize: 0.2,
  });

  nextButton.add(nextText);

  prevButton = new ThreeMeshUI.Block({
    width: 1.5,
    height: 1.5,
    backgroundOpacity: 1,
    backgroundColor: new THREE.Color(0x777777),
    justifyContent: "center",
    textAlign: "center",
    fontColor: new THREE.Color("white"),
  });

  const prevText = new ThreeMeshUI.Text({
    content: "Prev",
    fontSize: 0.2,
  });

  prevButton.add(prevText);

  const hoveredAttributes = {
    backgroundColor: new THREE.Color("white"),
    backgroundOpacity: 0.3,
  };

  const idleAttributes = {
    backgroundColor: new THREE.Color(0x777777),
  };

  playButton.setupState({
    state: "hovered",
    attributes: hoveredAttributes,
  });

  playButton.setupState({
    state: "idle",
    attributes: idleAttributes,
  });
  nextButton.setupState({
    state: "hovered",
    attributes: hoveredAttributes,
  });

  nextButton.setupState({
    state: "idle",
    attributes: idleAttributes,
  });
  prevButton.setupState({
    state: "hovered",
    attributes: hoveredAttributes,
  });

  prevButton.setupState({
    state: "idle",
    attributes: idleAttributes,
  });

  const pauseTextAttributes = {
    content: "Pause",
  };

  const playTextAttributes = {
    content: "Play",
  };

  playText = new ThreeMeshUI.Text({
    content: "Play",
    fontSize: 0.2,
  });

  playText.setupState({
    state: "pause",
    attributes: pauseTextAttributes,
  });
  playText.setupState({
    state: "play",
    attributes: playTextAttributes,
  });

  playButton.add(playText);

  const pauseButton = new ThreeMeshUI.Block({
    width: 1.5,
    height: 1.5,
    backgroundOpacity: 1,
    backgroundColor: new THREE.Color(0x777777),
    justifyContent: "center",
    textAlign: "center",
    fontColor: new THREE.Color("white"),
  });

  pauseText = new ThreeMeshUI.Text({
    content: "Pause",
    fontSize: 0.2,
  });

  pauseButton.add(pauseText);

  innerContainer.add(prevButton, playButton, nextButton);

  container.add(innerContainer);
}

function createPlayer() {
  video = document.createElement("video");
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  video.controls = true;
  video.loop = true;
  video.style.display = "none";

  source = document.createElement("source");
  source.type = "video/mp4";
  source.src = videos[0];

  document.body.appendChild(video);
  video.appendChild(source);

  videoTexture = new THREE.VideoTexture(video);
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.format = THREE.RGBAFormat;
  videoTexture.needsUpdate = true;

  const width = 6.0;
  const height = 4.0;

  const videoGeo = new THREE.PlaneGeometry(width, height);
  const videoMat = new THREE.MeshBasicMaterial({ map: textures[0].poster });
  console.log("vtoroj");
  videoMesh = new THREE.Mesh(videoGeo, videoMat);
  videoMesh.position.set(0, 2.3, -4.95);

  scene.add(videoMesh);
}

function buildControllers() {
  const controllerModelFactory = new XRControllerModelFactory();

  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);

  const line = new THREE.Line(geometry);
  line.scale.z = 10;

  for (let i = 0; i < 2; i++) {
    const controller = renderer.xr.getController(i);
    controller.add(line.clone());
    controller.userData.selectPressed = false;
    controller.userData.selectPressedPrev = false;
    scene.add(controller);
    controllers.push(controller);

    const grip = renderer.xr.getControllerGrip(i);
    grip.add(controllerModelFactory.createControllerModel(grip));
    scene.add(grip);
  }

  return controllers;
}

function handleControllers(controller1, controller2) {
  const rotationMatrix1 = new THREE.Matrix4();
  rotationMatrix1.extractRotation(controller1.matrixWorld);
  const raycaster1 = new THREE.Raycaster();
  raycaster1.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
  raycaster1.ray.direction.set(0, 0, -1).applyMatrix4(rotationMatrix1);

  const rotationMatrix2 = new THREE.Matrix4();
  rotationMatrix2.extractRotation(controller2.matrixWorld);
  const raycaster2 = new THREE.Raycaster();
  raycaster2.ray.origin.setFromMatrixPosition(controller2.matrixWorld);
  raycaster2.ray.direction.set(0, 0, -1).applyMatrix4(rotationMatrix2);

  const buttons = [playButton, nextButton, prevButton];

  buttons.forEach((button) => {
    let isHovered = false;
    if (
      raycaster1.intersectObject(button).length > 0 ||
      raycaster2.intersectObject(button).length > 0
    ) {
      isHovered = true;
    }

    if (isHovered) {
      button.setState("hovered");
    } else {
      button.setState("idle");
    }
  });
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
