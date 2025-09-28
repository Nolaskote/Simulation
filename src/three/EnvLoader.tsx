import { useEffect, useState } from 'react';
import { Environment } from '@react-three/drei';

export default function EnvLoader() {
  const [hdrPath, setHdrPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const candidate = '/textures/space.hdr';
    fetch(candidate, { method: 'HEAD' })
      .then((res) => {
        if (cancelled) return;
        setHdrPath(res.ok ? candidate : null);
      })
      .catch(() => {
        if (cancelled) return;
        setHdrPath(null);
      });
    return () => { cancelled = true; };
  }, []);

  if (hdrPath) {
    return <Environment files={hdrPath} background={false} />;
  }
  // If no HDR is present, don't add a preset to keep the lighting predictable
  return null;
}
