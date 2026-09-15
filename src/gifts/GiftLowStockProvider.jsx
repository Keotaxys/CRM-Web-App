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
  const [catalogState, setCatalogState] = useState({ items: [], scope: null });
  const [stockState, setStockState] = useState({ items: [], scope: null });
  const [errorState, setErrorState] = useState({ message: '', scope: null });

  useEffect(() => {
    if (!allowed) {
      return undefined;
    }

    let live = true;
    const onError = () => {
      if (!live) return;
      setErrorState({ message: 'ບໍ່ສາມາດໂຫຼດແຈ້ງເຕືອນສະຕັອກໄດ້', scope });
    };
    const stopCatalog = subscribeActiveGiftItems((items) => {
      if (!live) return;
      setCatalogState({ items, scope });
      setErrorState({ message: '', scope });
    }, onError);
    const stopStocks = subscribeGiftStocks(identity, {}, (items) => {
      if (!live) return;
      setStockState({ items, scope });
      setErrorState({ message: '', scope });
    }, onError);

    return () => {
      live = false;
      stopCatalog?.();
      stopStocks?.();
    };
  }, [allowed, identity, scope]);

  const items = useMemo(() => {
    if (!allowed || catalogState.scope !== scope || stockState.scope !== scope) return [];
    const gifts = new Map(catalogState.items.filter((gift) => gift?.active === true).map((gift) => [gift.id, gift]));
    return stockState.items
      .filter(isLowGiftStock)
      .map((stock) => ({ ...stock, gift: gifts.get(stock.giftId) }))
      .filter((item) => item.gift);
  }, [allowed, catalogState, scope, stockState]);

  const loading = allowed && (catalogState.scope !== scope || stockState.scope !== scope);
  const error = allowed && errorState.scope === scope ? errorState.message : '';

  const value = useMemo(() => ({
    count: items.length,
    items,
    loading,
    error,
  }), [items, loading, error]);

  return <GiftLowStockContext.Provider value={value}>{children}</GiftLowStockContext.Provider>;
}
