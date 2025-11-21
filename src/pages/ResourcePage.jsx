import { useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';

import ResourceManager from '../components/resource/ResourceManager';
import { resourceMap } from '../constants/resourceConfig';

const ResourcePage = () => {
  const { resourceKey } = useParams();
  const resource = useMemo(() => resourceMap[resourceKey], [resourceKey]);

  if (!resource) {
    return <Navigate to="/" replace />;
  }

  return <ResourceManager resource={resource} />;
};

export default ResourcePage;
