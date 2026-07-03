import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(name, email, password);
      navigate('/assets');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-400 flex items-center justify-center">
            <span className="text-2xl font-bold text-[#0a0e14]">F</span>
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-white text-center mb-8">
          Create your account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-[#151a23] text-white placeholder-gray-500 rounded-lg px-4 py-3 border border-gray-800 focus:outline-none focus:border-emerald-400 transition-colors"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-[#151a23] text-white placeholder-gray-500 rounded-lg px-4 py-3 border border-gray-800 focus:outline-none focus:border-emerald-400 transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-[#151a23] text-white placeholder-gray-500 rounded-lg px-4 py-3 border border-gray-800 focus:outline-none focus:border-emerald-400 transition-colors"
          />
          <button
            type="submit"
            className="w-full bg-emerald-400 hover:bg-emerald-300 text-[#0a0e14] font-semibold rounded-lg py-3 transition-colors"
          >
            Register
          </button>
        </form>

        {error && (
          <p className="text-red-400 text-sm text-center mt-4">{error}</p>
        )}

        <p className="text-gray-500 text-sm text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register