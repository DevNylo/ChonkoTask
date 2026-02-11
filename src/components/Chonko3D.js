import { Environment, Float, Outlines, useGLTF } from '@react-three/drei/native'; // Removi Center
import { Canvas } from '@react-three/fiber/native';
import { Suspense, useEffect } from 'react';
import { LogBox, StyleSheet, View } from 'react-native';
import * as THREE from 'three';

// Silenciador de logs
LogBox.ignoreLogs(['EXGL: gl.pixelStorei', 'Three.js being imported', 'TRN: Texture has been resized']);

const chonkoModelSource = require('../../assets/3D/Chonko.glb'); 

function Model(props) {
  const { scene } = useGLTF(chonkoModelSource);

  // OTIMIZAÇÃO OBRIGATÓRIA DE TEXTURA
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh && child.material && child.material.map) {
        child.material.map.flipY = false;
        child.material.map.generateMipmaps = false; 
        child.material.minFilter = THREE.LinearFilter;
        child.material.needsUpdate = true;
      }
    });
  }, [scene]);

  return (
    // O {...props} aqui permite que a gente controle position e scale lá embaixo
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <primitive object={scene} {...props}>
             <Outlines thickness={0.05} color="black" />
        </primitive>
    </Float>
  );
}

export default function Chonko3D() {
  return (
    <View style={styles.container}>
      <Canvas 
        // 1. AJUSTE DE CÂMERA:
        // Position [0, 0, 6] afasta a câmera para trás (Eixo Z)
        // FOV 45 deixa a perspectiva bonita sem distorcer
        camera={{ position: [0, 0, 6], fov: 45 }}
        
        onCreated={(state) => {
            const _gl = state.gl.getContext();
            const _pixelStorei = _gl.pixelStorei;
            _gl.pixelStorei = function(...args) {
                if (args[0] === _gl.UNPACK_FLIP_Y_WEBGL) return;
                try { _pixelStorei.call(_gl, ...args) } catch(e){}
            }
        }}
      >
        <Environment preset="city" />
        <ambientLight intensity={1.8} />
        {/* Luz frontal superior para destacar o rosto */}
        <directionalLight position={[0, 2, 10]} intensity={2.5} />

        <Suspense fallback={null}>
            {/* 2. REMOVIDO O <Center> */}
            {/* Agora controlamos na mão. Se quiser subir/descer, mexa no segundo valor de position (Y) */}
            <Model 
                scale={0.6}           // Ajuste o tamanho aqui
                position={[0, -2.2, 0]} // [Esquerda/Direita, Baixo/Cima, Perto/Longe]
                rotation={[0, 0.2, 0]} // Leve rotação para ele olhar de ladinho
            />
        </Suspense>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  }
});