import { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router';

const PrivateRoute: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    if (!token) {
      navigate('/signin', { replace: true });
    }
  }, [token, navigate]);

  return token ? <Outlet /> : null;
};

export default PrivateRoute;
