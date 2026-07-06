import { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';

const SpriteSheet = ({ 
  source, 
  columns = 8, 
  rows = 8, 
  frameWidth = 512, 
  frameHeight = 512, 
  fps = 24, 
  displaySize = 300,
  onLoad // NOVO: Callback para avisar que carregou
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

  const currentColumn = frameIndex % columns;
  const currentRow = Math.floor(frameIndex / columns);

  const translateX = -currentColumn * frameWidth;
  const translateY = -currentRow * frameHeight;

  // Escala para visualização
  const scale = displaySize / frameWidth;

  return (
    <View style={{ 
      width: displaySize, 
      height: displaySize, 
      overflow: 'hidden', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
       <View style={{ 
          width: frameWidth, 
          height: frameHeight, 
          transform: [{ scale: scale }] 
       }}>
        <View style={{ width: frameWidth, height: frameHeight, overflow: 'hidden' }}>
          <Image
            source={source}
            // NOVO: Avisa o pai quando a imagem pesada terminou de carregar
            onLoad={onLoad} 
            
            // NOVO: 'scale' usa um algoritmo melhor para reduzir imagens grandes (reduz serrilhado)
            resizeMethod="scale" 
            
            style={{
                width: frameWidth * columns,
                height: frameHeight * rows,
                position: 'absolute',
                left: -currentColumn * frameWidth, // Usando left/top para evitar flickering em low-end
                top: -currentRow * frameHeight,
            }}
            resizeMode="stretch" 
          />
        </View>
       </View>
    </View>
  );
};

export default SpriteSheet;