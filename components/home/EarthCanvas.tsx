"use client";

import { useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { continentAt, type Continent } from "@/lib/continents";
import { startPageTransition } from "@/lib/transition";

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function vecToLatLon(vector: THREE.Vector3) {
  const normal = vector.clone().normalize();
  const lat = (Math.asin(THREE.MathUtils.clamp(normal.y, -1, 1)) * 180) / Math.PI;
  let lon = (Math.atan2(normal.z, -normal.x) * 180) / Math.PI - 180;
  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;
  return { lat, lon };
}

function latLonToVec(lat: number, lon: number, radius: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function landPixel(image: CanvasImageSource & { width: number; height: number }, lat: number, lon: number) {
  const canvas = landPixel.canvas ?? (landPixel.canvas = document.createElement("canvas"));
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || !image.width || !image.height) return false;
  const x = Math.min(image.width - 1, Math.max(0, Math.floor(((lon + 180) / 360) * image.width)));
  const y = Math.min(image.height - 1, Math.max(0, Math.floor(((90 - lat) / 180) * image.height)));
  ctx.drawImage(image, x, y, 1, 1, 0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  const ocean = b > r + 18 && b > g + 18 && b > 35;
  return !ocean;
}
landPixel.canvas = null as HTMLCanvasElement | null;

type GlobeFocus = {
  close: boolean;
  lat: number;
  lon: number;
  pin: { lat: number; lon: number } | null;
};

function Earth({
  progressRef,
  riseRef,
  hover,
  onContinent,
  outlineRef,
  focusRef,
  onLandClick,
  onDragged,
}: {
  progressRef: React.RefObject<number>;
  riseRef?: React.RefObject<number>;
  hover: React.RefObject<{ active: boolean; point: THREE.Vector3 }>;
  onContinent: (continent: Continent | null) => void;
  outlineRef: React.RefObject<number>;
  focusRef: React.RefObject<GlobeFocus>;
  onLandClick: (lat: number, lon: number) => void;
  onDragged: () => void;
}) {
  const earth = useRef<THREE.Group>(null);
  const clouds = useRef<THREE.Mesh>(null);
  const pin = useRef<THREE.Group>(null);
  const pinAim = useMemo(() => new THREE.Quaternion(), []);
  const dragged = useRef(onDragged);
  dragged.current = onDragged;
  const spin = useRef(0);
  const spinQ = useMemo(() => new THREE.Quaternion(), []);
  const polar = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const drag = useRef({
    active: false,
    lastX: 0,
    lastY: 0,
    moved: 0,
    slowUntil: 0,
    pausedUntil: 0,
    didPause: false,
    reported: false,
    zooming: false,
    latchYaw: 0,
    latchPitch: 0,
    forwardYaw: 0,
    forwardPitch: 0,
    yaw: 0,
    pitch: 0,
    yawTarget: 0,
    pitchTarget: 0,
  });
  const pitchQ = useMemo(() => new THREE.Quaternion(), []);
  const xAxis = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  const align = useMemo(() => {
    const globe = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.18, 0.42, 0));
    const charlotte = latLonToVec(35.2271, -80.8431, 1).normalize();
    const yAxis = new THREE.Vector3(0, 1, 0);
    const pitchAxis = new THREE.Vector3(1, 0, 0);
    const target = new THREE.Vector3(0, 0, 1);
    const ry = new THREE.Quaternion();
    const rx = new THREE.Quaternion();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    let spin = 0;
    let pitch = 0;
    let bestDot = -2;
    for (let i = 0; i < 720; i += 1) {
      const yaw = (i / 720) * Math.PI * 2;
      ry.setFromAxisAngle(yAxis, yaw);
      for (let j = 0; j < 241; j += 1) {
        const tilt = -1.4 + (j / 240) * 2.8;
        rx.setFromAxisAngle(pitchAxis, tilt);
        const dot = p.copy(charlotte).applyQuaternion(q.copy(globe).multiply(ry).multiply(rx)).dot(target);
        if (dot > bestDot) {
          bestDot = dot;
          spin = yaw;
          pitch = tilt;
        }
      }
    }
    return { spin, pitch };
  }, []);
  const [day, cloudMap, coast] = useTexture([
    "/textures/earth_day.jpg",
    "/textures/earth_clouds.png",
    "/textures/coast-3.png",
  ]);
  const gl = useThree((state) => state.gl);

  if (!day.userData.configured) {
    day.colorSpace = THREE.SRGBColorSpace;
    day.generateMipmaps = true;
    day.minFilter = THREE.LinearMipmapLinearFilter;
    day.magFilter = THREE.LinearFilter;
    day.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
    day.needsUpdate = true;
    day.userData.configured = true;
    cloudMap.colorSpace = THREE.SRGBColorSpace;
    cloudMap.anisotropy = gl.capabilities.getMaxAnisotropy();
    cloudMap.needsUpdate = true;
    coast.colorSpace = THREE.NoColorSpace;
    coast.generateMipmaps = false;
    coast.minFilter = THREE.NearestFilter;
    coast.magFilter = THREE.NearestFilter;
    coast.wrapS = THREE.RepeatWrapping;
    coast.needsUpdate = true;
  }

  const poses = useMemo(() => {
    const charlotte = latLonToVec(35.2271, -80.8431, 1).normalize();
    return {
      globe: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.18, 0.42, 0)),
      city: new THREE.Quaternion().setFromUnitVectors(charlotte, new THREE.Vector3(0, 0, 1)),
      mixed: new THREE.Quaternion(),
    };
  }, []);

  useFrame((state, delta) => {
    const progress = progressRef.current ?? 0;
    const zoomIn = progress >= 0.5 ? 1 : smoothstep(0.4, 0.5, progress);
    const cityEase = zoomIn * zoomIn * (3 - 2 * zoomIn);

    const now = performance.now();
    const hand = drag.current;
    if (progress >= 0.3 && !hand.didPause) {
      hand.didPause = true;
      hand.pausedUntil = now + 900;
    }
    const tau = Math.PI * 2;
    const follow = 1 - Math.exp(-delta * 14);
    if (cityEase > 0.02) {
      if (!hand.zooming) {
        hand.zooming = true;
        hand.active = false;
        hand.latchYaw = hand.yaw;
        hand.latchPitch = hand.pitch;
        const phase = ((hand.latchYaw % tau) + tau) % tau;
        const yaw = ((align.spin % tau) + tau) % tau;
        let forward = (yaw - phase + tau) % tau;
        if (forward < 0.2) forward += tau;
        hand.forwardYaw = forward;
        hand.forwardPitch = align.pitch - hand.latchPitch;
      }
      hand.yaw = hand.latchYaw + hand.forwardYaw * cityEase;
      hand.pitch = hand.latchPitch + hand.forwardPitch * cityEase;
      hand.yawTarget = hand.yaw;
      hand.pitchTarget = hand.pitch;
    } else {
      hand.zooming = false;
      if (!hand.active && now >= hand.pausedUntil) {
        const rate = now < hand.slowUntil ? 0.025 : 0.07;
        hand.yawTarget += delta * rate;
      }
      hand.yaw += (hand.yawTarget - hand.yaw) * follow;
      hand.pitch += (hand.pitchTarget - hand.pitch) * follow;
    }
    spin.current = hand.yaw;
    spinQ.setFromAxisAngle(polar, hand.yaw);
    pitchQ.setFromAxisAngle(xAxis, hand.pitch);
    poses.mixed.copy(poses.globe);
    poses.mixed.multiply(spinQ).multiply(pitchQ);
    const focus = focusRef.current;
    if (earth.current) {
      const rise = riseRef?.current ?? 1;
      earth.current.position.y = -(1 - rise) * 2.05;
      if (focus?.close) {
        const aim = latLonToVec(focus.lat, focus.lon, 1).normalize();
        const face = new THREE.Quaternion().setFromUnitVectors(aim, new THREE.Vector3(0, 0, 1));
        earth.current.quaternion.slerp(face, 1 - Math.exp(-delta * 2.4));
      } else {
        earth.current.quaternion.copy(poses.mixed);
      }
    }
    if (pin.current) {
      const placed = focus?.pin;
      pin.current.visible = Boolean(placed);
      if (placed) {
        const normal = latLonToVec(placed.lat, placed.lon, 1).normalize();
        pin.current.position.copy(normal).multiplyScalar(1.012);
        pinAim.setFromUnitVectors(polar, normal);
        pin.current.quaternion.copy(pinAim);
      }
    }
    if (clouds.current) {
      clouds.current.rotation.y = state.clock.elapsedTime * 0.012 * (1 - cityEase);
      const cloudMat = clouds.current.material as THREE.MeshPhongMaterial;
      cloudMat.opacity = 0.38 * (1 - cityEase);
    }

    const z = focus?.close ? 3.15 : lerp(5.15, 1.1, cityEase);
    const y = lerp(0, 0, cityEase);
    const lookY = lerp(0, 0, cityEase);
    const settle = cityEase > 0.2 ? 8 : 3.4;
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, z, settle, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, y, settle, delta);
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, 0, settle, delta);
    state.camera.lookAt(0, lookY, 0);
  });

  useEffect(() => {
    const endDrag = () => {
      const hand = drag.current;
      if (!hand.active) return;
      const moved = hand.moved;
      hand.active = false;
      if (moved > 12 && !hand.reported) {
        hand.reported = true;
        hand.slowUntil = performance.now() + 2000;
        dragged.current();
      }
    };
    const moveDrag = (event: PointerEvent) => {
      const hand = drag.current;
      if (!hand.active) return;
      const dx = event.clientX - hand.lastX;
      const dy = event.clientY - hand.lastY;
      hand.lastX = event.clientX;
      hand.lastY = event.clientY;
      hand.moved += Math.abs(dx);
      hand.yawTarget += dx * 0.005;
    };
    const finishDrag = () => {
      window.setTimeout(endDrag, 0);
    };
    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
    return () => {
      window.removeEventListener("pointermove", moveDrag);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
    };
  }, [gl]);

  return (
    <group ref={earth}>
      <mesh
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          if ((progressRef.current ?? 0) < 0.3 || !hover.current) return;
          hover.current.active = true;
          hover.current.point.copy(event.point);
          gl.domElement.style.cursor = "none";
          if (focusRef.current?.close) return;
          const local = earth.current ? earth.current.worldToLocal(event.point.clone()) : event.point;
          const { lat, lon } = vecToLatLon(local);
          const image = day.image as CanvasImageSource & { width: number; height: number };
          const land = landPixel(image, lat, lon);
          onContinent(land ? continentAt(lat, lon) : null);
        }}
        onPointerOut={() => {
          if (hover.current) hover.current.active = false;
          onContinent(null);
          if (drag.current.active) return;
          gl.domElement.style.cursor = "";
        }}
        onPointerDown={(event: ThreeEvent<PointerEvent>) => {
          if ((progressRef.current ?? 0) < 0.3 || drag.current.zooming || focusRef.current?.close) return;
          drag.current.active = true;
          drag.current.lastX = event.clientX;
          drag.current.lastY = event.clientY;
          drag.current.moved = 0;
          drag.current.reported = false;
          sessionStorage.setItem("gaia-dragged", "1");
          gl.domElement.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event: ThreeEvent<PointerEvent>) => {
          if ((progressRef.current ?? 0) < 0.3) return;
          const placing = Boolean(focusRef.current?.close);
          if (!placing && !drag.current.active) return;
          const moved = drag.current.moved;
          drag.current.active = false;
          if (!placing && moved > 12) {
            drag.current.slowUntil = performance.now() + 2000;
            if (!drag.current.reported) {
              drag.current.reported = true;
              dragged.current();
            }
            return;
          }
          const local = earth.current
            ? earth.current.worldToLocal(event.point.clone())
            : event.point;
          const { lat, lon } = vecToLatLon(local);
          const image = day.image as CanvasImageSource & { width: number; height: number };
          if (!landPixel(image, lat, lon)) return;
          onLandClick(lat, lon);
        }}
      >
        <sphereGeometry args={[1, 256, 256]} />
        <meshPhongMaterial map={day} specular="#6d88a8" shininess={4} />
      </mesh>
      <mesh ref={clouds} scale={1.012} raycast={() => null}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial map={cloudMap} transparent opacity={0.38} depthWrite={false} />
      </mesh>
      <Atmosphere progressRef={progressRef} />
      <ContinentOutline outlineRef={outlineRef} map={coast} />
      <group ref={pin} visible={false}>
        <mesh position={[0, 0.045, 0]} raycast={() => null}>
          <cylinderGeometry args={[0.004, 0.004, 0.09, 8]} />
          <meshPhongMaterial color="#c5d0dc" specular="#ffffff" shininess={70} />
        </mesh>
        <mesh position={[0, 0.098, 0]} raycast={() => null}>
          <sphereGeometry args={[0.016, 24, 24]} />
          <meshPhongMaterial color="#7dccff" specular="#ffffff" shininess={90} />
        </mesh>
      </group>
    </group>
  );
}

