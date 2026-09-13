import { useEffect, useState } from 'react';
import { subscribeAllSalesProducts, createSalesProduct, updateSalesProduct } from '../services/salesService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ModalSheet from '../components/ui/ModalSheet';

function catalogError(error) {
  const code = error?.code?.replace('functions/', '');
  if (code === 'already-exists') return 'ຊື່ຜະລິດຕະພັນນີ້ມີແລ້ວ ກະລຸນາໃຊ້ຊື່ອື່ນ';
  if (code === 'invalid-argument') return 'ກະລຸນາກວດຊື່ ແລະລຳດັບໃຫ້ຖືກຕ້ອງ';
  if (code === 'permission-denied') return 'ທ່ານບໍ່ມີສິດຈັດການຜະລິດຕະພັນ';
  if (code === 'unauthenticated') return 'ກະລຸນາເຂົ້າລະບົບໃໝ່';
  return 'ບໍ່ສາມາດບັນທຶກຜະລິດຕະພັນ ກະລຸນາກວດການເຊື່ອມຕໍ່ ແລ້ວລອງໃໝ່';
}

export default function SalesProductAdmin() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [values, setValues] = useState({ name: '', sortOrder: 0 });
  useEffect(() => subscribeAllSalesProducts(setProducts, () => setError('ບໍ່ສາມາດໂຫຼດຜະລິດຕະພັນ')), []);
  const openForm = (product = null) => { setEditing(product || {}); setValues({ name: product?.name || '', sortOrder: product?.sortOrder ?? 0 }); setError(''); };
  const save = async (event) => {
    event.preventDefault();
    setError('');
    const payload = { ...values, sortOrder: Number(values.sortOrder) };
    try {
      if (editing.id) await updateSalesProduct(editing.id, { ...payload, active: editing.active });
      else await createSalesProduct(payload);
      setEditing(null);
    } catch (failure) {
      setError(catalogError(failure));
    }
  };
  const toggle = async (product) => {
    try {
      await updateSalesProduct(product.id, {
        name: product.name,
        sortOrder: product.sortOrder,
        active: !product.active,
      });
      setConfirming(null);
    } catch (failure) {
      setError(catalogError(failure));
      setConfirming(null);
    }
  };
  return (
    <section className="sales-product-admin" aria-label="ຈັດການຜະລິດຕະພັນ">
      <div className="section-heading">
        <h2>ລາຍການຜະລິດຕະພັນ</h2>
        <Button onClick={() => openForm()}>ເພີ່ມຜະລິດຕະພັນ</Button>
      </div>
      {error ? <div role="alert" className="error-banner">{error}</div> : null}
      <div className="sales-product-list">
        {products.map((product) => (
          <div className={`sales-product-row ${product.active ? '' : 'is-disabled'}`} key={product.id}>
            <div>
              <strong>{product.name}</strong>
              <span className="sales-product-status">
                {product.active ? 'ເປີດນຳໃຊ້' : 'ປິດນຳໃຊ້'}
              </span>
            </div>
            <span>{product.sortOrder}</span>
            <Button variant="neutral" onClick={() => openForm(product)}>ແກ້ໄຂ</Button>
            <Button
              variant="secondary"
              onClick={() => (product.active ? setConfirming(product) : toggle(product))}
            >
              {product.active ? `ປິດນຳໃຊ້ ${product.name}` : `ເປີດນຳໃຊ້ ${product.name}`}
            </Button>
          </div>
        ))}
      </div>
      <ModalSheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'ແກ້ໄຂຜະລິດຕະພັນ' : 'ເພີ່ມຜະລິດຕະພັນ'}
      >
        <form className="form-stack" onSubmit={save}>
          <Input
            id="sales-product-name"
            label="ຊື່"
            required
            value={values.name}
            onChange={(event) => setValues({ ...values, name: event.target.value })}
          />
          <Input
            id="sales-product-sort"
            label="ລຳດັບ"
            type="number"
            required
            value={values.sortOrder}
            onChange={(event) => setValues({ ...values, sortOrder: event.target.value })}
          />
          {error ? <div role="alert" className="error-banner">{error}</div> : null}
          <Button type="submit">ບັນທຶກ</Button>
        </form>
      </ModalSheet>
      <ModalSheet
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        title="ຢືນຢັນປິດຜະລິດຕະພັນ"
      >
        <p>ຕ້ອງການປິດນຳໃຊ້ {confirming?.name} ບໍ?</p>
        <Button onClick={() => toggle(confirming)}>ຢືນຢັນປິດນຳໃຊ້</Button>
      </ModalSheet>
    </section>
  );
}
