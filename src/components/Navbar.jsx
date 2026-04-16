import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';

export default function Navbar({ title, showBack = false, user = null, userBranch = "" }) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    return (
        <header className="bg-[#f6faf9]/90 backdrop-blur-xl flex justify-between items-center px-6 py-4 w-full sticky top-0 z-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
                {showBack ? (
                    <button onClick={() => navigate(-1)} className="w-10 h-10 flex justify-center items-center rounded-full bg-white border border-gray-200 text-slate-600 active:scale-90 transition-transform">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                ) : (
                    <span className="material-symbols-outlined text-teal-600 text-2xl">menu</span>
                )}
                <h1 className="text-teal-800 font-bold text-lg">{title}</h1>
            </div>

            {!showBack && (
                user ? (
                    <div className="flex items-center gap-2">
                        {/* ສະແດງສາຂາຂອງພະນັກງານ */}
                        {userBranch && (
                            <span className="bg-teal-50 text-teal-700 px-2 py-1 rounded-md text-[10px] font-bold border border-teal-100 max-w-[100px] truncate">
                                {userBranch}
                            </span>
                        )}
                        <button onClick={handleLogout} className="bg-white text-orange-600 px-3 py-1.5 rounded-full text-xs font-bold border border-orange-200 active:scale-95 transition-all">ອອກລະບົບ</button>
                    </div>
                ) : (
                    <button onClick={() => navigate('/login')} className="bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full text-xs font-bold border border-teal-100 active:scale-95 transition-all">ເຂົ້າສູ່ລະບົບ</button>
                )
            )}
        </header>
    );
}