function ContinentOutline({ outlineRef, map }: { outlineRef: React.RefObject<number>; map: THREE.Texture }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uId: { value: 0 }, uAlpha: { value: 0 }, uMap: { value: map } },
        vertexShader: `
          varying vec3 vPos;
          varying vec2 vUv;
          void main() {
            vPos = position;
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vPos;
          varying vec2 vUv;
          uniform float uId;
          uniform float uAlpha;
          uniform sampler2D uMap;
          void main() {
            if (uAlpha < 0.02 || uId < 0.5) discard;
            vec4 coast = texture2D(uMap, vUv);
            if (coast.a < 0.2) discard;
            if (abs(coast.r * 7.0 - uId) > 0.6) discard;
            gl_FragColor = vec4(0.55, 0.84, 1.0, coast.a * uAlpha);
          }
        `,
        transparent: true,
        depthWrite: false,
      }),
    [map],
  );

  const fade = useRef(0);
  useFrame((_, delta) => {
    const id = outlineRef.current ?? 0;
    if (id <= 0) {
      fade.current = 0;
      material.uniforms.uId.value = 0;
      material.uniforms.uAlpha.value = 0;
      return;
    }
    fade.current += (1 - fade.current) * (1 - Math.exp(-delta * 3.2));
    material.uniforms.uId.value = id;
    material.uniforms.uAlpha.value = fade.current;
  });

  return (
    <mesh scale={1.01} material={material} raycast={() => null}>
      <sphereGeometry args={[1, 64, 64]} />
    </mesh>
  );
}

