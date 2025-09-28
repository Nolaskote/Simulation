import { useEffect, useState } from 'react';
import { TextureLoader, EquirectangularReflectionMapping, SRGBColorSpace, Texture, Color } from 'three';
import { asset } from '../utils/asset';
import { useThree } from '@react-three/fiber';

export default function SpaceBackground() {
  const { scene } = useThree();
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    const loader = new TextureLoader();
    let cancelled = false;

    const set = (tex: Texture) => {
      if (cancelled) return;
      setTexture(tex);
    };

    // 1) Load the user-provided JPG first
    loader.load(
      asset('textures/space.png'),
      set,
      undefined,
    );

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!texture) {
      // Si falla la textura, asegurar fondo negro para evitar gris
      // @ts-ignore
      scene.background = new Color(0x000000);
      return;
    }
    texture.mapping = EquirectangularReflectionMapping;
    texture.colorSpace = SRGBColorSpace;
    scene.background = texture;
    return () => {
      // Limpieza: no dejar referencias colgantes
      // scene.background = null as any;
    };
  }, [texture, scene]);

  // Si no se pudo cargar ninguna textura, dejamos el fondo por defecto del renderer
  // El fondo gris podría venir del app o del CSS; esto no debería romper el render.

  return null;
}
