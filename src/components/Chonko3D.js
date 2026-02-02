import { Float, useGLTF } from '@react-three/drei/native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import React, { useRef } from 'react';
import { View } from 'react-native';

const MODEL_URL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb';

function Model(props) {
  const { scene } = useGLTF(MODEL_URL);
  const mesh = useRef();

  useFrame((state, delta) => {
    if (mesh.current) {
      mesh.current.rotation.y += delta * 0.5; 
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <primitive 
            object={scene} 
            ref={mesh} 
            {...props} 
        />
    </Float>
  );
}

export default function Chonko3D() {
  return (
    <View style={{ width: '100%', height: 300 }}>
      <Canvas camera={{ position: [0, 1, 4], fov: 45 }}>
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} intensity={2} />
        <pointLight position={[-5, -5, -5]} color="white" intensity={1} />
        <React.Suspense fallback={null}>
            <Model scale={1.2} position={[0, -0.5, 0]} />
        </React.Suspense>
      </Canvas>
    </View>
  );
}