function Atmosphere({ progressRef }: { progressRef: React.RefObject<number> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uAlpha: { value: 0.4 } },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uAlpha;
          varying vec3 vNormal;
          void main() {
            float fresnel = pow(0.42 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 1.35);
            gl_FragColor = vec4(0.25, 0.62, 1.0, uAlpha) * fresnel;
          }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  useFrame((state) => {
    const progress = progressRef.current ?? 0;
    const zoomIn = progress >= 0.5 ? 1 : smoothstep(0.4, 0.5, progress);
    const cityEase = zoomIn * zoomIn * (3 - 2 * zoomIn);
    if (mesh.current) mesh.current.scale.setScalar(1.045);
    material.uniforms.uAlpha.value = 0.95 * (1 - cityEase * 0.94);
  });

  return (
    <mesh ref={mesh} scale={1.045} material={material} raycast={() => null}>
      <sphereGeometry args={[1, 64, 64]} />
    </mesh>
  );
}

function starTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();
  const glow = ctx.createRadialGradient(64, 64, 0, 64, 64, 18);
  glow.addColorStop(0, "rgba(255,248,232,1)");
  glow.addColorStop(0.35, "rgba(255,236,204,0.85)");
  glow.addColorStop(1, "rgba(255,236,204,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function SatelliteShape() {
  return (
    <group>
      <mesh position={[0, 0.24, 0]}>
        <boxGeometry args={[0.3, 0.22, 0.015]} />
        <meshPhongMaterial color="#1d4e96" specular="#c5dcff" shininess={48} />
      </mesh>
      <mesh position={[0, -0.24, 0]}>
        <boxGeometry args={[0.3, 0.22, 0.015]} />
        <meshPhongMaterial color="#16386e" specular="#c5dcff" shininess={48} />
      </mesh>
        <mesh scale={[1.15, 0.62, 0.62]}>
          <sphereGeometry args={[0.16, 20, 16]} />
          <meshPhongMaterial color="#d5dee8" specular="#ffffff" shininess={90} />
        </mesh>
      <mesh position={[0.02, 0, 0.05]}>
        <boxGeometry args={[0.16, 0.05, 0.012]} />
        <meshPhongMaterial color="#d7b15a" specular="#fff2cc" shininess={50} />
      </mesh>
      <mesh position={[0.24, 0, 0]} rotation={[0.35, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.02, 8]} />
        <meshPhongMaterial color="#e7eef6" specular="#ffffff" shininess={70} />
      </mesh>
      <mesh position={[-0.24, 0.08, 0]} rotation={[0, 0, 0.7]}>
        <cylinderGeometry args={[0.007, 0.007, 0.16, 5]} />
        <meshPhongMaterial color="#f2f6fb" />
      </mesh>
    </group>
  );
}

