import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { laosTodayKey } from '../shared/dateTime';
import {
  saveDailySales,
  subscribeActiveSalesProducts,
  subscribeDailySales,
} from '../services/salesService';
import { salesItemsFromQuantities } from './salesModel';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';

function salesErrorMessage() {
  return 'ບໍ່ສາມາດບັນທຶກຍອດຂາຍໄດ້ ກະລຸນາລອງໃໝ່';
}

export default function DailySalesForm() {
  const identity = useAuth();
  const [products, setProducts] = useState([]);
  const [record, setRecord] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const hydratedRef = useRef(false);
  const submittingRef = useRef(false);
  const canEnter = ['staff', 'branch_manager'].includes(identity.claims.role);
  const todayKey = laosTodayKey();

  useEffect(() => {
    if (!canEnter) return undefined;
    const unsubscribeProducts = subscribeActiveSalesProducts(setProducts, () => setFeedback({ kind: 'error', text: salesErrorMessage() }));
    const unsubscribeSales = subscribeDailySales(
      identity,
      { startKey: todayKey, endKey: todayKey },
      (records) => setRecord(records[0] ?? null),
      () => setFeedback({ kind: 'error', text: salesErrorMessage() }),
    );
    return () => {
      unsubscribeProducts?.();
      unsubscribeSales?.();
    };
  }, [canEnter, identity, todayKey]);

  const rows = useMemo(() => {
    const activeIds = new Set(products.map((product) => product.id));
    const historical = (record?.items ?? [])
      .filter((item) => !activeIds.has(item.productId))
      .map((item) => ({ id: item.productId, name: item.productNameSnapshot ?? item.productId, sortOrder: Number.MAX_SAFE_INTEGER }));
    return [...products, ...historical];
  }, [products, record]);

  useEffect(() => {
    if (hydratedRef.current || (!products.length && !record)) return;
    const existing = Object.fromEntries((record?.items ?? []).map((item) => [item.productId, String(item.quantity)]));
    setQuantities(Object.fromEntries(rows.map((product) => [product.id, existing[product.id] ?? '0'])));
    hydratedRef.current = true;
  }, [products, record, rows]);

  if (!canEnter) return null;

  const updateQuantity = (productId, value) => {
    if (!/^\d*$/.test(value)) return;
    setQuantities((current) => ({ ...current, [productId]: value }));
  };

  const stepQuantity = (productId, amount) => {
    setQuantities((current) => ({
      ...current,
      [productId]: String(Math.max(0, Number(current[productId] || 0) + amount)),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      await saveDailySales(salesItemsFromQuantities(quantities));
      setFeedback({ kind: 'success', text: 'ບັນທຶກຍອດຂາຍແລ້ວ' });
    } catch {
      setFeedback({ kind: 'error', text: salesErrorMessage() });
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  return (
    <GlassCard as="section" padded>
      <h2>ຍອດຂາຍວັນນີ້</h2>
      <p>{todayKey}</p>
      <form onSubmit={submit} className="form-stack">
        {rows.map((product) => (
          <div className="form-grid" key={product.id}>
            <strong>{product.name}</strong>
            <Button variant="neutral" aria-label={`ຫຼຸດ ${product.name}`} onClick={() => stepQuantity(product.id, -1)}>−</Button>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              aria-label={`ຈຳນວນ ${product.name}`}
              value={quantities[product.id] ?? '0'}
              onChange={(event) => updateQuantity(product.id, event.target.value)}
            />
            <Button variant="neutral" aria-label={`ເພີ່ມ ${product.name}`} onClick={() => stepQuantity(product.id, 1)}>+</Button>
          </div>
        ))}
        {feedback ? <div className={feedback.kind === 'error' ? 'error-banner' : 'page-state'} role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.text}</div> : null}
        <Button type="submit" busy={busy}>ບັນທຶກຍອດມື້ນີ້</Button>
      </form>
    </GlassCard>
  );
}
