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

import Backspace from "/assets/backspace.png";
import Enter from "/assets/enter.png";
import Shift from "/assets/shift.png";

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

const objsToTest = [];

const colors = {
  keyboardBack: 0x858585,
  panelBack: 0x262626,
  button: 0x363636,
  hovered: 0x1c1c1c,
  selected: 0x109c5d,
};

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
  isVideoPlaying,
  chat,
  chatContent,
  keyboard,
  userText,
  currentLayoutButton,
  layoutOptions,
  chatButton,
  updatedKeyboard,
  receivedData = [],
  isPingSent = false,
  actualTime;

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
  renderer.localClippingEnabled = true;
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

  controllers.forEach((controller) => {
    controller.addEventListener("selectstart", (event) =>
      onSelectStart(event, controller)
    );
  });

  createMenu();
  createPlayer();
  makeUI();

  socket.on("echo", () => {
    console.log(video.currentTime);
    video.pause();
    playText.setState("play");

    socket.emit("newJoined", {
      video: currentVideo,
      poster: currentPoster,
      time: video.currentTime,
      status: isVideoPlaying,
    });
  });

  socket.on("newVideo", (update) => {
    console.log("new video");
    isPingSent = true;

    const newPoster = textures.findIndex(
      (poster) => poster.id === update.poster.id
    );
    const extractedPosters = textures.splice(0, newPoster);

    textures.push(...extractedPosters);

    currentPoster = textures[0];

    const indexVideo = videos.indexOf(update.video);

    const extractedVideos = videos.splice(0, indexVideo);

    videos.push(...extractedVideos);

    /*if (navigator.userAgent.includes('Firefox')) {
        actualTime = update.time + 0.14 || 0;
      } else {
        actualTime = update.time || 0;
      }*/

    actualTime = update.time || 0;

    update.status ? (isVideoPlaying = true) : console.log(isVideoPlaying);

    source.src = videos[0];
    currentVideo = videos[0];

    video.load();
  });

  socket.on("pong", () => {
    if (playText.content === "Pause") {
      videoMesh.material.map = videoTexture;

      video.play();

      playText.setState("pause");
      isVideoPlaying = true;
    } else if (playText.content === "Play" && actualTime && isVideoPlaying) {
      console.log(actualTime);
      videoMesh.material.map = videoTexture;
      video.currentTime = actualTime;

      video.play();

      playText.setState("pause");
    } else if (playText.content === "Play" && actualTime && !isVideoPlaying) {
      console.log(actualTime);
      videoMesh.material.map = videoTexture;
      video.currentTime = actualTime;
    } else {
      videoMesh.material.map = textures[0].poster;

      video.pause();

      isVideoPlaying = false;
      currentPoster = textures[0];
    }
  });

  video.addEventListener("canplaythrough", () => {
    if (isPingSent) {
      console.log("listener");

      socket.emit("ping");

      isPingSent = false;
    }
  });

  socket.on("playConfirm", () => {
    //videoMesh.material.map = videoTexture;

    //video.play();
    playText.setState("pause");

    if (!video.currentTime) {
      isPingSent = true;
      video.load();
    } else {
      //videoMesh.material.map = videoTexture;
      video.play();
    }
    isVideoPlaying = true;
  });

  socket.on("pauseConfirm", () => {
    video.pause();
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

  container.position.set(-5, 1, -7);

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

  currentVideo = videos[0];
  currentPoster = textures[0];

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

  videoMesh = new THREE.Mesh(videoGeo, videoMat);
  videoMesh.position.set(-5, 2.3, -6.95);

  scene.add(videoMesh);

  socket.emit("newConnect");
}

function makeUI() {
  const container = new THREE.Group();
  container.position.set(1.5, 0.7, -2);
  //container.rotation.x = -0.15;
  scene.add(container);

  chatContent = new ThreeMeshUI.Text({ content: "" });

  chat = new ThreeMeshUI.Block({
    fontFamily: fontName,
    fontTexture: fontName,
    width: 5.0,
    height: 2,
    padding: 0.05,
    borderRadius: 0.2,
    fontColor: new THREE.Color("white"),
    fontSize: 0.2,
    justifyContent: "end",
    hiddenOverflow: true,
  });

  chat.position.set(1.5, 3, -2);

  container.add(chat);

  socket.on("updateChat", (messages) => {
    while (chat.childrenBoxes.length > 0) {
      chat.remove(chat.childrenBoxes[0]);
    }

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      const newBlock = new ThreeMeshUI.Block({
        width: 4.0,
        height: 0.5,
        borderRadius: 0.2,
        textAlign: "center",
        bestFit: "shrink",
      }).add(new ThreeMeshUI.Text({ content: message }));

      chat.add(newBlock);
    }

    chat.update(true, true, true);
  });

  //////////////
  // TEXT PANEL
  //////////////

  const textPanel = new ThreeMeshUI.Block({
    fontFamily: fontName,
    fontTexture: fontName,
    width: 4.2,
    height: 1.3,
    backgroundColor: new THREE.Color(colors.panelBack),
    backgroundOpacity: 1,
  });

  textPanel.position.set(1.5, 1.2, -2);
  container.add(textPanel);

  //

  const title = new ThreeMeshUI.Block({
    width: 2,
    height: 0.2,
    justifyContent: "center",
    fontSize: 0.1,
    backgroundOpacity: 0,
  }).add(new ThreeMeshUI.Text({ content: "Type some text on the keyboard" }));

  userText = new ThreeMeshUI.Text({ content: "" });

  const textField = new ThreeMeshUI.Block({
    width: 3,
    height: 0.7,
    borderWidth: 0.005,
      borderColor: new THREE.Color("white"),
    fontSize: 0.2,
    padding: 0.02,
    hiddenOverflow: false,
    bestFit: "shrink",
    backgroundOpacity: 0,
  }).add(userText);

  const chatButtonText = new ThreeMeshUI.Text({
    content: "Send",
    fontSize: 0.15,
  });

  chatButton = new ThreeMeshUI.Block({
    width: 0.6,
    height: 0.2,
    backgroundOpacity: 1,
    backgroundColor: new THREE.Color("blue"),
  }).add(chatButtonText);

  textPanel.add(title, textField);

  ////////////////////////
  // LAYOUT OPTIONS PANEL
  ////////////////////////

  // BUTTONS

  let layoutButtons = [
    ["English", "eng"],
    ["Russian", "ru"],
  ];

  layoutButtons = layoutButtons.map((options) => {
    const button = new ThreeMeshUI.Block({
      height: 0.2,
      width: 0.8,
      margin: 0.012,
      justifyContent: "center",
      backgroundColor: new THREE.Color(colors.button),
      backgroundOpacity: 1,
    }).add(
      new ThreeMeshUI.Text({
        offset: 0,
        fontSize: 0.15,
        content: options[0],
      })
    );

    button.setupState({
      state: "idle",
      attributes: {
        offset: 0.02,
        backgroundColor: new THREE.Color(colors.button),
        backgroundOpacity: 1,
      },
    });

    button.setupState({
      state: "hovered",
      attributes: {
        offset: 0.02,
        backgroundColor: new THREE.Color(colors.hovered),
        backgroundOpacity: 1,
      },
    });

    button.setupState({
      state: "selected",
      attributes: {
        offset: 0.01,
        backgroundColor: new THREE.Color(colors.selected),
        backgroundOpacity: 1,
      },
      onSet: () => {
        // enable intersection checking for the previous layout button,
        // then disable it for the current button

        if (currentLayoutButton) objsToTest.push(currentLayoutButton);

        if (keyboard) {
          clear(keyboard);

          keyboard.panels.forEach((panel) => clear(panel));
        }

        currentLayoutButton = button;

        makeKeyboard(options[1]);
      },
    });

    objsToTest.push(button);

    // Set English button as selected from the start

    if (options[1] === "eng") {
      button.setState("selected");

      currentLayoutButton = button;
    }

    return button;
  });

  // CONTAINER

  layoutOptions = new ThreeMeshUI.Block({
    fontFamily: fontName,
    fontTexture: fontName,
    height: 0.3,
    width: 4,
    offset: 0,
    backgroundColor: new THREE.Color(colors.panelBack),
    backgroundOpacity: 1,
  }).add(
    new ThreeMeshUI.Block({
      height: 0.3,
      width: 3,
      offset: 0,
      contentDirection: "row",
      justifyContent: "space-between",
      backgroundOpacity: 0,
      borderWidth: 0.005,
      borderColor: new THREE.Color("white"),
    }).add(layoutButtons[0], chatButton, layoutButtons[1])
  );

  layoutOptions.position.set(1.5, 0.7, -2);
  container.add(layoutOptions);
  objsToTest.push(layoutOptions);
}

