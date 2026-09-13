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
import { useLaosDay } from './useLaosDay';
import { salesErrorMessage } from './salesErrors';

export default function DailySalesForm() {
  const identity = useAuth();
  const identityKey = `${identity.user.uid}|${identity.claims.role}|${identity.claims.branchId}|${identity.claims.accountStatus}`;
  return <DailySalesSession key={identityKey} identity={identity} />;
}

function DailySalesSession({ identity }) {
  const currentDay = useLaosDay();
  const [draftDay, setDraftDay] = useState(currentDay);
  return <DailySalesDraft key={draftDay} identity={identity} todayKey={draftDay}
    stale={currentDay !== draftDay} onReload={() => setDraftDay(laosTodayKey())} />;
}

function DailySalesDraft({ identity, todayKey, stale, onReload }) {
  const [products, setProducts] = useState([]);
  const [knownProducts, setKnownProducts] = useState({});
  const [record, setRecord] = useState(null);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [salesLoaded, setSalesLoaded] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const submittingRef = useRef(false);
  const canEnter = ['staff', 'branch_manager'].includes(identity.claims.role);
  const [submitStale, setSubmitStale] = useState(false);

  useEffect(() => {
    if (!canEnter) return undefined;
    let active = true;
    const unsubscribeProducts = subscribeActiveSalesProducts((nextProducts) => {
      if (!active) return;
      setProducts(nextProducts);
      setKnownProducts((current) => ({ ...current, ...Object.fromEntries(nextProducts.map((product) => [product.id, product])) }));
      setProductsLoaded(true);
    }, () => {
      if (!active) return;
      setProductsLoaded(false);
      setFeedback({ kind: 'error', text: salesErrorMessage() });
    });
    const unsubscribeSales = subscribeDailySales(
      identity,
      { startKey: todayKey, endKey: todayKey },
      (records) => {
        if (!active) return;
        const ownRecord = records.find((item) => item.staffUid === identity.user.uid)
          ?? (identity.claims.role === 'staff' ? records[0] : null);
        setRecord(ownRecord ?? null);
        setSalesLoaded(true);
      },
      () => {
        if (!active) return;
        setSalesLoaded(false);
        setFeedback({ kind: 'error', text: salesErrorMessage() });
      },
    );
    return () => {
      active = false;
      unsubscribeProducts?.();
      unsubscribeSales?.();
    };
  }, [canEnter, identity, todayKey]);

  const rows = useMemo(() => {
    const activeIds = new Set(products.map((product) => product.id));
    const savedById = new Map((record?.items ?? []).map((item) => [item.productId, item]));
    const inactiveIds = new Set([
      ...savedById.keys(),
      ...Object.keys(quantities).filter((id) => Number(quantities[id]) > 0),
    ]);
    const inactive = [...inactiveIds].filter((id) => !activeIds.has(id)).map((id) => ({
      id,
      name: savedById.get(id)?.productNameSnapshot ?? knownProducts[id]?.name ?? id,
      active: false,
      maxQuantity: savedById.get(id)?.quantity ?? 0,
    }));
    return [...products, ...inactive];
  }, [products, record, quantities, knownProducts]);

  useEffect(() => {
    if (hydrated || !productsLoaded || !salesLoaded) return;
    const existing = Object.fromEntries((record?.items ?? []).map((item) => [item.productId, String(item.quantity)]));
    setQuantities(Object.fromEntries(rows.map((product) => [product.id, existing[product.id] ?? '0'])));
    setHydrated(true);
  }, [hydrated, products, productsLoaded, record, rows, salesLoaded]);

  const dayLocked = stale || submitStale;
  const ready = productsLoaded && salesLoaded && hydrated && !dayLocked;
  const invalidInactive = rows.filter((product) => product.active === false
    && Number(quantities[product.id] || 0) > product.maxQuantity);

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
    if (todayKey !== laosTodayKey()) {
      setSubmitStale(true);
      return;
    }
    if (!ready || invalidInactive.length || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      await saveDailySales(salesItemsFromQuantities(quantities), todayKey);
      setFeedback({ kind: 'success', text: 'ບັນທຶກຍອດຂາຍແລ້ວ' });
    } catch (error) {
      setFeedback({ kind: 'error', text: salesErrorMessage(error) });
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  return (
    <GlassCard as="section" padded>
      <h2>ຍອດຂາຍວັນນີ້</h2>
      <p>{todayKey}</p>
      {dayLocked ? <div role="alert" className="error-banner">
        ປ່ຽນມື້ແລ້ວ ກະລຸນາໂຫຼດມື້ໃໝ່ກ່ອນບັນທຶກ
        <Button onClick={onReload}>ໂຫຼດມື້ໃໝ່</Button>
      </div> : null}
      <form onSubmit={submit} className="form-stack">
        {!ready && !feedback ? <p role="status">ກຳລັງໂຫຼດຍອດຂາຍ...</p> : null}
        {rows.map((product) => (
          <div className="form-grid" key={product.id}>
            <strong>{product.name}</strong>
            {product.active === false ? <span>ປິດນຳໃຊ້</span> : null}
            <Button disabled={!ready || busy} variant="neutral" aria-label={`ຫຼຸດ ${product.name}`} onClick={() => stepQuantity(product.id, -1)}>−</Button>
            <input
              type="number"
              disabled={!ready || busy}
              min="0"
              max={product.maxQuantity}
              step="1"
              inputMode="numeric"
              aria-label={`ຈຳນວນ ${product.name}`}
              value={quantities[product.id] ?? '0'}
              onChange={(event) => updateQuantity(product.id, event.target.value)}
            />
            <Button disabled={!ready || busy} variant="neutral" aria-label={`ເພີ່ມ ${product.name}`} onClick={() => stepQuantity(product.id, 1)}>+</Button>
          </div>
        ))}
        {invalidInactive.map((product) => <p key={product.id} role="alert" className="error-banner">
          {product.name}: ກະລຸນາຫຼຸດຈຳນວນໃຫ້ບໍ່ເກີນ {product.maxQuantity} ຫຼືລ້າງເປັນ 0
        </p>)}
        {feedback ? <div className={feedback.kind === 'error' ? 'error-banner' : 'page-state'} role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.text}</div> : null}
        <Button type="submit" disabled={!ready || invalidInactive.length > 0} busy={busy}>ບັນທຶກຍອດມື້ນີ້</Button>
      </form>
    </GlassCard>
  );
}
