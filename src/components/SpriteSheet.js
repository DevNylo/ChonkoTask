import React, { useEffect, useState, useRef } from 'react';
import { View, Image, StyleSheet } from 'react-native';

const SpriteSheet = ({ 
  source, 
  columns = 8, 
  rows = 8, 
  frameWidth = 512, 
  frameHeight = 512, 
  fps = 24, // 24 quadros por segundo para ficar fluido
  displaySize = 300 // Tamanho que vai aparecer na tela do celular
}) => {
  const [frameIndex, setFrameIndex] = useState(0);
  const totalFrames = columns * rows;
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % totalFrames);
    }, 1000 / fps);

    return () => clearInterval(timerRef.current);
  }, [fps, totalFrames]);

  // Cálculo da posição da imagem gigante
  const currentColumn = frameIndex % columns;
  const currentRow = Math.floor(frameIndex / columns);

  const translateX = -currentColumn * frameWidth;
  const translateY = -currentRow * frameHeight;

  // Fator de escala para caber na tela do celular (Ex: 512px -> 300px)
  const scale = displaySize / frameWidth;

  return (
    <View 
      style={{ 
        width: displaySize, 
        height: displaySize, 
        overflow: 'hidden', // ISSO É O SEGREDO: Esconde o resto da imagem
        backgroundColor: 'transparent'
      }}
    >
      <Image
        source={source}
        style={{
          width: frameWidth * columns, // Largura total da imagem (4096)
          height: frameHeight * rows,  // Altura total da imagem (4096)
          transform: [
            // Primeiro movemos a imagem para o frame certo
            { translateX: translateX }, 
            { translateY: translateY },
            // Depois escalamos tudo para caber no displaySize
            // Nota: No React Native, a ordem do transform importa e a origem é o centro.
            // Para simplificar spritesheets, muitas vezes é mais fácil usar left/top
            // mas transform é mais performático (GPU).
            // Devido à complexidade de âncora no RN, vamos usar um truque de wrapper abaixo.
          ],
          position: 'absolute',
          left: 0,
          top: 0,
        }}
        // ResizeMode deve ser stretch ou cover para garantir dimensões exatas
        resizeMode="stretch" 
      />
    </View>
  );
};

/**
 * Wrapper para lidar com a escala corretamente sem dor de cabeça com âncoras
 */
const ScaledSprite = (props) => {
  const scale = props.displaySize / props.frameWidth;
  
  return (
    <View style={{ width: props.displaySize, height: props.displaySize, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
       {/* Criamos uma View interna que tem o tamanho original do frame (512) e aplicamos scale nela */}
       <View style={{ 
          width: props.frameWidth, 
          height: props.frameHeight, 
          transform: [{ scale: scale }] 
       }}>
          <SpriteSheetInner {...props} />
       </View>
    </View>
  );
}

// Lógica interna de posicionamento
const SpriteSheetInner = ({ source, columns, rows, frameWidth, frameHeight, frameIndex }) => {
  // Recalculando aqui para não passar props demais
  // Nota: Para produção real, o ideal é mover o state para cá
  const [innerFrame, setInnerFrame] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
        setInnerFrame(f => (f + 1) % (columns * rows));
    }, 1000 / 24); // 24 FPS Hardcoded ou via prop
    return () => clearInterval(interval);
  }, []);

  const col = innerFrame % columns;
  const row = Math.floor(innerFrame / columns);
  
  return (
    <View style={{ width: frameWidth, height: frameHeight, overflow: 'hidden' }}>
      <Image 
        source={source}
        style={{
            width: frameWidth * columns,
            height: frameHeight * rows,
            position: 'absolute',
            left: -col * frameWidth,
            top: -row * frameHeight,
        }}
      />
    </View>
  )
}

export default ScaledSprite;