import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { subscribeActiveGiftItems, subscribeGiftStocks } from '../services/giftService';
import { isLowGiftStock } from './giftModel';
import { GiftLowStockContext } from './GiftLowStockContext';

function roleFor(identity) {
  return identity?.claims?.role ?? identity?.role;
}

export default function GiftLowStockProvider({ children }) {
  const identity = useAuth();
  const role = roleFor(identity);
  const allowed = role === 'branch_manager' || role === 'admin';
  const scope = `${identity?.user?.uid ?? identity?.uid ?? ''}:${role ?? ''}:${identity?.claims?.branchId ?? identity?.branchId ?? ''}`;
  const [catalogState, setCatalogState] = useState({ items: [], ready: false, error: '', scope: null });
  const [stockState, setStockState] = useState({ items: [], ready: false, error: '', scope: null });

  useEffect(() => {
    if (!allowed) {
      return undefined;
    }

    let live = true;
    const onCatalogError = () => {
      if (!live) return;
      setCatalogState({ items: [], ready: true, error: 'ບໍ່ສາມາດໂຫຼດແຈ້ງເຕືອນສະຕັອກໄດ້', scope });
    };
    const onStockError = () => {
      if (!live) return;
      setStockState({ items: [], ready: true, error: 'ບໍ່ສາມາດໂຫຼດແຈ້ງເຕືອນສະຕັອກໄດ້', scope });
    };
    const stopCatalog = subscribeActiveGiftItems((items) => {
      if (!live) return;
      setCatalogState({ items, ready: true, error: '', scope });
    }, onCatalogError);
    const stopStocks = subscribeGiftStocks(identity, {}, (items) => {
      if (!live) return;
      setStockState({ items, ready: true, error: '', scope });
    }, onStockError);

    return () => {
      live = false;
      stopCatalog?.();
      stopStocks?.();
    };
  }, [allowed, identity, scope]);

  const activeCatalogState = useMemo(() => (catalogState.scope === scope
    ? catalogState
    : { items: [], ready: false, error: '', scope }), [catalogState, scope]);
  const activeStockState = useMemo(() => (stockState.scope === scope
    ? stockState
    : { items: [], ready: false, error: '', scope }), [scope, stockState]);

  const items = useMemo(() => {
    if (!allowed || !activeCatalogState.ready || !activeStockState.ready) return [];
    const gifts = new Map(activeCatalogState.items.filter((gift) => gift?.active === true).map((gift) => [gift.id, gift]));
    return activeStockState.items
      .filter(isLowGiftStock)
      .map((stock) => ({ ...stock, gift: gifts.get(stock.giftId) }))
      .filter((item) => item.gift);
  }, [activeCatalogState, activeStockState, allowed]);

  const loading = allowed && (
    !activeCatalogState.ready || !activeStockState.ready
  );
  const error = allowed ? (activeCatalogState.error || activeStockState.error) : '';

  const value = useMemo(() => ({
    count: items.length,
    items,
    loading,
    error,
  }), [items, loading, error]);

  return <GiftLowStockContext.Provider value={value}>{children}</GiftLowStockContext.Provider>;
}
