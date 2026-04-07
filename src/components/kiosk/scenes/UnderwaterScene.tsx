import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Text, useTexture } from "@react-three/drei";
import * as THREE from "three";

// Underwater photo frame with coral-like border
const UnderwaterPhotoFrame = ({ photoUrl, position, rotation }: { photoUrl: string; position: [number, number, number]; rotation?: [number, number, number] }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(photoUrl);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.3 + position[0]) * 0.15;
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2 + position[0]) * 0.03;
    }
  });

  return (
    <Float speed={0.8} rotationIntensity={0.15} floatIntensity={0.6}>
      <group ref={meshRef as any} position={position} rotation={rotation || [0, 0, 0]}>
        {/* Shell-like frame */}
        <mesh>
          <boxGeometry args={[2.5, 3.3, 0.12]} />
          <meshStandardMaterial color="#1a6b5a" metalness={0.4} roughness={0.6} />
        </mesh>
        {/* Inner gold trim */}
        <mesh position={[0, 0, 0.03]}>
          <boxGeometry args={[2.25, 3.05, 0.04]} />
          <meshStandardMaterial color="#c9a84c" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Photo */}
        <mesh position={[0, 0, 0.07]}>
          <planeGeometry args={[2.1, 2.8]} />
          <meshBasicMaterial map={texture} />
        </mesh>
      </group>
    </Float>
  );
};

// Bubble particles
const Bubbles = () => {
  const groupRef = useRef<THREE.Group>(null);
  const bubbles = useMemo(() => {
    return Array.from({ length: 60 }, () => ({
      pos: [
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 10 - 3,
      ] as [number, number, number],
      size: Math.random() * 0.08 + 0.02,
      speed: Math.random() * 0.4 + 0.15,
      wobble: Math.random() * 2,
    }));
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const b = bubbles[i];
      child.position.y += b.speed * 0.016;
      child.position.x = b.pos[0] + Math.sin(state.clock.elapsedTime * 0.5 + b.wobble) * 0.3;
      if (child.position.y > 7) child.position.y = -6;
    });
  });

  return (
    <group ref={groupRef}>
      {bubbles.map((b, i) => (
        <mesh key={i} position={b.pos}>
          <sphereGeometry args={[b.size, 12, 12]} />
          <meshStandardMaterial color="#aaeeff" transparent opacity={0.35} metalness={0.1} roughness={0.1} />
        </mesh>
      ))}
    </group>
  );
};

