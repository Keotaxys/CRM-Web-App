import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase/config';
import imageCompression from 'browser-image-compression'; // 📍 ເພີ່ມຕົວບີບອັດຮູບ

// 📍 ຢ່າລືມເອົາ Webhook URL ມາວາງໃສ່ນີ້ເດີ້:
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwr9b0hJCC9_xRmNlanr115DClXJcAWHNnOlZg1cYwwVNlxJNHj1O2KYxZEZik3BpsFMQ/exec";

export default function EditCustomer() {
    const { id } = useParams();
    const navigate = useNavigate();
    const customerPhotoRef = useRef(null);
    const placePhotoRef = useRef(null);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [priority, setPriority] = useState('ທົ່ວໄປ');
    const [note, setNote] = useState('');
    const [gps, setGps] = useState('');

    const [status, setStatus] = useState('ໃໝ່');
    const [branch, setBranch] = useState('');
    const [createdAt, setCreatedAt] = useState('');

    const [imagePreview, setImagePreview] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [placeImagePreview, setPlaceImagePreview] = useState('');
    const [placeImageFile, setPlaceImageFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchCustomer = async () => {
            const docSnap = await getDoc(doc(db, 'customers', id));
            if (docSnap.exists()) {
                const data = docSnap.data();
                setName(data.name || '');
                setPhone(data.phone || '');
                setAddress(data.address || '');
                setPriority(data.priority || 'ທົ່ວໄປ');
                setNote(data.note || '');
                setGps(data.gps || '');
                setImagePreview(data.imageUrl || '');
                setPlaceImagePreview(data.placeImageUrl || '');

                setStatus(data.status || 'ໃໝ່');
                setBranch(data.branch || '');
                const dateObj = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
                setCreatedAt(dateObj.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
            }
        };
        fetchCustomer();
    }, [id]);

    const handleGetLocation = () => {
        if (navigator.geolocation) {
            setGps('ກຳລັງຄົ້ນຫາພິກັດ...');
            navigator.geolocation.getCurrentPosition(
                (pos) => setGps(`${pos.coords.latitude}, ${pos.coords.longitude}`),
                () => { alert("ບໍ່ສາມາດດຶງສະຖານທີ່ໄດ້."); setGps(''); }
            );
        } else alert("ອຸປະກອນບໍ່ຮອງຮັບ GPS");
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        setIsSubmitting(true);

        try {
            let newImageUrl = imagePreview;
            let newPlaceImageUrl = placeImagePreview;

            // 📍 ຕັ້ງຄ່າການບີບອັດ
            const compressOptions = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1280,
                useWebWorker: true
            };

            if (imageFile) {
                const compressedImage = await imageCompression(imageFile, compressOptions); // ບີບອັດ
                const imageRef = ref(storage, `customers/${Date.now()}_profile_${compressedImage.name}`);
                newImageUrl = await getDownloadURL((await uploadBytes(imageRef, compressedImage)).ref);
            }
            if (placeImageFile) {
                const compressedPlace = await imageCompression(placeImageFile, compressOptions); // ບີບອັດ
                const placeRef = ref(storage, `places/${Date.now()}_place_${compressedPlace.name}`);
                newPlaceImageUrl = await getDownloadURL((await uploadBytes(placeRef, compressedPlace)).ref);
            }

            await updateDoc(doc(db, 'customers', id), {
                name, phone, address, priority, note, gps, imageUrl: newImageUrl, placeImageUrl: newPlaceImageUrl
            });

            await fetch(WEBHOOK_URL, {
                method: 'POST', mode: 'no-cors',
                body: JSON.stringify({
                    id: id, name: name, phone: phone, address: address, priority: priority, status: status, branch: branch, note: note, createdAt: createdAt
                })
            });

            alert('ແກ້ໄຂຂໍ້ມູນສຳເລັດແລ້ວ!');
            navigate('/');
        } catch (error) {
            alert("ເກີດຂໍ້ຜິດພາດ!");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen pb-8 text-slate-800 bg-[#f6faf9] font-sans">
            <header className="bg-[#f6faf9]/90 backdrop-blur-xl flex justify-between items-center px-4 py-4 w-full sticky top-0 z-50 border-b border-gray-100">
                <button onClick={() => navigate('/')} className="w-10 h-10 flex justify-center items-center rounded-full bg-white border border-gray-200 active:scale-90 transition-transform"><span className="material-symbols-outlined">arrow_back</span></button>
                <h1 className="text-teal-800 font-bold text-lg">ແກ້ໄຂຂໍ້ມູນລູກຄ້າ</h1>
                <div className="w-10 h-10"></div>
            </header>

            <main className="px-6 mt-6 flex flex-col gap-6">
                <div onClick={() => customerPhotoRef.current.click()} className="w-full bg-white border-2 border-dashed border-teal-200 rounded-3xl p-4 flex flex-col items-center justify-center text-teal-600 cursor-pointer active:bg-teal-50 min-h-[140px] relative overflow-hidden">
                    {imagePreview ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover absolute inset-0" /> : (
                        <><div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mb-2"><span className="material-symbols-outlined text-2xl">add_a_photo</span></div><span className="font-bold text-sm">ແຕະເພື່ອປ່ຽນຮູບລູກຄ້າ</span></>
                    )}
                    <input type="file" accept="image/png, image/jpeg, image/jpg, image/webp" ref={customerPhotoRef} onChange={(e) => { setImageFile(e.target.files[0]); setImagePreview(URL.createObjectURL(e.target.files[0])); }} className="hidden" />
                </div>

                <form onSubmit={handleSaveEdit} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 ml-1">ລະດັບຄວາມສຳຄັນ</label>
                        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-teal-500">
                            <option value="ທົ່ວໄປ">ທົ່ວໄປ (ປົກກະຕິ)</option>
                            <option value="ດ່ວນ">ດ່ວນ (ຮີບດຳເນີນການ)</option>
                            <option value="VIP">VIP (ລູກຄ້າສຳຄັນພິເສດ)</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2"><label className="text-xs font-bold text-gray-500 ml-1">ຊື່ ແລະ ນາມສະກຸນ</label><input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div>
                    <div className="flex flex-col gap-2"><label className="text-xs font-bold text-gray-500 ml-1">ເບີໂທລະສັບ</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">call</span><input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" /></div></div>
                    <div className="flex flex-col gap-2"><label className="text-xs font-bold text-gray-500 ml-1">ທີ່ຢູ່ປັດຈຸບັນ</label><textarea rows="2" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"></textarea></div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 ml-1">ພິກັດສະຖານທີ່ (GPS)</label>
                        <div className="flex gap-2">
                            <input type="text" value={gps} onChange={(e) => setGps(e.target.value)} className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none" />
                            <button type="button" onClick={handleGetLocation} className="bg-teal-100 text-teal-700 px-4 rounded-xl flex items-center justify-center active:bg-teal-200"><span className="material-symbols-outlined">my_location</span></button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-500 ml-1">ຮູບສະຖານທີ່ / ເຮືອນ / ກິດຈະການ</label>
                        <div onClick={() => placePhotoRef.current.click()} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-center text-gray-500 cursor-pointer active:bg-gray-100 min-h-[100px] relative overflow-hidden">
                            {placeImagePreview ? <img src={placeImagePreview} alt="Place" className="w-full h-full object-cover absolute inset-0" /> : <div className="flex flex-col items-center gap-1"><span className="material-symbols-outlined text-gray-400 text-2xl">storefront</span><span className="text-xs font-medium">ແຕະເພື່ອປ່ຽນຮູບ ຫຼື ເລືອກຮູບໃໝ່</span></div>}
                            <input type="file" accept="image/png, image/jpeg, image/jpg, image/webp" ref={placePhotoRef} onChange={(e) => { setPlaceImageFile(e.target.files[0]); setPlaceImagePreview(URL.createObjectURL(e.target.files[0])); }} className="hidden" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2"><label className="text-xs font-bold text-gray-500 ml-1">ໝາຍເຫດເພີ່ມເຕີມ</label><textarea rows="3" value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"></textarea></div>

                    <button type="submit" disabled={isSubmitting} className={`mt-4 w-full text-white font-bold text-base rounded-xl py-4 shadow-lg active:scale-[0.98] transition-transform flex justify-center items-center gap-2 ${isSubmitting ? 'bg-gray-400' : 'bg-teal-600 shadow-teal-600/30'}`}>
                        <span className="material-symbols-outlined">{isSubmitting ? 'hourglass_empty' : 'save'}</span>
                        {isSubmitting ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກການແກ້ໄຂ'}
                    </button>
                </form>
            </main>
        </div>
    );
}