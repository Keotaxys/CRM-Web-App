import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation(); // ໃຊ້ເພື່ອເຊັກວ່າຕອນນີ້ຢູ່ໜ້າໃດ

    // ຟັງຊັນສຳລັບເຊັກວ່າປຸ່ມໃດຄວນເປັນປຸ່ມທີ່ຖືກກົດ (Active)
    const isActive = (path) => location.pathname === path;

    return (
        <nav className="fixed bottom-0 w-full flex justify-around items-end px-4 pb-4 pt-2 bg-white/90 backdrop-blur-md rounded-t-2xl z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] border-t border-gray-100">

            {/* ປຸ່ມໜ້າຫຼັກ (Dashboard) */}
            <button
                onClick={() => navigate('/')}
                className={`flex flex-col items-center justify-center transition-all ${isActive('/')
                        ? 'bg-teal-600 text-white rounded-full p-3 mb-2 transform -translate-y-2 shadow-md shadow-teal-600/30'
                        : 'text-gray-400 p-2 hover:text-teal-600'
                    }`}
            >
                <span className="material-symbols-outlined">dashboard</span>
                {!isActive('/') && <span className="text-[10px] font-bold mt-1">ໜ້າຫຼັກ</span>}
            </button>

            {/* ປຸ່ມໂປຣໄຟລ໌ພະນັກງານ */}
            <button
                onClick={() => navigate('/profile')}
                className={`flex flex-col items-center justify-center transition-all ${isActive('/profile')
                        ? 'bg-teal-600 text-white rounded-full p-3 mb-2 transform -translate-y-2 shadow-md shadow-teal-600/30'
                        : 'text-gray-400 p-2 hover:text-teal-600'
                    }`}
            >
                <span className="material-symbols-outlined">account_circle</span>
                {!isActive('/profile') && <span className="text-[10px] font-bold mt-1">ໂປຣໄຟລ໌</span>}
            </button>

        </nav>
    );
}