// Coral cluster
const Coral = ({ position, color, scale = 1 }: { position: [number, number, number]; color: string; scale?: number }) => {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3 + position[0]) * 0.05;
    }
  });

  const branches = useMemo(() =>
    Array.from({ length: 5 }, () => ({
      pos: [(Math.random() - 0.5) * 0.6, Math.random() * 0.8, (Math.random() - 0.5) * 0.4] as [number, number, number],
      h: Math.random() * 0.6 + 0.3,
      r: Math.random() * 0.08 + 0.04,
      tilt: [(Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.5] as [number, number, number],
    })), []);

  return (
    <group ref={ref} position={position} scale={scale}>
      {branches.map((b, i) => (
        <mesh key={i} position={b.pos} rotation={b.tilt}>
          <cylinderGeometry args={[b.r * 0.5, b.r, b.h, 6]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
};

// Fish swimming
const Fish = ({ color, speed, radius, yOffset }: { color: string; speed: number; radius: number; yOffset: number }) => {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed;
    ref.current.position.x = Math.sin(t) * radius;
    ref.current.position.z = Math.cos(t) * radius * 0.6 - 3;
    ref.current.position.y = yOffset + Math.sin(t * 2) * 0.3;
    ref.current.rotation.y = Math.atan2(Math.cos(t) * radius, -Math.sin(t) * radius * 0.6) + Math.PI;
  });

  return (
    <group ref={ref}>
      {/* Body */}
      <mesh>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.5} />
      </mesh>
      {/* Tail */}
      <mesh position={[-0.2, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
        <coneGeometry args={[0.1, 0.15, 4]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.5} />
      </mesh>
    </group>
  );
};

// Seaweed
const Seaweed = ({ position }: { position: [number, number, number] }) => {
  const ref = useRef<THREE.Group>(null);
  const segments = useMemo(() => Array.from({ length: 6 }, (_, i) => i), []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.children.forEach((child, i) => {
      child.rotation.z = Math.sin(state.clock.elapsedTime * 0.5 + i * 0.5 + position[0]) * 0.1 * (i + 1);
    });
  });

  return (
    <group ref={ref} position={position}>
      {segments.map((i) => (
        <mesh key={i} position={[0, i * 0.3, 0]}>
          <boxGeometry args={[0.06, 0.35, 0.03]} />
          <meshStandardMaterial color="#2d8a5e" transparent opacity={0.8} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
};

// Sandy floor
const SeaFloor = () => (
  <mesh position={[0, -4.5, -3]} rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[30, 20]} />
    <meshStandardMaterial color="#8a7d5a" roughness={1} />
  </mesh>
);

// Light rays from surface
const UnderwaterLights = () => (
  <>
    <ambientLight intensity={0.25} color="#4488aa" />
    <directionalLight position={[0, 10, 3]} intensity={0.8} color="#88ccee" />
    <pointLight position={[-4, 3, -2]} intensity={1.2} color="#0077aa" distance={15} />
    <pointLight position={[4, 2, -4]} intensity={0.8} color="#00aacc" distance={12} />
    <pointLight position={[0, -3, 0]} intensity={0.5} color="#115577" distance={10} />
    {/* Caustic-like light from above */}
    <spotLight position={[2, 8, 2]} angle={0.5} penumbra={1} intensity={1.5} color="#66ccee" distance={20} />
    <spotLight position={[-3, 8, -1]} angle={0.4} penumbra={1} intensity={1} color="#44aacc" distance={18} />
  </>
);

// Fog overlay for depth
const WaterFog = () => (
  <fog attach="fog" args={["#0a3d5c", 5, 25]} />
);

interface UnderwaterSceneProps {
  photos: string[];
  onCapture?: (url: string) => void;
}

const UnderwaterScene = ({ photos, onCapture }: UnderwaterSceneProps) => {
  const positions: [number, number, number][] = useMemo(() => {
    if (photos.length === 1) return [[0, 0, 0]];
    if (photos.length === 2) return [[-1.5, 0, 0], [1.5, 0, 0]];
    if (photos.length === 3) return [[-2.5, 0, 0.5], [0, 0.3, -0.5], [2.5, 0, 0.5]];
    return [[-2.5, 0.5, 1], [-0.8, -0.3, -0.5], [0.8, 0.3, -0.5], [2.5, 0.5, 1]];
  }, [photos.length]);

  const rotations: [number, number, number][] = useMemo(() => {
    if (photos.length === 1) return [[0, 0, 0]];
    if (photos.length === 2) return [[0, 0.15, 0], [0, -0.15, 0]];
    if (photos.length === 3) return [[0, 0.25, 0], [0, 0, 0], [0, -0.25, 0]];
    return [[0, 0.3, 0.03], [0, 0.1, -0.02], [0, -0.1, 0.02], [0, -0.3, -0.03]];
  }, [photos.length]);

  return (
    <>
      <WaterFog />
      <UnderwaterLights />
      <Bubbles />
      <SeaFloor />

      {/* Corals */}
      <Coral position={[-5, -4, -4]} color="#e8456b" scale={1.5} />
      <Coral position={[-3, -4, -2]} color="#ff7744" scale={1.2} />
      <Coral position={[4, -4, -3]} color="#cc55aa" scale={1.8} />
      <Coral position={[6, -4, -5]} color="#ff6688" scale={1.3} />
      <Coral position={[0, -4, -6]} color="#ee8855" scale={1} />

      {/* Seaweed */}
      <Seaweed position={[-6, -4, -3]} />
      <Seaweed position={[-4.5, -4, -5]} />
      <Seaweed position={[5, -4, -4]} />
      <Seaweed position={[3, -4, -6]} />

      {/* Fish */}
      <Fish color="#ffaa33" speed={0.3} radius={5} yOffset={1} />
      <Fish color="#44ccff" speed={0.4} radius={4} yOffset={-1} />
      <Fish color="#ff6688" speed={0.25} radius={6} yOffset={2} />
      <Fish color="#77ee55" speed={0.35} radius={3.5} yOffset={0} />
      <Fish color="#ffdd44" speed={0.28} radius={7} yOffset={-2} />

      {/* Photos */}
      {photos.map((photo, i) => (
        <UnderwaterPhotoFrame key={i} photoUrl={photo} position={positions[i] || [0, 0, 0]} rotation={rotations[i]} />
      ))}

      {/* Title */}
      <Text
        position={[0, 3.5, -3]}
        fontSize={0.45}
        color="#88ddff"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        🐠 ZMI PHOTOBOX 🐠
      </Text>
    </>
  );
};

export default UnderwaterScene;
