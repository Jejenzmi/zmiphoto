import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Text, useTexture, Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import UnderwaterScene from "./scenes/UnderwaterScene";

interface Theme3DProps {
  photoUrl: string;
  themeName?: string;
  onCapture3D?: (dataUrl: string) => void;
}

// Photo frame floating in space
const PhotoFrame = ({ photoUrl, position, rotation }: { photoUrl: string; position: [number, number, number]; rotation?: [number, number, number] }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(photoUrl);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh ref={meshRef} position={position} rotation={rotation || [0, 0, 0]}>
        {/* Frame border */}
        <boxGeometry args={[2.4, 3.2, 0.08]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Photo on front */}
      <mesh position={[position[0], position[1], position[2] + 0.05]} rotation={rotation || [0, 0, 0]}>
        <planeGeometry args={[2.1, 2.8]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </Float>
  );
};

// Floating planet
const Planet = ({ position, color, size }: { position: [number, number, number]; color: string; size: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.003;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 32, 32]} />
      <MeshDistortMaterial color={color} speed={2} distort={0.15} radius={1} metalness={0.3} roughness={0.6} />
    </mesh>
  );
};

// Saturn ring
const SaturnRing = ({ position }: { position: [number, number, number] }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.001;
    }
  });

  return (
    <mesh ref={ringRef} position={position} rotation={[Math.PI / 3, 0, 0]}>
      <ringGeometry args={[1.6, 2.2, 64]} />
      <meshStandardMaterial color="#e8c170" side={THREE.DoubleSide} transparent opacity={0.6} metalness={0.4} roughness={0.3} />
    </mesh>
  );
};

// Orbiting particles/asteroids
const Asteroids = () => {
  const groupRef = useRef<THREE.Group>(null);
  const asteroids = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      pos: [
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 15 - 5,
      ] as [number, number, number],
      size: Math.random() * 0.12 + 0.03,
      speed: Math.random() * 0.02 + 0.005,
    }));
  }, []);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <group ref={groupRef}>
      {asteroids.map((a, i) => (
        <mesh key={i} position={a.pos}>
          <dodecahedronGeometry args={[a.size]} />
          <meshStandardMaterial color="#8888aa" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
};

// Nebula glow
const NebulaLight = () => {
  return (
    <>
      <pointLight position={[5, 3, -5]} intensity={2} color="#6366f1" distance={15} />
      <pointLight position={[-5, -2, -3]} intensity={1.5} color="#ec4899" distance={12} />
      <pointLight position={[0, 5, 3]} intensity={1} color="#06b6d4" distance={10} />
    </>
  );
};

// 3D Capture button logic
const CaptureHelper = ({ onCapture }: { onCapture: (url: string) => void }) => {
  const { gl, scene, camera } = useThree();
  
  const capture = () => {
    gl.render(scene, camera);
    const dataUrl = gl.domElement.toDataURL("image/png");
    onCapture(dataUrl);
  };

  // Expose capture function
  (window as any).__capture3D = capture;
  return null;
};

const SpaceScene = ({ photos, onCapture }: { photos: string[]; onCapture?: (url: string) => void }) => {
  // Position photos in a semi-circle
  const positions: [number, number, number][] = useMemo(() => {
    if (photos.length === 1) return [[0, 0, 0]];
    if (photos.length === 2) return [[-1.5, 0, 0], [1.5, 0, 0]];
    if (photos.length === 3) return [[-2.5, 0, 0.5], [0, 0.3, -0.5], [2.5, 0, 0.5]];
    return [[-2.5, 0.5, 1], [-0.8, -0.3, -0.5], [0.8, 0.3, -0.5], [2.5, 0.5, 1]];
  }, [photos.length]);

  const rotations: [number, number, number][] = useMemo(() => {
    if (photos.length === 1) return [[0, 0, 0]];
    if (photos.length === 2) return [[0, 0.2, 0], [0, -0.2, 0]];
    if (photos.length === 3) return [[0, 0.3, 0], [0, 0, 0], [0, -0.3, 0]];
    return [[0, 0.3, 0.05], [0, 0.1, -0.03], [0, -0.1, 0.03], [0, -0.3, -0.05]];
  }, [photos.length]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 5, 5]} intensity={1} />
      <NebulaLight />
      <Stars radius={50} depth={30} count={3000} factor={4} saturation={0.5} fade speed={0.5} />
      <Asteroids />

      {/* Planets */}
      <Planet position={[-6, 3, -8]} color="#6366f1" size={1.2} />
      <Planet position={[7, -2, -10]} color="#ec4899" size={0.8} />
      <Planet position={[4, 4, -12]} color="#f59e0b" size={1.5} />
      <SaturnRing position={[4, 4, -12]} />

      {/* Photos floating in space */}
      {photos.map((photo, i) => (
        <PhotoFrame key={i} photoUrl={photo} position={positions[i] || [0, 0, 0]} rotation={rotations[i]} />
      ))}

      {/* Title text */}
      <Text
        position={[0, 3, -3]}
        fontSize={0.5}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        ✦ ZMI PHOTOBOX ✦
      </Text>

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={3}
        maxDistance={12}
        autoRotate
        autoRotateSpeed={0.5}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.5}
      />

      {onCapture && <CaptureHelper onCapture={onCapture} />}
    </>
  );
};

// Available 3D themes
export const THEMES_3D = [
  { id: "space", name: "🚀 Luar Angkasa", desc: "Foto melayang di galaksi" },
  { id: "underwater", name: "🌊 Bawah Laut", desc: "Dunia bawah air" },
  { id: "neon-city", name: "🌃 Neon City", desc: "Kota futuristik" },
  { id: "forest", name: "🌲 Enchanted Forest", desc: "Hutan ajaib" },
];

const Theme3DPreview = ({ photos, theme = "space", onCapture3D }: { photos: string[]; theme?: string; onCapture3D?: (url: string) => void }) => {
  if (photos.length === 0) return null;

  const handleCapture = () => {
    if ((window as any).__capture3D) {
      (window as any).__capture3D();
    }
  };

  const renderScene = () => {
    if (theme === "underwater") {
      return (
        <>
          <UnderwaterScene photos={photos} onCapture={onCapture3D} />
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={3}
            maxDistance={12}
            autoRotate
            autoRotateSpeed={0.3}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.5}
          />
          {onCapture3D && <CaptureHelper onCapture={onCapture3D} />}
        </>
      );
    }
    return <SpaceScene photos={photos} onCapture={onCapture3D} />;
  };

  return (
    <div className="w-full">
      <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-border bg-black/90">
        <Canvas
          camera={{ position: [0, 0, 6], fov: 50 }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
          dpr={[1, 2]}
        >
          <Suspense fallback={null}>
            {renderScene()}
          </Suspense>
        </Canvas>
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-[10px] text-muted-foreground">🖱️ Drag untuk rotasi · Scroll untuk zoom</p>
        {onCapture3D && (
          <button onClick={handleCapture}
            className="text-xs text-primary hover:underline">
            📸 Capture 3D View
          </button>
        )}
      </div>
    </div>
  );
};

export default Theme3DPreview;
