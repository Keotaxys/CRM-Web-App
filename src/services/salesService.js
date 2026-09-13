import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';
import { normalizeDailySales, normalizeSalesProduct } from '../sales/salesModel';

function subscribeProducts(constraints, onData, onError) {
  return onSnapshot(query(collection(db, 'salesProducts'), ...constraints), (snapshot) => {
    onData(snapshot.docs.map((item) => normalizeSalesProduct({ id: item.id, ...item.data() })));
  }, onError);
}

export function subscribeActiveSalesProducts(onData, onError) {
  return subscribeProducts([
    where('active', '==', true),
    orderBy('sortOrder', 'asc'),
  ], onData, onError);
}

export function subscribeAllSalesProducts(onData, onError) {
  return subscribeProducts([orderBy('sortOrder', 'asc')], onData, onError);
}

export function subscribeDailySales(identity, { startKey, endKey }, onData, onError) {
  const constraints = [];
  if (identity?.claims?.role === 'staff') {
    constraints.push(where('staffUid', '==', identity.user.uid));
  } else if (identity?.claims?.role === 'branch_manager') {
    constraints.push(where('branchId', '==', identity.claims.branchId));
  } else if (identity?.claims?.role !== 'admin') {
    throw new Error('Approved sales actor required');
  }
  constraints.push(
    where('dateKey', '>=', startKey),
    where('dateKey', '<=', endKey),
    orderBy('dateKey', 'desc'),
  );
  return onSnapshot(query(collection(db, 'dailySales'), ...constraints), (snapshot) => {
    onData(snapshot.docs.map((item) => normalizeDailySales({ id: item.id, ...item.data() })));
  }, onError);
}

async function invoke(name, payload) {
  const result = await httpsCallable(functions, name)(payload);
  return result.data;
}

export function saveDailySales(items, expectedDateKey) {
  return invoke('saveDailySales', { items, ...(expectedDateKey ? { expectedDateKey } : {}) });
}

export function amendDailySales(values) {
  const { dailySalesId, mutationId, reason, items } = values;
  return invoke('amendDailySales', { dailySalesId, mutationId, reason, items });
}

export function createSalesProduct(values) {
  const { name, sortOrder } = values;
  return invoke('createSalesProduct', { name, sortOrder });
}

export function updateSalesProduct(productId, values) {
  const { name, sortOrder, active } = values;
  return invoke('updateSalesProduct', { productId, name, sortOrder, active });
}
