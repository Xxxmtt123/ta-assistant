import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const storeSetIsMobile = useAppStore((s) => s.setIsMobile);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      storeSetIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [storeSetIsMobile]);

  return isMobile;
}
