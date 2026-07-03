import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { logout } = useAuth();
  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-[#0f141b] border-b border-gray-800">
      <div className="flex items-center gap-8">
        <div className="w-9 h-9 rounded-lg bg-emerald-400 flex items-center justify-center">
          <span className="text-sm font-bold text-[#0a0e14]">F</span>
        </div>
        <div className="flex gap-6">
          <Link to="/assets" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
            Assets
          </Link>
          <Link to="/account" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
            Account
          </Link>
        </div>
      </div>
      <button
        onClick={logout}
        className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
      >
        Logout
      </button>
    </nav>
  );
};

export default Navbar;