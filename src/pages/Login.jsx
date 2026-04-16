import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false); // 📍 ຕົວສະລັບໜ້າ (Login / Register)
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // ຟັງຊັນສຳລັບ Email / Password
    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isRegistering) {
                // ລົງທະບຽນໃໝ່
                await createUserWithEmailAndPassword(auth, email, password);
                alert('ລົງທະບຽນສຳເລັດແລ້ວ! ກະລຸນາຕື່ມຂໍ້ມູນໂປຣໄຟລ໌ຂອງທ່ານ.');
                navigate('/profile'); // ສົ່ງໄປໜ້າໂປຣໄຟລ໌ເພື່ອບັງຄັບໃຫ້ເລືອກສາຂາ
            } else {
                // ເຂົ້າສູ່ລະບົບ
                await signInWithEmailAndPassword(auth, email, password);
                navigate('/');
            }
        } catch (err) {
            setError(isRegistering ? 'ບໍ່ສາມາດລົງທະບຽນໄດ້ (ອາດຈະມີຜູ້ໃຊ້ອີເມວນີ້ແລ້ວ ຫຼື ລະຫັດຜ່ານສັ້ນເກີນໄປ)' : 'ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // 📍 ຟັງຊັນສຳລັບເຂົ້າສູ່ລະບົບດ້ວຍ Google (Gmail)
    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            // ກວດສອບວ່າເຄີຍຕັ້ງຄ່າສາຂາແລ້ວຫຼືຍັງ
            const userDoc = await getDoc(doc(db, 'users', result.user.uid));
            if (!userDoc.exists() || !userDoc.data().branch) {
                navigate('/profile'); // ຖ້າຫາຕອນເຂົ້າຄັ້ງທຳອິດ ໃຫ້ໄປໜ້າໂປຣໄຟລ໌
            } else {
                navigate('/');
            }
        } catch (err) {
            setError('ເກີດຂໍ້ຜິດພາດໃນການເຊື່ອມຕໍ່ກັບ Google');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-[#f6faf9] p-6 font-sans">
            <div className="bg-white rounded-[32px] shadow-xl shadow-teal-900/5 w-full max-w-md p-8 flex flex-col gap-6 animate-fade-in-up">

                {/* ໂລໂກ້ ຫຼື ໄອຄອນ */}
                <div className="flex flex-col items-center text-center mt-4">
                    <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl">
                            {isRegistering ? 'person_add' : 'lock'}
                        </span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-800">
                        {isRegistering ? 'ລົງທະບຽນພະນັກງານ' : 'ເຂົ້າສູ່ລະບົບ'}
                    </h1>
                    <p className="text-gray-400 text-sm mt-2 font-medium">ລະບົບຕິດຕາມລູກຄ້າ CRM (ສະເພາະພະນັກງານ)</p>
                </div>

                {error && (
                    <div className="bg-orange-50 text-orange-600 text-sm p-3 rounded-xl border border-orange-100 text-center font-bold">
                        {error}
                    </div>
                )}

                <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-1.5">
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ອີເມວພະນັກງານ..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="ລະຫັດຜ່ານ (ຢ່າງໜ້ອຍ 6 ຕົວ)..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`mt-2 w-full text-white font-bold text-base rounded-2xl py-4 shadow-lg active:scale-[0.98] transition-all flex justify-center items-center gap-2 ${loading ? 'bg-gray-400' : 'bg-teal-600 shadow-teal-600/30'}`}
                    >
                        {loading ? 'ກຳລັງປະມວນຜົນ...' : (isRegistering ? 'ສ້າງບັນຊີໃໝ່' : 'ເຂົ້າສູ່ລະບົບ')}
                    </button>
                </form>

                <div className="flex items-center gap-3 my-1">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <span className="text-xs font-bold text-gray-400">ຫຼື</span>
                    <div className="h-px bg-gray-200 flex-1"></div>
                </div>

                {/* 📍 ປຸ່ມ Google Sign In */}
                <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full bg-white text-slate-700 border border-gray-200 font-bold text-sm rounded-2xl py-3.5 active:bg-gray-50 transition-colors flex justify-center items-center gap-3"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    ເຂົ້າສູ່ລະບົບດ້ວຍ Google
                </button>

                {/* ປຸ່ມສະລັບໄປໜ້າລົງທະບຽນ / ເຂົ້າສູ່ລະບົບ */}
                <div className="text-center mt-2">
                    <button
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError('');
                        }}
                        className="text-sm font-bold text-teal-600 hover:text-teal-800 transition-colors"
                    >
                        {isRegistering ? 'ມີບັນຊີຢູ່ແລ້ວ? ກັບໄປເຂົ້າສູ່ລະບົບ' : 'ຍັງບໍ່ມີບັນຊີ? ຄລິກເພື່ອລົງທະບຽນ'}
                    </button>
                </div>

            </div>
        </div>
    );
}