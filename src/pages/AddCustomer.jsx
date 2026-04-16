import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase/config';
import imageCompression from 'browser-image-compression'; // 📍 ເພີ່ມຕົວບີບອັດຮູບ

// 📍 Webhook URL ຂອງເຈົ້າ (ຮັກສາໄວ້ຄືເກົ່າ)
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwr9b0hJCC9xRmNlanr115DClXJcAWHNnOlZg1cYwwVNlxJNHj1O2KYxZEZik3BpsFMQ/exec";

export default function AddCustomer() {
    const navigate = useNavigate();
    const customerPhotoRef = useRef(null);
    const placePhotoRef = useRef(null);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [status, setStatus] = useState('ໃໝ່');
    const [priority, setPriority] = useState('ທົ່ວໄປ');
    const [note, setNote] = useState('');
    const [gps, setGps] = useState('');

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [placeImageFile, setPlaceImageFile] = useState(null);
    const [placeImagePreview, setPlaceImagePreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 📍 ປ່ຽນຟັງຊັນດຶງພິກັດ ໃຫ້ເປັນການເປີດ Google Maps ແທນ
    const handleOpenMaps = () => {
        // ເປີດ Google Maps ໃນແທັບໃໝ່
        window.open('https://maps.google.com/', '_blank');
        alert('ກະລຸນາຄົ້ນຫາ ຫຼື ປັກໝຸດສະຖານທີ່ໃນແຜນທີ່ ແລ້ວກັອບປີ້ "ລິ້ງ (URL)" ມາວາງໃສ່ຊ່ອງພິກັດເດີ້ເຈົ້າ.');
    };

    const handleSaveCustomer = async (e) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        setIsSubmitting(true);

        try {
            let userBranch = "ບໍ່ລະບຸສາຂາ";
            const userDocSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (userDocSnap.exists() && userDocSnap.data().branch) userBranch = userDocSnap.data().branch;

            let imageUrl = "", placeImageUrl = "";

            // 📍 ຕັ້ງຄ່າການບີບອັດ (ໃຫ້ນ້ອຍກວ່າ 500KB ແລະ ປັບຂະໜາດລົງ)
            const compressOptions = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1280,
                useWebWorker: true
            };

            if (imageFile) {
                const compressedImage = await imageCompression(imageFile, compressOptions); // ບີບອັດ
                const imageRef = ref(storage, `customers/${Date.now()}_profile_${compressedImage.name}`);
                imageUrl = await getDownloadURL((await uploadBytes(imageRef, compressedImage)).ref);
            }
            if (placeImageFile) {
                const compressedPlace = await imageCompression(placeImageFile, compressOptions); // ບີບອັດ
                const placeRef = ref(storage, `places/${Date.now()}_place_${compressedPlace.name}`);
                placeImageUrl = await getDownloadURL((await uploadBytes(placeRef, compressedPlace)).ref);
            }

            const docRef = await addDoc(collection(db, 'customers'), {
                name, phone, address, status, priority, branch: userBranch, note, gps, imageUrl, placeImageUrl,
                statusTimestamps: { [status]: serverTimestamp() },
                createdBy: auth.currentUser.email,
                createdAt: serverTimestamp()
            });

            const createdAtText = new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            await fetch(WEBHOOK_URL, {
                method: 'POST', mode: 'no-cors',
                body: JSON.stringify({
                    id: docRef.id, name, phone, address, priority, status, branch: userBranch, note, createdAt: createdAtText
                })
            });

            alert('ບັນທຶກຂໍ້ມູນລູກຄ້າສຳເລັດແລ້ວ!');
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
                <button onClick={() => navigate('/')} className="w-10 h-10 flex justify-center items-center rounded-full bg-white border border-gray-200 active:scale-90"><span className="material-symbols-outlined">arrow_back</span></button>
                <h1 className="text-teal-800 font-bold text-lg">ເພີ່ມລູກຄ້າໃໝ່</h1>
                <div className="w-10 h-10"></div>
            </header>

            <main className="px-6 mt-6 flex flex-col gap-6">
                <div onClick={() => customerPhotoRef.current.click()} className="w-full bg-white border-2 border-dashed border-teal-200 rounded-3xl p-4 flex flex-col items-center justify-center text-teal-600 cursor-pointer active:bg-teal-50 min-h-[140px] relative overflow-hidden">
                    {imagePreview ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover absolute inset-0" /> : (
                        <><div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mb-2"><span className="material-symbols-outlined text-2xl">add_a_photo</span></div><span className="font-bold text-sm">ຮູບໃບໜ້າລູກຄ້າ (ຖ້າມີ)</span></>
                    )}
                    <input type="file" accept="image/png, image/jpeg, image/jpg, image/webp" ref={customerPhotoRef} onChange={(e) => { setImageFile(e.target.files[0]); setImagePreview(URL.createObjectURL(e.target.files[0])); }} className="hidden" />
                </div>

                <form onSubmit={handleSaveCustomer} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 ml-1">ລະດັບຄວາມສຳຄັນ</label>
                        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-teal-500">
                            <option value="ທົ່ວໄປ">ທົ່ວໄປ (ປົກກະຕິ)</option>
                            <option value="ດ່ວນ">ດ່ວນ (ຮີບດຳເນີນການ)</option>
                            <option value="VIP">VIP (ລູກຄ້າສຳຄັນພິເສດ)</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2"><label className="text-xs font-bold text-gray-500 ml-1">ຊື່ ແລະ ນາມສະກຸນ</label><input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                    <div className="flex flex-col gap-2"><label className="text-xs font-bold text-gray-500 ml-1">ເບີໂທລະສັບ</label><input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                    <div className="flex flex-col gap-2"><label className="text-xs font-bold text-gray-500 ml-1">ທີ່ຢູ່ປັດຈຸບັນ</label><textarea rows="2" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none resize-none"></textarea></div>

                    {/* 📍 ສ່ວນທີ່ແກ້ໄຂ: ຊ່ອງປ້ອນລິ້ງແຜນທີ່ Google Maps */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 ml-1">ລິ້ງແຜນທີ່ (Google Maps)</label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                value={gps}
                                onChange={(e) => setGps(e.target.value)}
                                placeholder="ວາງລິ້ງ Google Maps ໃສ່ນີ້..."
                                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <button
                                type="button"
                                onClick={handleOpenMaps}
                                className="bg-blue-50 text-blue-600 px-4 rounded-xl flex items-center justify-center border border-blue-100 hover:bg-blue-100 active:scale-95 transition-all"
                                title="ເປີດແຜນທີ່ເພື່ອປັກໝຸດ"
                            >
                                <span className="material-symbols-outlined">map</span>
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 ml-1">ກົດປຸ່ມແຜນທີ່ເພື່ອປັກໝຸດ ແລ້ວກັອບປີ້ລິ້ງມາວາງໃສ່ຊ່ອງນີ້</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 ml-1">ຮູບສະຖານທີ່ / ເຮືອນ</label>
                        <div onClick={() => placePhotoRef.current.click()} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-center text-gray-500 cursor-pointer min-h-[100px] relative overflow-hidden">
                            {placeImagePreview ? <img src={placeImagePreview} alt="Place" className="w-full h-full object-cover absolute inset-0" /> : <div className="flex flex-col items-center gap-1"><span className="material-symbols-outlined text-gray-400 text-2xl">storefront</span><span className="text-xs font-medium">ແຕະເພື່ອຖ່າຍຮູບ ຫຼື ເລືອກຮູບ</span></div>}
                            <input type="file" accept="image/png, image/jpeg, image/jpg, image/webp" ref={placePhotoRef} onChange={(e) => { setPlaceImageFile(e.target.files[0]); setPlaceImagePreview(URL.createObjectURL(e.target.files[0])); }} className="hidden" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2"><label className="text-xs font-bold text-gray-500 ml-1">ໝາຍເຫດເພີ່ມເຕີມ</label><textarea rows="3" value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none resize-none"></textarea></div>

                    <button type="submit" disabled={isSubmitting} className={`mt-4 w-full text-white font-bold text-base rounded-xl py-4 shadow-lg flex justify-center items-center gap-2 ${isSubmitting ? 'bg-gray-400' : 'bg-teal-600'}`}>
                        <span className="material-symbols-outlined">{isSubmitting ? 'hourglass_empty' : 'save'}</span>
                        {isSubmitting ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກຂໍ້ມູນລູກຄ້າ'}
                    </button>
                </form>
            </main>
        </div>
    );
}