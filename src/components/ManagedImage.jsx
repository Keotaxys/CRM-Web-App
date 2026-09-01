import { useEffect, useState } from 'react';
import { getBlob, ref } from 'firebase/storage';
import { storage } from '../firebase/config';

function safeDiagnosticText(value, fallback) {
  const text = typeof value === 'string' && value ? value : fallback;
  return text
    .replace(/customers\/[^/'"\s]+/gi, 'customers/[redacted-customer]')
    .replace(/([?&]token=)[^&\s]+/gi, '$1[redacted]')
    .replace(/https?:\/\/\S+/gi, '[redacted-url]')
    .slice(0, 300);
}

function managedSlot(storagePath) {
  if (storagePath?.endsWith('/customer-photo')) return 'customer-photo';
  if (storagePath?.endsWith('/place-photo')) return 'place-photo';
  if (storagePath?.endsWith('/avatar')) return 'avatar';
  return 'unknown';
}

function AuthenticatedStorageImage({ storagePath, legacyUrl, alt, className, fallback }) {
  const [source, setSource] = useState('');
  useEffect(() => {
    let objectUrl = '';
    let active = true;
    getBlob(ref(storage, storagePath)).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setSource(objectUrl);
    }).catch((reason) => {
      console.error('Managed image read failed', JSON.stringify({
        errorCode: safeDiagnosticText(reason?.code, 'unknown'),
        errorMessage: safeDiagnosticText(reason?.message, 'unknown error'),
        hasLegacyFallback: Boolean(legacyUrl),
        slot: managedSlot(storagePath),
      }));
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
