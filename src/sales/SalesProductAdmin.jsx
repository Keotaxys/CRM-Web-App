import { useEffect, useState } from 'react';
import { subscribeAllSalesProducts, createSalesProduct, updateSalesProduct } from '../services/salesService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ModalSheet from '../components/ui/ModalSheet';

export default function SalesProductAdmin() {
  const [products, setProducts] = useState([]); const [error, setError] = useState(''); const [editing, setEditing] = useState(null); const [confirming, setConfirming] = useState(null); const [values, setValues] = useState({ name: '', sortOrder: 0 });
  useEffect(() => subscribeAllSalesProducts(setProducts, () => setError('ບໍ່ສາມາດໂຫຼດຜະລິດຕະພັນ')), []);
  const openForm = (product = null) => { setEditing(product || {}); setValues({ name: product?.name || '', sortOrder: product?.sortOrder ?? 0 }); setError(''); };
  const save = async (event) => { event.preventDefault(); setError(''); try { if (editing.id) await updateSalesProduct(editing.id, { ...values, sortOrder: Number(values.sortOrder) }); else await createSalesProduct({ ...values, sortOrder: Number(values.sortOrder) }); setEditing(null); } catch (e) { setError(e?.message || 'ບໍ່ສາມາດບັນທຶກຜະລິດຕະພັນ'); } };
  const toggle = async (product) => { try { await updateSalesProduct(product.id, { name: product.name, sortOrder: product.sortOrder, active: !product.active }); setConfirming(null); } catch (e) { setError(e?.message || 'ບໍ່ສາມາດປ່ຽນສະຖານະ'); setConfirming(null); } };
  return <section className="sales-product-admin" aria-label="ຈັດການຜະລິດຕະພັນ"><div className="section-heading"><h2>ລາຍການຜະລິດຕະພັນ</h2><Button onClick={() => openForm()}>ເພີ່ມຜະລິດຕະພັນ</Button></div>{error ? <div role="alert" className="error-banner">{error}</div> : null}<div className="sales-product-list">{products.map((product) => <div className={`sales-product-row ${product.active ? '' : 'is-disabled'}`} key={product.id}><div><strong>{product.name}</strong><span className="sales-product-status">{product.active ? 'ເປີດນຳໃຊ້' : 'ປິດນຳໃຊ້'}</span></div><span>{product.sortOrder}</span><Button variant="neutral" onClick={() => openForm(product)}>ແກ້ໄຂ</Button><Button variant="secondary" onClick={() => product.active ? setConfirming(product) : toggle(product)}>{product.active ? `ປິດນຳໃຊ້ ${product.name}` : `ເປີດນຳໃຊ້ ${product.name}`}</Button></div>)}</div>
    <ModalSheet open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'ແກ້ໄຂຜະລິດຕະພັນ' : 'ເພີ່ມຜະລິດຕະພັນ'}><form className="form-stack" onSubmit={save}><Input id="sales-product-name" label="ຊື່" required value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })}/><Input id="sales-product-sort" label="ລຳດັບ" type="number" required value={values.sortOrder} onChange={(e) => setValues({ ...values, sortOrder: e.target.value })}/><Button type="submit">ບັນທຶກ</Button></form></ModalSheet>
    <ModalSheet open={Boolean(confirming)} onClose={() => setConfirming(null)} title="ຢືນຢັນປິດຜະລິດຕະພັນ"><p>ຕ້ອງການປິດນຳໃຊ້ {confirming?.name} ບໍ?</p><Button onClick={() => toggle(confirming)}>ຢືນຢັນປິດນຳໃຊ້</Button></ModalSheet>
  </section>;
}
