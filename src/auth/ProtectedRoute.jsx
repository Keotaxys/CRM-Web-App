import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { routeForAuthState } from './routePolicy';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { state, claims, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="page-state">ກຳລັງກວດສອບບັນຊີ...</div>;
  const destination = routeForAuthState(state, adminOnly, claims);
  return destination ? <Navigate to={destination} replace state={{ from: location.pathname }} /> : children;
}
