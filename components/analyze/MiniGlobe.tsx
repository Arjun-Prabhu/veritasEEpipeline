"use client";

import { useTexture } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

function latLonToVec(lat: number, lon: number, radius: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function PinGlobe({ lat, lon }: { lat: number; lon: number }) {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const [day] = useTexture(["/textures/earth_day.jpg"]);
  const pin = useMemo(() => latLonToVec(lat, lon, 1.04), [lat, lon]);

  useLayoutEffect(() => {
    day.colorSpace = THREE.SRGBColorSpace;
    if (!group.current) return;
    group.current.quaternion.setFromUnitVectors(pin.clone().normalize(), new THREE.Vector3(0, 0, 1));
    camera.position.set(0, 0.15, 2.55);
    camera.lookAt(0, 0, 0);
  }, [camera, day, pin]);

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[1, 48, 48]} />
        <meshPhongMaterial map={day} specular="#9ec4ff" shininess={10} />
      </mesh>
      <mesh position={pin.toArray()}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color="#dff56a" />
      </mesh>
    </group>
  );
}

export default function MiniGlobe({ lat, lon }: { lat: number; lon: number }) {
  return (
    <Canvas
      camera={{ position: [0, 0.15, 2.55], fov: 32 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 2, 4]} intensity={1.8} />
      <Suspense fallback={null}>
        <PinGlobe lat={lat} lon={lon} />
      </Suspense>
    </Canvas>
  );
}
