"use client";

import { Stars, useTexture } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
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

function Earth({ progressRef }: { progressRef: React.RefObject<number> }) {
  const earth = useRef<THREE.Group>(null);
  const clouds = useRef<THREE.Mesh>(null);
  const [day, normal, spec, cloudMap] = useTexture([
    "/textures/earth_day.jpg",
    "/textures/earth_normal.jpg",
    "/textures/earth_spec.jpg",
    "/textures/earth_clouds.png",
  ]);

  useEffect(() => {
    day.colorSpace = THREE.SRGBColorSpace;
    cloudMap.colorSpace = THREE.SRGBColorSpace;
    day.anisotropy = 8;
  }, [day, cloudMap]);

  const poses = useMemo(() => {
    const charlotte = latLonToVec(35.2271, -80.8431, 1).normalize();
    return {
      horizon: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, 1.05, 0)),
      globe: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.18, 0.42, 0)),
      city: new THREE.Quaternion().setFromUnitVectors(charlotte, new THREE.Vector3(0, 0, 1)),
      mixed: new THREE.Quaternion(),
    };
  }, []);

  useFrame((state, delta) => {
    const progress = progressRef.current ?? 0;
    const zoomOut = smoothstep(0.06, 0.32, progress);
    const zoomIn = smoothstep(0.36, 0.58, progress);
    const globeEase = zoomOut * zoomOut * (3 - 2 * zoomOut);
    const cityEase = zoomIn * zoomIn * (3 - 2 * zoomIn);

    poses.mixed.copy(poses.horizon).slerp(poses.globe, globeEase);
    poses.mixed.slerp(poses.city, cityEase);
    if (earth.current) earth.current.quaternion.copy(poses.mixed);
    if (clouds.current) {
      clouds.current.rotation.y = state.clock.elapsedTime * 0.012 * (1 - cityEase);
    }

    const z = lerp(lerp(3.65, 5.35, globeEase), 1.72, cityEase);
    const y = lerp(lerp(0.22, 0, globeEase), 0, cityEase);
    const lookY = lerp(lerp(0.92, 0.2, globeEase), 0, cityEase);
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, z, 3.4, delta);
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, y, 3.4, delta);
    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, 0, 3.4, delta);
    state.camera.lookAt(0, lookY, 0);
  });

  return (
    <group ref={earth}>
      <mesh>
        <sphereGeometry args={[1, 96, 96]} />
        <meshPhongMaterial
          map={day}
          normalMap={normal}
          specularMap={spec}
          specular="#b9d7ff"
          shininess={14}
        />
      </mesh>
      <mesh ref={clouds} scale={1.012}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial map={cloudMap} transparent opacity={0.38} depthWrite={false} />
      </mesh>
      <Atmosphere />
    </group>
  );
}

function Atmosphere() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          void main() {
            float fresnel = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.4);
            gl_FragColor = vec4(0.45, 0.72, 1.0, 1.0) * fresnel;
          }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  return (
    <mesh scale={1.14} material={material}>
      <sphereGeometry args={[1, 64, 64]} />
    </mesh>
  );
}

export default function EarthCanvas({ progressRef }: { progressRef: React.RefObject<number> }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0.22, 3.65], fov: 32, near: 0.1, far: 100 }}
        dpr={[1, 1.6]}
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
        <Stars radius={60} depth={40} count={1600} factor={2.4} saturation={0} fade speed={0.25} />
        <Suspense fallback={null}>
          <Earth progressRef={progressRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}
