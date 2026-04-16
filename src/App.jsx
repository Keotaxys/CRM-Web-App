import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AddCustomer from './pages/AddCustomer';
import Login from './pages/Login';
import EditCustomer from './pages/EditCustomer'; // 📍 Import ໜ້າແກ້ໄຂ
import Profile from './pages/Profile'; // 📍 Import ໜ້າ Profile  

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/add" element={<AddCustomer />} />
        <Route path="/login" element={<Login />} />
        <Route path="/edit/:id" element={<EditCustomer />} /> {/* 📍 ເພີ່ມເສັ້ນທາງນີ້ */}
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}