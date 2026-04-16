import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';

import Navbar from '../components/Navbar';
import CustomerCard from '../components/CustomerCard';
import BottomNav from '../components/BottomNav';

// 📍 ຢ່າລືມເອົາ Webhook URL ມາວາງໃສ່ນີ້ເດີ້:
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwr9b0hJCC9_xRmNlanr115DClXJcAWHNnOlZg1cYwwVNlxJNHj1O2KYxZEZik3BpsFMQ/exec";

export default function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [userBranch, setUserBranch] = useState('');
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ທັງໝົດ');
    const [filterPriority, setFilterPriority] = useState('ທັງໝົດ');
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                setUserBranch(userDoc.exists() && userDoc.data().branch ? userDoc.data().branch : 'ບໍ່ລະບຸສາຂາ');
            } else {
                setUserBranch('');
            }
        });

        const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
        const unsubscribeData = onSnapshot(q, (snapshot) => {
            setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => { unsubscribeAuth(); unsubscribeData(); };
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("ທ່ານຕ້ອງການລຶບຂໍ້ມູນລູກຄ້ານີ້ແທ້ບໍ່?")) {
            await deleteDoc(doc(db, 'customers', id));
            if (selectedCustomer?.id === id) setSelectedCustomer(null);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        await updateDoc(doc(db, 'customers', id), {
            status: newStatus,
            [`statusTimestamps.${newStatus}`]: serverTimestamp()
        });

        if (selectedCustomer?.id === id) {
            setSelectedCustomer(prev => ({
                ...prev, status: newStatus, statusTimestamps: { ...prev.statusTimestamps, [newStatus]: new Date() }
            }));
        }

        const cust = customers.find(c => c.id === id);
        if (cust) {
            const dateObj = cust.createdAt?.toDate ? cust.createdAt.toDate() : new Date();
            const createdAtText = dateObj.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            try {
                await fetch(WEBHOOK_URL, {
                    method: 'POST', mode: 'no-cors',
                    body: JSON.stringify({
                        id: id,
                        name: cust.name,
                        phone: cust.phone,
                        address: cust.address,
                        priority: cust.priority || 'ທົ່ວໄປ',
                        status: newStatus,
                        branch: cust.branch,
                        note: cust.note,
                        createdAt: createdAtText
                    })
                });
            } catch (error) {
                console.error("ອັບເດດສະຖານະລົງ Sheet ບໍ່ສຳເລັດ:", error);
            }
        }
    };

    const formatTime = (ts) => {
        if (!ts) return '';
        return (ts.toDate ? ts.toDate() : new Date(ts)).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // 📍 ຈຸດທີ່ແກ້ໄຂ: ເພີ່ມລະບົບກັ່ນຕອງໃຫ້ເຫັນສະເພາະສາຂາຕົວເອງ
    const filteredCustomers = customers.filter(c => {
        const matchStatus = filterStatus === 'ທັງໝົດ' || c.status === filterStatus;
        const matchPriority = filterPriority === 'ທັງໝົດ' || (c.priority || 'ທົ່ວໄປ') === filterPriority;
        const searchLower = searchTerm.toLowerCase();
        const matchSearch = (c.name?.toLowerCase().includes(searchLower)) || (c.phone?.includes(searchLower)) || (c.address?.toLowerCase().includes(searchLower)) || (c.note?.toLowerCase().includes(searchLower));

        // ຖ້າເປັນ 'Admin' ຈະເຫັນທັງໝົດ (ປ່ຽນຊື່ 'Admin' ເປັນຊື່ສາຂາສຳນັກງານໃຫຍ່ຂອງເຈົ້າໄດ້)
        // ແຕ່ຖ້າເປັນສາຂາທົ່ວໄປ ຈະເຫັນສະເພາະລູກຄ້າທີ່ກົງກັບສາຂາຂອງຕົນເອງ
        const matchBranch = userBranch === 'Admin' || c.branch === userBranch;

        return matchStatus && matchPriority && matchSearch && matchBranch;
    });

    return (
        <div className="min-h-screen pb-32 text-slate-800 bg-[#f6faf9] font-sans">
            <Navbar title="ລາຍຊື່ລູກຄ້າ CRM" user={user} userBranch={userBranch} />

            <div className="px-6 mt-6">
                <div className="relative shadow-sm rounded-xl">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined">search</span>
                    <input type="text" placeholder="ຄົ້ນຫາຊື່, ເບີໂທ, ທີ່ຢູ່, ໝາຍເຫດ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-gray-100 rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
            </div>

            <div className="px-6 mt-4 flex flex-col gap-2">
                <div className="overflow-x-auto hide-scrollbar flex gap-2 items-center">
                    <span className="text-[10px] font-bold text-gray-400 mr-1">ສະຖານະ:</span>
                    {['ທັງໝົດ', 'ໃໝ່', 'ຕິດຕາມຕໍ່', 'ດຳເນີນການແລ້ວ', 'ຈັດສົ່ງແລ້ວ'].map(status => (
                        <button key={status} onClick={() => setFilterStatus(status)} className={`px-4 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all ${filterStatus === status ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-teal-50'}`}>{status}</button>
                    ))}
                </div>
                <div className="overflow-x-auto hide-scrollbar flex gap-2 items-center pb-2">
                    <span className="text-[10px] font-bold text-gray-400 mr-1">ສຳຄັນ:</span>
                    {['ທັງໝົດ', 'ທົ່ວໄປ', 'ດ່ວນ', 'VIP'].map(prio => (
                        <button key={prio} onClick={() => setFilterPriority(prio)} className={`px-4 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all ${filterPriority === prio ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-teal-50'}`}>{prio}</button>
                    ))}
                </div>
            </div>

            <main className="px-6 mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {loading && <p className="col-span-full text-center text-gray-400 text-sm py-10">ກຳລັງໂຫຼດຂໍ້ມູນ...</p>}
                {!loading && filteredCustomers.length === 0 && <p className="col-span-full text-center text-gray-400 text-sm py-10">ບໍ່ພົບຂໍ້ມູນລູກຄ້າຂອງສາຂາທ່ານ...</p>}
                {filteredCustomers.map((customer) => (
                    <CustomerCard key={customer.id} customer={customer} user={user} onStatusChange={handleStatusChange} onDelete={handleDelete} onClickDetail={setSelectedCustomer} />
                ))}
            </main>

            {selectedCustomer && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex justify-center items-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in-up">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-[#f6faf9]">
                            <h3 className="font-bold text-lg text-teal-800 flex items-center gap-2"><span className="material-symbols-outlined text-teal-600">contact_page</span>ຂໍ້ມູນລູກຄ້າ</h3>
                            <button onClick={() => setSelectedCustomer(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 active:scale-90 transition-transform"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        <div className="p-6 overflow-y-auto flex flex-col gap-5">
                            <div className="relative mb-4">
                                {selectedCustomer.placeImageUrl ? (
                                    <div className="w-full h-40 rounded-2xl overflow-hidden bg-gray-100 shadow-inner"><img src={selectedCustomer.placeImageUrl} alt="Place" className="w-full h-full object-cover" /></div>
                                ) : <div className="w-full h-24 rounded-2xl bg-teal-50 flex items-center justify-center border border-teal-100"><span className="text-teal-400 text-xs font-bold">ບໍ່ມີຮູບສະຖານທີ່</span></div>}
                                <div className="absolute -bottom-6 left-4 w-16 h-16 rounded-2xl bg-white p-1 shadow-md">
                                    <div className="w-full h-full rounded-xl overflow-hidden bg-gray-200"><img src={selectedCustomer.imageUrl || `https://ui-avatars.com/api/?name=${selectedCustomer.name}&background=008080&color=fff`} alt="Profile" className="w-full h-full object-cover" /></div>
                                </div>
                            </div>

                            <div className="mt-2">
                                <h2 className="text-2xl font-extrabold text-slate-800">{selectedCustomer.name}</h2>
                                <div className="flex items-center gap-2 text-gray-500 mt-1">
                                    <span className="material-symbols-outlined text-[18px]">call</span><p className="text-sm">{selectedCustomer.phone}</p>
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 w-full"></div>

                            <div className="flex flex-col gap-3 text-sm">
                                <div className="flex gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <span className="material-symbols-outlined text-orange-500">stars</span>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 font-bold">ລະດັບຄວາມສຳຄັນ</span>
                                        <span className="text-slate-700 font-bold">{selectedCustomer.priority || 'ທົ່ວໄປ'}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3 bg-teal-50/50 p-3 rounded-xl border border-teal-50">
                                    <span className="material-symbols-outlined text-teal-600">history</span>
                                    <div className="flex flex-col w-full gap-1.5">
                                        <span className="text-xs text-teal-700 font-bold mb-1">ປະຫວັດການປ່ຽນສະຖານະ</span>
                                        {['ໃໝ່', 'ຕິດຕາມຕໍ່', 'ດຳເນີນການແລ້ວ', 'ຈັດສົ່ງແລ້ວ'].map(st => {
                                            const time = selectedCustomer.statusTimestamps?.[st];
                                            if (!time) return null;
                                            return (
                                                <div key={st} className="flex justify-between items-center border-b border-teal-100/50 pb-1 last:border-0 last:pb-0">
                                                    <span className="text-xs text-slate-700 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>{st}</span>
                                                    <span className="text-[10px] text-teal-600 font-medium">{formatTime(time)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-2"><span className="material-symbols-outlined text-gray-400">home_work</span><div className="flex flex-col"><span className="text-xs text-gray-400 font-bold">ທີ່ຢູ່</span><span className="text-slate-700">{selectedCustomer.address || '-'}</span></div></div>

                                <div className="flex gap-3">
                                    <span className="material-symbols-outlined text-gray-400">location_on</span>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 font-bold">ພິກັດ GPS</span>
                                        {selectedCustomer.gps ? (
                                            <a href={`https://maps.google.com/?q=${selectedCustomer.gps}`} target="_blank" rel="noreferrer" className="text-teal-600 underline font-medium">
                                                {selectedCustomer.gps}
                                            </a>
                                        ) : (
                                            <span className="text-slate-700">-</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-3"><span className="material-symbols-outlined text-gray-400">store</span><div className="flex flex-col"><span className="text-xs text-gray-400 font-bold">ສາຂາທີ່ຮັບຜິດຊອບ</span><span className="text-slate-700">{selectedCustomer.branch}</span></div></div>
                                <div className="flex gap-3"><span className="material-symbols-outlined text-gray-400">note_alt</span><div className="flex flex-col w-full"><span className="text-xs text-gray-400 font-bold">ໝາຍເຫດ</span><span className="text-slate-700 bg-gray-50 p-2 rounded-lg mt-1 whitespace-pre-wrap">{selectedCustomer.note || 'ບໍ່ມີໝາຍເຫດ'}</span></div></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {user && (
                <button
                    onClick={() => {
                        if (!userBranch || userBranch === 'ບໍ່ລະບຸສາຂາ') {
                            alert("ກະລຸນາປ້ອນຂໍ້ມູນໂປຣໄຟລ໌ຂອງທ່ານໃຫ້ຄົບຖ້ວນ (ເຊັ່ນ: ສາຂາ) ກ່ອນເພີ່ມລູກຄ້າໃໝ່!");
                            navigate('/profile');
                        } else {
                            navigate('/add');
                        }
                    }}
                    className="fixed bottom-24 right-6 w-14 h-14 bg-teal-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform z-40"
                >
                    <span className="material-symbols-outlined text-3xl">add</span>
                </button>
            )}

            <BottomNav />
        </div>
    );
}