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
import CustomSelect from '../components/ui/CustomSelect';
import GlassCard from '../components/ui/GlassCard';
import { useLaosDay } from './useLaosDay';
import { salesErrorMessage } from './salesErrors';

function compareProductOrder(left, right) {
  const orderDifference = Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0);
  if (orderDifference) return orderDifference;
  const nameDifference = String(left.name ?? '').localeCompare(String(right.name ?? ''));
  return nameDifference || String(left.id).localeCompare(String(right.id));
}

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
  const [draftRows, setDraftRows] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const submittingRef = useRef(false);
  const nextRowIdRef = useRef(0);
  const canEnter = ['staff', 'branch_manager'].includes(identity.claims.role);
  const [submitStale, setSubmitStale] = useState(false);

  useEffect(() => {
    if (!canEnter) return undefined;
    let active = true;
    const unsubscribeProducts = subscribeActiveSalesProducts((nextProducts) => {
      if (!active) return;
      const orderedProducts = [...nextProducts].sort(compareProductOrder);
      setProducts(orderedProducts);
      setKnownProducts((current) => ({
        ...current,
        ...Object.fromEntries(orderedProducts.map((product) => [product.id, product])),
      }));
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

  useEffect(() => {
    if (hydrated || !productsLoaded || !salesLoaded) return;
    const catalogOrder = new Map(products.map((product, index) => [product.id, index]));
    const savedItems = [...(record?.items ?? [])].sort((left, right) => {
      const leftOrder = catalogOrder.get(left.productId) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = catalogOrder.get(right.productId) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
    const initialRows = savedItems.map((item) => ({
      key: `saved-${item.productId}`,
      productId: item.productId,
      productNameSnapshot: item.productNameSnapshot,
      quantity: String(item.quantity),
    }));
    if (!initialRows.length) {
      nextRowIdRef.current += 1;
      initialRows.push({ key: `new-${nextRowIdRef.current}`, productId: '', quantity: '' });
    }
    setDraftRows(initialRows);
    setHydrated(true);
  }, [hydrated, products, productsLoaded, record, salesLoaded]);

  const activeProductsById = useMemo(
    () => Object.fromEntries(products.map((product) => [product.id, product])),
    [products],
  );
  const savedItemsById = useMemo(
    () => Object.fromEntries((record?.items ?? []).map((item) => [item.productId, item])),
    [record],
  );
  const rows = useMemo(() => draftRows.map((row) => {
    const activeProduct = activeProductsById[row.productId];
    const savedItem = savedItemsById[row.productId];
    const knownProduct = knownProducts[row.productId];
    return {
      ...row,
      name: activeProduct?.name ?? row.productNameSnapshot ?? savedItem?.productNameSnapshot ?? knownProduct?.name ?? row.productId,
      active: !row.productId || Boolean(activeProduct),
      maxQuantity: activeProduct ? undefined : (savedItem?.quantity ?? 0),
    };
  }), [activeProductsById, draftRows, knownProducts, savedItemsById]);

  const dayLocked = stale || submitStale;
  const ready = productsLoaded && salesLoaded && hydrated && !dayLocked;
  const invalidInactive = rows.filter((row) => row.productId && row.active === false
    && Number(row.quantity || 0) > row.maxQuantity);
  const selectedProductIds = new Set(rows.map((row) => row.productId).filter(Boolean));
  const hasBlankRow = rows.some((row) => !row.productId);
  const canAddProduct = ready && !busy && !hasBlankRow
    && products.some((product) => !selectedProductIds.has(product.id));

  if (!canEnter) return null;

  const updateRow = (rowKey, changes) => {
    setDraftRows((current) => current.map((row) => row.key === rowKey ? { ...row, ...changes } : row));
  };

  const selectProduct = (rowKey, productId) => {
    const product = activeProductsById[productId];
    if (!product) return;
    updateRow(rowKey, {
      productId,
      productNameSnapshot: product.name,
      quantity: '1',
    });
  };

  const updateQuantity = (rowKey, value) => {
    if (!/^\d*$/.test(value)) return;
    updateRow(rowKey, { quantity: value });
  };

  const addRow = () => {
    if (!canAddProduct) return;
    nextRowIdRef.current += 1;
    setDraftRows((current) => [
      ...current,
      { key: `new-${nextRowIdRef.current}`, productId: '', quantity: '' },
    ]);
  };

  const removeRow = (rowKey) => {
    setDraftRows((current) => {
      const nextRows = current.filter((row) => row.key !== rowKey);
      if (nextRows.length) return nextRows;
      nextRowIdRef.current += 1;
      return [{ key: `new-${nextRowIdRef.current}`, productId: '', quantity: '' }];
    });
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
      const quantities = Object.fromEntries(
        draftRows.filter((row) => row.productId).map((row) => [row.productId, row.quantity]),
      );
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
        {hydrated ? <div className="sales-entry-rows">
          <div className="sales-entry-row-labels" aria-hidden="true">
            <span>ຜະລິດຕະພັນ</span><span>ຈຳນວນ</span><span />
          </div>
          {rows.map((row, index) => {
            const selectedElsewhere = new Set(rows
              .filter((candidate) => candidate.key !== row.key)
              .map((candidate) => candidate.productId)
              .filter(Boolean));
            const options = row.productId && row.active === false
              ? [{ value: row.productId, label: row.name }]
              : products
                .filter((product) => !selectedElsewhere.has(product.id))
                .map((product) => ({ value: product.id, label: product.name }));
            const rowName = row.name || `ແຖວ ${index + 1}`;
            return <div className={`sales-entry-row ${row.active ? '' : 'is-disabled'}`} key={row.key}>
              <div>
                <CustomSelect
                  id={`sales-product-${row.key}`}
                  ariaLabel={`ຜະລິດຕະພັນແຖວ ${index + 1}`}
                  value={row.productId}
                  options={options}
                  placeholder="ເລືອກຜະລິດຕະພັນ"
                  compact
                  disabled={!ready || busy || row.active === false}
                  onChange={(productId) => selectProduct(row.key, productId)}
                />
                {row.active === false ? <span className="sales-product-status">ປິດນຳໃຊ້</span> : null}
              </div>
              <input
                className="sales-entry-quantity"
                type="number"
                disabled={!ready || busy || !row.productId}
                min="0"
                max={row.maxQuantity}
                step="1"
                inputMode="numeric"
                aria-label={`ຈຳນວນ ${rowName}`}
                value={row.quantity}
                onChange={(event) => updateQuantity(row.key, event.target.value)}
              />
              <Button
                disabled={!ready || busy}
                variant="neutral"
                className="sales-entry-remove"
                aria-label={`ລຶບແຖວ ${rowName}`}
                onClick={() => removeRow(row.key)}
              >×</Button>
            </div>;
          })}
          <Button
            variant="secondary"
            className="sales-entry-add"
            disabled={!canAddProduct}
            onClick={addRow}
          >+ ເພີ່ມຜະລິດຕະພັນ</Button>
        </div> : null}
        {invalidInactive.map((row) => <p key={row.key} role="alert" className="error-banner">
          {row.name}: ກະລຸນາຫຼຸດຈຳນວນໃຫ້ບໍ່ເກີນ {row.maxQuantity} ຫຼືລຶບອອກ
        </p>)}
        {feedback ? <div className={feedback.kind === 'error' ? 'error-banner' : 'page-state'} role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.text}</div> : null}
        <Button type="submit" disabled={!ready || invalidInactive.length > 0} busy={busy}>ບັນທຶກຍອດມື້ນີ້</Button>
      </form>
    </GlassCard>
  );
}
