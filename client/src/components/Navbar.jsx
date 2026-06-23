import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { logout } = useAuth();
  return (
    <nav style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid #ccc' }}>
      <Link to="/assets">Assets</Link>
      <Link to="/account">Account</Link>
      <button onClick={logout}>Logout</button>
    </nav>
  );
};

export default Navbar;