function makeKeyboard(language) {
  keyboard = new ThreeMeshUI.Keyboard({
    language: language,
    width: 6,
    height: 2,
    fontFamily: fontName,
    fontTexture: fontName,
    fontSize: 0.15, // fontSize will propagate to the keys blocks
    backgroundColor: new THREE.Color(colors.keyboardBack),
    backgroundOpacity: 1,
    backspaceTexture: Backspace,
    shiftTexture: Shift,
    enterTexture: Enter,
  });

  keyboard.position.set(3, 0.2, -4);
  keyboard.rotation.x = -0.35;
  scene.add(keyboard);

  updatedKeyboard = keyboard.keys.splice(33, 34);

  //

  //userText = new ThreeMeshUI.Text( { content: '' } );

  /*keyboard.keys.forEach((key) => {
    objsToTest.push(key);

    key.setupState({
      state: "idle",
      attributes: {
        offset: 0,
        backgroundColor: new THREE.Color(colors.button),
        backgroundOpacity: 1,
      },
    });

    key.setupState({
      state: "hovered",
      attributes: {
        offset: 0,
        backgroundColor: new THREE.Color(colors.hovered),
        backgroundOpacity: 1,
      },
    });

    key.setupState({
      state: "selected",
      attributes: {
        offset: -0.009,
        backgroundColor: new THREE.Color(colors.selected),
        backgroundOpacity: 1,
      },
      // triggered when the user clicked on a keyboard's key
      onSet: () => {
        // if the key have a command (eg: 'backspace', 'switch', 'enter'...)
        // special actions are taken
        if (key.info.command) {
          switch (key.info.command) {
            // switch between panels
            case "switch":
              keyboard.setNextPanel();
              break;

            // switch between panel charsets (eg: russian/english)
            case "switch-set":
              keyboard.setNextCharset();
              break;

            case "enter":
              userText.set({ content: userText.content + "\n" });
              break;

            case "space":
              userText.set({ content: userText.content + " " });
              break;

            case "backspace":
              if (!userText.content.length) break;
              userText.set({
                content:
                  userText.content.substring(0, userText.content.length - 1) ||
                  "",
              });
              break;

            case "shift":
              keyboard.toggleCase();
              break;
          }

          // print a glyph, if any
        } else if (key.info.input) {
          userText.set({ content: userText.content + key.info.input });
        }
      },
    });

    //console.log(keyboard.keys[0]);
  });*/
}

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

  const send = raycaster.intersectObjects([chatButton]);

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
  } else if (send.length > 0 && userText.content !== "") {
    socket.emit("sendMessage", userText.content);
    userText.set({ content: "" });
  }

  for (let i = 0; i < keyboard.keys.length; i++) {
    if (
      raycaster.intersectObjects([keyboard.keys[i]]).length > 0 &&
      keyboard.keys[i].info.command
    ) {
      switch (keyboard.keys[i].info.command) {
        // switch between panels
        case "switch":
          keyboard.setNextPanel();
          const tempArray = updatedKeyboard.slice();
          updatedKeyboard = keyboard.keys.slice();
          keyboard.keys = tempArray;
          break;

        // switch between panel charsets (eg: russian/english)
        case "switch-set":
          keyboard.setNextCharset();
          break;

        case "enter":
          userText.set({ content: userText.content + "\n" });
          break;

        case "space":
          userText.set({ content: userText.content + " " });
          break;

        case "backspace":
          if (!userText.content.length) break;
          userText.set({
            content:
              userText.content.substring(0, userText.content.length - 1) || "",
          });
          break;

        case "shift":
          keyboard.toggleCase();
          break;
      }
    } else if (
      raycaster.intersectObjects([keyboard.keys[i]]).length > 0 &&
      !keyboard.keys[i].info.command
    ) {
      userText.set({ content: userText.content + keyboard.keys[i].info.input });
    }
  }
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
