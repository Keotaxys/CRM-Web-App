import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CustomerCard({ customer, user, onStatusChange, onDelete, onClickDetail }) {
    const navigate = useNavigate();
    const [showCallMenu, setShowCallMenu] = useState(false);

    const getStatusColor = (status) => {
        if (status === 'ຈັດສົ່ງແລ້ວ') return 'bg-green-100 text-green-800';
        if (status === 'ດຳເນີນການແລ້ວ') return 'bg-teal-100 text-teal-800';
        if (status === 'ຕິດຕາມຕໍ່') return 'bg-orange-100 text-orange-800';
        return 'bg-gray-200 text-gray-700';
    };

    const getPriorityColor = (prio) => {
        if (prio === 'VIP') return 'bg-teal-50 text-teal-700 border-teal-200';
        if (prio === 'ດ່ວນ') return 'bg-orange-50 text-orange-700 border-orange-200';
        return 'bg-gray-50 text-gray-500 border-gray-200';
    };

    const cleanPhone = customer.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
    const waLink = `https://wa.me/856${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}`;

    const WhatsAppIcon = ({ size = 20 }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
        </svg>
    );

    return (
        <div className="bg-white rounded-[24px] flex flex-col shadow-sm border border-gray-100 relative overflow-hidden h-full">

            {/* ຮູບພາບດ້ານເທິງ */}
            <div className="w-full h-36 bg-gray-100 relative cursor-pointer group" onClick={() => onClickDetail(customer)}>
                <img
                    src={customer.imageUrl || customer.placeImageUrl || `https://ui-avatars.com/api/?name=${customer.name}&background=008080&color=fff&size=256`}
                    alt="Profile"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />

                {/* ປຸ່ມ ແກ້ໄຂ/ລຶບ */}
                {user && (
                    <div className="absolute top-2 right-2 flex flex-col gap-2">
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/edit/${customer.id}`); }} className="w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow flex items-center justify-center text-teal-600 hover:bg-teal-50 active:scale-90 transition-all">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(customer.id); }} className="w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow flex items-center justify-center text-orange-500 hover:bg-orange-50 active:scale-90 transition-all">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                )}

                {/* ປຸ່ມແຜນທີ່ */}
                {customer.gps && (
                    <a href={customer.gps} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur shadow flex items-center justify-center text-blue-500 hover:bg-blue-50 active:scale-90 transition-all">
                        <span className="material-symbols-outlined text-[18px]">location_on</span>
                    </a>
                )}
            </div>

            {/* ຂໍ້ມູນລາຍລະອຽດ */}
            <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                <div>
                    <h3 className="font-extrabold text-slate-800 text-[15px] leading-tight flex flex-col gap-1 cursor-pointer" onClick={() => onClickDetail(customer)}>
                        <span className="truncate w-full">{customer.name}</span>
                        {customer.priority && customer.priority !== 'ທົ່ວໄປ' && (
                            <span className={`self-start px-2 py-0.5 rounded text-[9px] border ${getPriorityColor(customer.priority)}`}>{customer.priority}</span>
                        )}
                    </h3>

                    <div className="flex items-center gap-1.5 mt-2 text-gray-500">
                        <span className="material-symbols-outlined text-[16px]">call</span>
                        <p className="text-xs font-bold">{customer.phone}</p>
                    </div>
                </div>

                {/* ສະຖານະ ແລະ ປຸ່ມໄອຄອນວົງມົນ */}
                <div className="flex items-center justify-between gap-2 mt-auto">
                    <div className="flex-1">
                        {user ? (
                            <select value={customer.status} onChange={(e) => onStatusChange(customer.id, e.target.value)} className={`w-full px-2 py-2 rounded-xl text-[11px] font-bold outline-none cursor-pointer text-center truncate ${getStatusColor(customer.status)}`}>
                                <option value="ໃໝ່">ໃໝ່</option>
                                <option value="ຕິດຕາມຕໍ່">ຕິດຕາມຕໍ່</option>
                                <option value="ດຳເນີນການແລ້ວ">ດຳເນີນການແລ້ວ</option>
                                <option value="ຈັດສົ່ງແລ້ວ">ຈັດສົ່ງແລ້ວ</option>
                            </select>
                        ) : (
                            <span className={`block w-full text-center px-2 py-2 rounded-xl text-[11px] font-bold ${getStatusColor(customer.status)}`}>{customer.status}</span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 relative">
                        <a href={waLink} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-[#E8FADF] flex items-center justify-center text-[#25D366] active:bg-[#25D366] active:text-white transition-colors shadow-sm">
                            <WhatsAppIcon size={18} />
                        </a>

                        <button onClick={() => setShowCallMenu(!showCallMenu)} className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 active:bg-teal-600 active:text-white transition-colors shadow-sm">
                            <span className="material-symbols-outlined text-[18px]">call</span>
                        </button>

                        {showCallMenu && (
                            <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-100 shadow-xl rounded-xl p-2 flex flex-col gap-1 w-44 z-20 animate-fade-in-up">
                                <a href={`tel:${customer.phone}`} className="flex items-center gap-3 p-2 hover:bg-teal-50 rounded-lg text-xs text-slate-700 font-bold">
                                    <span className="material-symbols-outlined text-teal-600 text-[18px]">phone_in_talk</span> ໂທເບີປົກກະຕິ
                                </a>
                                <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 hover:bg-[#E8FADF] rounded-lg text-xs text-slate-700 font-bold">
                                    <span className="text-[#25D366]"><WhatsAppIcon size={16} /></span> ໂທຜ່ານ WhatsApp
                                </a>
                            </div>
                        )}
                    </div>
                </div>

            </div>
            {showCallMenu && <div className="fixed inset-0 z-10" onClick={() => setShowCallMenu(false)}></div>}
        </div>
    );
}