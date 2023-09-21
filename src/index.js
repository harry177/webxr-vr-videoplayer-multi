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

function init() {
  const test = document.createElement("div");
  test.style.width = "100px";
  test.style.height = "100px";
  test.style.backgroundColor = "red";
  document.body.append(test);
}

init();