function SurfaceSatellite({
  progressRef,
  hover,
  focusRef,
}: {
  progressRef: React.RefObject<number>;
  hover: React.RefObject<{ active: boolean; point: THREE.Vector3 }>;
  focusRef: React.RefObject<GlobeFocus>;
}) {
  const group = useRef<THREE.Group>(null);
  const outward = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const aim = useMemo(() => new THREE.Quaternion(), []);
  const place = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const node = group.current;
    const hand = hover.current;
    if (!node || !hand) return;
    const progress = progressRef.current ?? 0;
    const close = Boolean(focusRef.current?.close);
    const show = hand.active && progress >= 0.3 && (close || progress < 0.5);
    node.visible = show;
    node.scale.setScalar(close ? 0.1 : 0.22);
    if (!show) return;
    const follow = 1 - Math.exp(-delta * 16);
    place.copy(hand.point).normalize().multiplyScalar(1.045);
    node.position.lerp(place, follow);
    aim.setFromUnitVectors(outward, place.clone().normalize());
    node.quaternion.slerp(aim, follow);
  });

  return (
    <group ref={group} visible={false} scale={0.22} raycast={() => null}>
      <SatelliteShape />
    </group>
  );
}

function SkyStars({ progressRef }: { progressRef: React.RefObject<number> }) {
  const texture = useMemo(() => starTexture(), []);
  const stars = useMemo(() => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const placed: { id: number; position: [number, number, number]; size: number; hit: number }[] = [];
    const push = (x: number, y: number, z: number, scale = 1) => {
      placed.push({
        id: placed.length,
        position: [x, y, z],
        size: (0.16 + rand() * 0.22) * scale,
        hit: 0.62 + rand() * 0.35,
      });
    };
    while (placed.length < 288) {
      const dist = 8 + rand() * 18;
      const halfV = Math.tan(THREE.MathUtils.degToRad(16)) * dist;
      const halfH = halfV * 2.4;
      const across = (rand() - 0.5) * 1.85;
      const down = (rand() - 0.5) * 1.85;
      push(across * halfH, 0.22 + down * halfV, 5.15 - dist, 0.85 + rand() * 0.45);
    }
    return placed;
  }, []);
  const glow = useRef(stars.map(() => ({ value: 0, target: 0 })));
  const sprites = useRef<(THREE.Sprite | null)[]>([]);
  const seen = useRef(new Set<number>());

  useFrame((_, delta) => {
    const ease = 1 - Math.exp(-delta * 7);
    const fade = 1 - smoothstep(0.48, 0.58, progressRef.current ?? 0);
    glow.current.forEach((item, index) => {
      item.target = Math.max(0, item.target - delta * 0.9);
      item.value += (item.target - item.value) * ease;
      const sprite = sprites.current[index];
      if (!sprite) return;
      const scale = stars[index].size * (1 + item.value * 1.35);
      sprite.scale.set(scale, scale, 1);
      const material = sprite.material as THREE.SpriteMaterial;
      material.opacity = (0.7 + item.value * 0.3) * fade;
    });
  });

  const twinkle = (id: number) => {
    const item = glow.current[id];
    if (item) item.target = 1;
    if (!seen.current.has(id)) {
      seen.current.add(id);
      sessionStorage.setItem("gaia-stars", String(seen.current.size));
    }
  };

  return (
    <group>
      {stars.map((star) => (
        <group key={star.id} position={star.position}>
          <sprite ref={(node) => { sprites.current[star.id] = node; }} scale={star.size}>
            <spriteMaterial
              map={texture}
              transparent
              depthTest
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.7}
            />
          </sprite>
          <mesh
            onPointerOver={(event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              twinkle(star.id);
            }}
          >
            <sphereGeometry args={[star.hit, 8, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const CONTINENT_IDS: Record<Continent["id"], number> = {
  "north-america": 1,
  "south-america": 2,
  europe: 3,
  africa: 4,
  asia: 5,
  australia: 6,
  antarctica: 7,
};

function EarthReady({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return null;
}

export type TourAction = "drag" | "zoom" | "pin" | "analyze";

export default function EarthCanvas({
  progressRef,
  riseRef,
  onReady,
  onTour,
  allowZoomRef,
}: {
  progressRef: React.RefObject<number>;
  riseRef?: React.RefObject<number>;
  onReady?: () => void;
  onTour?: (action: TourAction) => void;
  allowZoomRef?: React.RefObject<boolean>;
}) {
  const hover = useRef({ active: false, point: new THREE.Vector3(0, 1, 0) });
  const outlineRef = useRef(0);
  const focusRef = useRef<GlobeFocus>({ close: false, lat: 0, lon: 0, pin: null });
  const [close, setClose] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(null);
  const router = useRouter();
  const [continent, setContinent] = useState<Continent | null>(null);
  const [cardOpacity, setCardOpacity] = useState(0);
  const shown = useRef<string | null>(null);
  const visible = useRef(false);
  const hideTimer = useRef(0);
  const showTimer = useRef(0);
  const selectContinent = (next: Continent | null) => {
    if (focusRef.current.close) return;
    const id = next?.id ?? null;
    if (id === shown.current) return;
    shown.current = id;
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(showTimer.current);
    if (!next) {
      if (!visible.current) return;
      hideTimer.current = window.setTimeout(() => {
        visible.current = false;
        setCardOpacity(0);
        outlineRef.current = 0;
        window.setTimeout(() => {
          if (shown.current === null) setContinent(null);
        }, 400);
      }, 1500);
      return;
    }
    visible.current = false;
    outlineRef.current = 0;
    setCardOpacity(0);
    showTimer.current = window.setTimeout(() => {
      if (shown.current !== next.id) return;
      visible.current = true;
      outlineRef.current = CONTINENT_IDS[next.id];
      setContinent(next);
      setCardOpacity(1);
    }, 500);
  };
  const pick = (lat: number, lon: number) => {
    if (!focusRef.current.close) {
      if (!allowZoomRef?.current) return;
      focusRef.current = { close: true, lat, lon, pin: null };
      setPin(null);
      setClose(true);
      outlineRef.current = 0;
      shown.current = null;
      window.clearTimeout(showTimer.current);
      window.clearTimeout(hideTimer.current);
      onTour?.("zoom");
      return;
    }
    focusRef.current = { ...focusRef.current, pin: { lat, lon } };
    setPin({ lat, lon });
    onTour?.("pin");
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !focusRef.current.close) return;
      focusRef.current = { close: false, lat: 0, lon: 0, pin: null };
      setClose(false);
      setPin(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const analyzePin = () => {
    if (!pin) return;
    const place = `How has the land at latitude ${pin.lat.toFixed(2)}, longitude ${pin.lon.toFixed(2)} changed since 2021?`;
    onTour?.("analyze");
    startPageTransition();
    router.push(`/analyze?blank=1&q=${encodeURIComponent(place)}`);
  };
  return (
    <div className="absolute inset-0 z-[6]">
      <Canvas
        camera={{ position: [0, 0.22, 3.65], fov: 32, near: 0.1, far: 100 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
      >
        <ambientLight intensity={0.28} />
        <directionalLight position={[5, 2.2, 4]} intensity={2.1} color="#fff6ea" />
        <directionalLight position={[-6, -2, -3]} intensity={0.35} color="#7eafff" />
        <SkyStars progressRef={progressRef} />
        <SurfaceSatellite progressRef={progressRef} hover={hover} focusRef={focusRef} />
        <Suspense fallback={null}>
          <Earth
            progressRef={progressRef}
            riseRef={riseRef}
            hover={hover}
            onContinent={selectContinent}
            outlineRef={outlineRef}
            focusRef={focusRef}
            onLandClick={pick}
            onDragged={() => onTour?.("drag")}
          />
          <EarthReady onReady={onReady} />
        </Suspense>
      </Canvas>
      {continent && !close && (
        <aside
          className="pointer-events-auto absolute right-[6%] top-[18%] z-20 w-[min(260px,30vw)] border border-white/20 bg-[#05060f]/85 p-4 text-white transition-opacity duration-300"
          style={{ opacity: cardOpacity }}
          onMouseEnter={() => {
            window.clearTimeout(hideTimer.current);
            if (continent) shown.current = continent.id;
          }}
          onMouseLeave={() => selectContinent(null)}
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#7dccff]">{continent.name}</p>
          <p className="mt-2 text-sm leading-relaxed text-white/85">{continent.blurb}</p>
          <Link
            onClick={() => startPageTransition()}
            href={`/explore?continent=${continent.id}`}
            className="mt-3 inline-block text-sm text-[#7dccff] underline"
          >
            Explore {continent.name}
          </Link>
        </aside>
      )}
      {close && (
        <aside className="pointer-events-auto absolute right-[6vw] top-1/2 z-20 w-[min(280px,34vw)] -translate-y-1/2 border border-white/20 bg-[#05060f]/80 p-4 text-sm leading-relaxed text-white">
          <p>Click esc to go back to the globe, or click to place a pin.</p>
          {pin && (
            <p className="mt-3 text-white/80">Pin placed at: longitude {pin.lon.toFixed(2)}, latitude {pin.lat.toFixed(2)}</p>
          )}
          {pin && (
            <button
              type="button"
              onClick={analyzePin}
              className="mt-4 border border-[#7dccff] px-4 py-2 text-sm text-[#7dccff]"
            >
              Analyze
            </button>
          )}
        </aside>
      )}
    </div>
  );
}
