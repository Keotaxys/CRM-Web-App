import { useEffect, useState } from 'react';
import { getBlob, ref } from 'firebase/storage';
import { storage } from '../firebase/config';

function AuthenticatedStorageImage({ storagePath, legacyUrl, alt, className, fallback }) {
  const [source, setSource] = useState('');
  useEffect(() => {
    let objectUrl = '';
    let active = true;
    getBlob(ref(storage, storagePath)).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setSource(objectUrl);
    }).catch(() => {
      if (active) setSource(legacyUrl || '');
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [legacyUrl, storagePath]);

  return source ? <img src={source} alt={alt} className={className}/> : fallback;
}

export default function ManagedImage({ storagePath, legacyUrl, alt, className, fallback = null }) {
  if (!storagePath) return legacyUrl ? <img src={legacyUrl} alt={alt} className={className}/> : fallback;
  return <AuthenticatedStorageImage key={storagePath} storagePath={storagePath} legacyUrl={legacyUrl} alt={alt} className={className} fallback={fallback}/>;
}
