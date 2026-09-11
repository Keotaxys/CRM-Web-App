import { useMemo, useRef, useState } from 'react';
import { amendDailySales } from '../services/salesService';
import Button from '../components/ui/Button';
import ModalSheet from '../components/ui/ModalSheet';
import Textarea from '../components/ui/Textarea';
import { salesItemsFromQuantities } from './salesModel';

export default function SalesCorrectionSheet({ record, products, onClose, onSuccess }) {
  const rows = useMemo(() => {
    const catalogIds = new Set(products.map((product) => product.id));
    return [...products, ...(record.items ?? [])
      .filter((item) => !catalogIds.has(item.productId))
      .map((item) => ({ id: item.productId, name: item.productNameSnapshot ?? item.productId }))];
  }, [products, record.items]);
  const [quantities, setQuantities] = useState(() => {
    const saved = Object.fromEntries((record.items ?? []).map((item) => [item.productId, String(item.quantity)]));
    return Object.fromEntries(rows.map((product) => [product.id, saved[product.id] ?? '0']));
  });
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const mutationIdRef = useRef(globalThis.crypto.randomUUID());
  const submittingRef = useRef(false);

  const close = () => {
    mutationIdRef.current = null;
    onClose?.();
  };

  const updateQuantity = (productId, value) => {
    if (/^\d*$/.test(value)) setQuantities((current) => ({ ...current, [productId]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    const cleanReason = reason.trim();
    if (!cleanReason) {
      setError('ກະລຸນາລະບຸເຫດຜົນ');
      return;
    }
    submittingRef.current = true;
    setBusy(true);
    setError('');
    try {
      await amendDailySales({
        dailySalesId: record.id,
        mutationId: mutationIdRef.current,
        reason: cleanReason,
        items: salesItemsFromQuantities(quantities),
      });
      mutationIdRef.current = null;
      onSuccess?.();
      onClose?.();
    } catch {
      setError('ບໍ່ສາມາດແກ້ໄຂຍອດ ກະລຸນາລອງໃໝ່');
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  return <ModalSheet
    open
    onClose={close}
    title="ແກ້ໄຂຍອດຂາຍ"
    description={`${record.dateKey} · ${record.staffNameSnapshot ?? record.staffUid} · ${record.branchId}`}
    mobileSheet
    footer={<><Button variant="neutral" onClick={close}>ຍົກເລີກ</Button><Button type="submit" form="sales-correction-form" busy={busy}>ຢືນຢັນການແກ້ໄຂ</Button></>}
  >
    <form id="sales-correction-form" className="form-stack" onSubmit={submit}>
      {rows.map((product) => <label key={product.id}>{product.name}
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          aria-label={`ຈຳນວນ ${product.name}`}
          value={quantities[product.id] ?? '0'}
          onChange={(event) => updateQuantity(product.id, event.target.value)}
        />
      </label>)}
      <Textarea id="sales-correction-reason" label="ເຫດຜົນການແກ້ໄຂ" aria-required="true" value={reason} onChange={(event) => setReason(event.target.value)} />
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
    </form>
  </ModalSheet>;
}
