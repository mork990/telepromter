import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const GCS_PREFIX = 'https://storage.googleapis.com/';
const cache = {};

export default function useSignedUrl(fileUrl) {
  const [signedUrl, setSignedUrl] = useState(null);

  useEffect(() => {
    if (!fileUrl) {
      setSignedUrl(null);
      return;
    }

    // Not a GCS URL - use as-is
    if (!fileUrl.startsWith(GCS_PREFIX)) {
      setSignedUrl(fileUrl);
      return;
    }

    // Check cache (valid for 50 min)
    const cached = cache[fileUrl];
    if (cached && Date.now() - cached.time < 50 * 60 * 1000) {
      setSignedUrl(cached.url);
      return;
    }

    let cancelled = false;
    base44.functions.invoke('getSignedGcsUrl', { file_url: fileUrl })
      .then(res => {
        if (!cancelled && res.data?.signed_url) {
          cache[fileUrl] = { url: res.data.signed_url, time: Date.now() };
          setSignedUrl(res.data.signed_url);
        }
      })
      .catch(() => {
        if (!cancelled) setSignedUrl(fileUrl);
      });

    return () => { cancelled = true; };
  }, [fileUrl]);

  return signedUrl;
}