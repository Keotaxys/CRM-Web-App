import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase/config';

export default function Profile() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [name, setName] = useState('');
    const [staffId, setStaffId] = useState('');
    const [phone, setPhone] = useState('');
    // 📍 ຕັ້ງຄ່າເລີ່ມຕົ້ນເປັນສຳນັກງານໃຫຍ່
    const [branch, setBranch] = useState('010 - ສຳນັກງານໃຫຍ່');

    const [imageFile, setImageFile] = useState(null);
    const [imageUrl, setImageUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 📍 ອັບເດດລາຍຊື່ສາຂາໃໝ່ທັງໝົດ ຕາມຮູບທີ່ໃຫ້ມາ
    const bcelBranches = [
        "010 - ສຳນັກງານໃຫຍ່",
        "019 - ສາຂາ ໂພນໂຮງ",
        "020 - ສາຂາ ຄຳມ່ວນ",
        "030 - ສາຂາ ສະຫວັນນະເຂດ",
        "040 - ສາຂາ ຈຳປາສັກ",
        "050 - ສາຂາ ຫຼວງພະບາງ",
        "060 - ສາຂາ ອຸດົມໄຊ",
        "070 - ສາຂາ ຫຼວງນ້ຳທາ",
        "080 - ສາຂາ ອັດຕະປື",
        "090 - ສາຂາ ນະຄອນຫຼວງ",
        "110 - ສາຂາ ບໍ່ແກ້ວ",
        "120 - ສາຂາ ໄຊຍະບູລີ",
        "130 - ສາຂາ ຊຽງຂວາງ",
        "140 - ສາຂາ ວັງວຽງ",
        "150 - ສາຂາ ບໍລິຄຳໄຊ",
        "160 - ສາຂາ ດົງໂດກ",
        "170 - ສາຂາ ຫົວພັນ",
        "180 - ສາຂາ ຜົ້ງສາລີ",
        "190 - ສາຂາ ເຊກອງ",
        "200 - ສາຂາ ສາລະວັນ",
        "210 - ສາຂາ ໄຊສົມບູນ",
        "220 - ສາຂາ ໄຊເສດຖາ"
    ];

    useEffect(() => {
        const fetchProfile = async () => {
            if (auth.currentUser) {
                const docRef = doc(db, 'users', auth.currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setName(data.name || '');
                    setStaffId(data.staffId || '');
                    setPhone(data.phone || '');
                    // ຖ້າມີຂໍ້ມູນເກົ່າໃຫ້ດຶງມາ, ຖ້າບໍ່ມີໃຫ້ເລີ່ມທີ່ 010
                    setBranch(data.branch || '010 - ສຳນັກງານໃຫຍ່');
                    setImageUrl(data.photoURL || '');
                }
            }
        };
        fetchProfile();
    }, []);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImageUrl(URL.createObjectURL(file));
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        setIsSubmitting(true);

        try {
            let finalImageUrl = imageUrl;
            if (imageFile) {
                const imageRef = ref(storage, `profiles/${auth.currentUser.uid}`);
                const snapshot = await uploadBytes(imageRef, imageFile);
                finalImageUrl = await getDownloadURL(snapshot.ref);
            }

            await setDoc(doc(db, 'users', auth.currentUser.uid), {
                name, staffId, phone, branch, photoURL: finalImageUrl, email: auth.currentUser.email
            }, { merge: true });

            alert('ບັນທຶກຂໍ້ມູນໂປຣໄຟລ໌ສຳເລັດແລ້ວ!');
            navigate('/');
        } catch (error) {
            alert("ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກຂໍ້ມູນ!");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen pb-8 text-slate-800 bg-[#f6faf9] font-sans">
            <header className="bg-[#f6faf9]/90 backdrop-blur-xl flex justify-between items-center px-4 py-4 w-full sticky top-0 z-50 border-b border-gray-100">
                <button onClick={() => navigate('/')} className="w-10 h-10 flex justify-center items-center rounded-full bg-white border border-gray-200 text-slate-600 active:scale-90 transition-transform"><span className="material-symbols-outlined">arrow_back</span></button>
                <h1 className="text-teal-800 font-bold text-lg">ໂປຣໄຟລ໌ພະນັກງານ</h1>
                <div className="w-10 h-10"></div>
            </header>

            <main className="px-6 mt-6 flex flex-col gap-6">
                <div className="flex flex-col items-center">
                    <div onClick={() => fileInputRef.current.click()} className="w-24 h-24 rounded-full bg-gray-200 border-4 border-white shadow-md overflow-hidden relative cursor-pointer active:scale-95 transition-transform flex items-center justify-center">
                        {imageUrl ? (
                            <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="material-symbols-outlined text-gray-400 text-4xl">person</span>
                        )}
                        <div className="absolute bottom-0 w-full bg-black/40 py-1 flex justify-center">
                            <span className="material-symbols-outlined text-white text-sm">photo_camera</span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 font-bold">ແຕະເພື່ອປ່ຽນຮູບ</p>
                    <input type="file" accept="image/png, image/jpeg, image/jpg, image/webp" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                </div>

                <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 ml-1">ຊື່ ແລະ ນາມສະກຸນ</label>
                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 ml-1">ລະຫັດພະນັກງານ (ປ້າຍຫ້ອຍຄໍ)</label>
                        <input type="text" required value={staffId} onChange={(e) => setStaffId(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 ml-1">ເບີໂທລະສັບ</label>
                        <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>

                    {/* 📍 Dropdown ສາຂາທີ່ອັບເດດໃໝ່ */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 ml-1">ສາຂາທີ່ສັງກັດ</label>
                        <select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-teal-500">
                            {bcelBranches.map((b) => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>

                    <button type="submit" disabled={isSubmitting} className={`mt-4 w-full text-white font-bold rounded-xl py-4 shadow-lg active:scale-[0.98] transition-transform flex justify-center items-center gap-2 ${isSubmitting ? 'bg-gray-400' : 'bg-teal-600 shadow-teal-600/30'}`}>
                        <span className="material-symbols-outlined">{isSubmitting ? 'hourglass_empty' : 'save'}</span>
                        {isSubmitting ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກໂປຣໄຟລ໌'}
                    </button>
                </form>
            </main>
        </div>
    );
}