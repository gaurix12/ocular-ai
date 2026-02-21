import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Logo from './Logo';

export default function Navbar() {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) =>
        location.pathname === path ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white';

    return (
        <nav className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-2xl bg-slate-950/80">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo Section */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-12 h-12 flex items-center justify-center text-white transition-all duration-300 group-hover:drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]">
                            <Logo className="w-10 h-10" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-black text-xl tracking-tighter leading-none">
                                OCULAR <span className="text-blue-500">AI</span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Clinical Suite</span>
                        </div>
                    </Link>

                    {/* Navigation Items */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link to="/" className={`text-sm tracking-wide transition-all ${isActive('/')}`}>
                            Dashboard
                        </Link>
                        {isAuthenticated && (
                            <>
                                <Link to="/upload" className={`text-sm tracking-wide transition-all ${isActive('/upload')}`}>
                                    Screening
                                </Link>
                                <Link to="/history" className={`text-sm tracking-wide transition-all ${isActive('/history')}`}>
                                    Records
                                </Link>
                            </>
                        )}
                    </div>

                    {/* User Section */}
                    <div className="flex items-center gap-6">
                        {isAuthenticated ? (
                            <div className="flex items-center gap-4">
                                <div className="hidden sm:flex flex-col items-end">
                                    <span className="text-xs font-bold text-white">{user?.full_name}</span>
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">{user?.role}</span>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-white text-sm font-black shadow-inner">
                                    {user?.full_name?.charAt(0)?.toUpperCase()}
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="btn-clinical btn-clinical-secondary py-2 px-4 text-xs"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link to="/login" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
                                    Sign In
                                </Link>
                                <Link to="/register" className="btn-clinical btn-clinical-primary py-2 px-6 text-xs uppercase tracking-widest">
                                    Get Started
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
