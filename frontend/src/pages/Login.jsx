import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm();

    const msg = location.state?.message;

    const onSubmit = async (data) => {
        setIsLoading(true);
        setError(null);
        try {
            await login(data.email, data.password);
            const from = location.state?.from?.pathname || '/upload';
            navigate(from, { replace: true });
        } catch (err) {
            const msg = err.response?.data?.message
                || (err.code === 'ERR_NETWORK' ? 'Cannot reach server. Is the backend running on port 5001?' : err.message)
                || 'Invalid email or password.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] -z-10" />

            <div className="w-full max-w-md">
                {/* Navigation Back */}
                <button
                    onClick={() => navigate('/')}
                    className="group flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-10 font-bold text-xs uppercase tracking-widest"
                >
                    <span className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/5 transition-all">←</span>
                    Return to Portal
                </button>

                <div className="glass-panel p-10 slide-in">
                    <div className="text-center mb-10">
                        <h2 className="text-4xl font-black text-white mb-3 tracking-tight">Welcome Back</h2>
                        <p className="text-slate-400 text-sm font-medium">Authentication required to access clinical nodes in OCULAR AI</p>
                    </div>

                    {msg && (
                        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl text-green-400 text-xs font-bold mb-8 flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            {msg}
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-xs font-bold mb-8 flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Terminal</label>
                            <input
                                id="email-input"
                                {...register('email', { required: 'Email address is required' })}
                                className="input-field"
                                placeholder="name@institution.edu"
                            />
                            {errors.email && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure Credentials</label>
                            <input
                                id="password-input"
                                type="password"
                                {...register('password', { required: 'Credential password is required' })}
                                className="input-field"
                                placeholder="••••••••"
                            />
                            {errors.password && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors.password.message}</p>}
                        </div>

                        <button
                            id="login-submit"
                            type="submit"
                            disabled={isLoading}
                            className="btn-clinical btn-clinical-primary w-full py-4 text-sm uppercase tracking-[0.2em]"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Verifying...
                                </div>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    <p className="text-center mt-10 text-slate-500 text-xs font-medium">
                        New pathology analyst?{' '}
                        <Link to="/register" className="text-blue-400 font-bold hover:underline ml-1">
                            Request Access
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
