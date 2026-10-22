import { useState, useEffect, useRef } from "react";
import { assetManager } from "../utils/gltfLoader";

export function useGLTFModel(url, options = {}) {
  const [model, setModel] = useState(() => {
    if (assetManager.cache.has(url)) {
      return assetManager.cache.get(url);
    }
    if (options.initialProxy !== false) {
      return assetManager.createProxyPlaceholder(url);
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(!assetManager.cache.has(url));
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (assetManager.cache.has(url)) {
      setModel(assetManager.cache.get(url));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    assetManager
      .load(url, options)
      .then((loadedModel) => {
        if (isMountedRef.current) {
          setModel(loadedModel);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMountedRef.current) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      isMountedRef.current = false;
    };
  }, [url]);

  return {
    model,
    isLoading,
    isFallbackProxy: model?.isFallbackProxy || false,
    error,
    instance: () => assetManager.instance(url),
  };
}
