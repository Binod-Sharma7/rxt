/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSiteAssets } from '../services/api';

const SiteAssetsContext = createContext({ assets: {}, loading: true, error: '' });

export const SiteAssetsProvider = ({ children }) => {
  const [assets, setAssets] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSiteAssets()
      .then((response) => {
        const nextAssets = (response.data || []).reduce((result, asset) => {
          result[asset.key] = asset;
          return result;
        }, {});
        setAssets(nextAssets);
        setError('');
      })
      .catch((fetchError) => {
        setAssets({});
        setError(fetchError.message || 'Could not load site media');
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({ assets, loading, error }), [assets, loading, error]);
  return <SiteAssetsContext.Provider value={value}>{children}</SiteAssetsContext.Provider>;
};

export const useSiteAssets = () => useContext(SiteAssetsContext);
