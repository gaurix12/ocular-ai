import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
    const { register: registerAuth } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm();

    const onSubmit = async (data) => {
        setIsLoading(true);
        setError(null);
        try {
            await registerAuth(data.full_name, data.email, data.password, data.role);
            navigate('/login', { state: { message: 'Clinical registration initiated. Please authenticate.' } });
        } catch (err) {
            setError(err.response?.data?.message || 'Access request failed. Network latency detected.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 blur-[120px] -z-10" />

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
                        <h2 className="text-4xl font-black text-white mb-3 tracking-tight">Access Request</h2>
                        <p className="text-slate-400 text-sm font-medium">Initialize your credentials for clinical screening</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-xs font-bold mb-8 flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Legal Name</label>
                            <input
                                {...register('full_name', { required: 'Identification required' })}
                                className="input-field"
                                placeholder="Dr. Alexander Wright"
                            />
                            {errors.full_name && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors.full_name.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Terminal Email</label>
                            <input
                                {...register('email', {
                                    required: 'Email required',
                                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid protocol format' }
                                })}
                                className="input-field"
                                placeholder="protocol@institution.med"
                            />
                            {errors.email && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Security Keyphrase</label>
                            <input
                                type="password"
                                {...register('password', {
                                    required: 'Minimum 8 characters required',
                                    minLength: { value: 8, message: 'Must be at least 8 characters' }
                                })}
                                className="input-field"
                                placeholder="••••••••"
                            />
                            {errors.password && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors.password.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operational Role</label>
                            <select
                                {...register('role', { required: true })}
                                className="input-field appearance-none"
                            >
                                <option value="patient">General Patient</option>
                                <option value="doctor">Medical Professional</option>
                                <option value="admin">System Administrator</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-clinical btn-clinical-primary w-full py-4 text-sm uppercase tracking-[0.2em]"
                        >
                            {isLoading ? 'Processing Request...' : 'Initialize Access'}
                        </button>
                    </form>

                    <p className="text-center mt-10 text-slate-500 text-xs font-medium">
                        Already authorized?{' '}
                        <Link to="/login" className="text-blue-400 font-bold hover:underline ml-1">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
