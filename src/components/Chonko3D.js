import { Center, Environment, Float, Outlines, useGLTF } from '@react-three/drei/native';
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
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <primitive object={scene} {...props}>
             <Outlines thickness={0.05} color="black" />
        </primitive>
    </Float>
  );
}

// Componente de Loading para colocar DENTRO do Suspense
function Loader3D() {
  return (
    // Como não dá para renderizar View nativa direto no Canvas sem Html,
    // Deixamos vazio aqui e controlamos o loading por fora ou usamos um placeholder 3D.
    // Mas a melhor estratégia para React Native é renderizar nada aqui
    // e deixar o fallback do Suspense cuidar visualmente.
    <mesh visible={false} /> 
  );
}

export default function Chonko3D() {
  return (
    <View style={styles.container}>
      <Canvas 
        camera={{ position: [0, 1, 4], fov: 45 }}
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
        <directionalLight position={[0, 2, 10]} intensity={3} />

        {/* O suspense aqui controla o que aparece enquanto o modelo de 10s carrega */}
        <Suspense fallback={null}>
            <Center>
               <Model scale={0.45} position={[0, -3, 0]} />
            </Center>
        </Suspense>
      </Canvas>

      {/* SPINNER SOBREPOSTO (Overlay) */}
      {/* Esse spinner fica na frente do Canvas e só some quando o React terminar de suspender o modelo */}
      {/* Nota: Para fazer isso sumir automaticamente precisaríamos de um estado de 'loaded' vindo de dentro do Canvas,
          mas apenas adicionar o ActivityIndicator aqui com position absolute já ajuda a preencher o vazio se usarmos 
          um state externo. Como simplificação, recomendo FOCAR NO BLENDER. */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  }
});