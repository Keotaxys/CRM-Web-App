import { useContext } from 'react';
import { GiftLowStockContext } from './GiftLowStockContext';

export function useGiftLowStock() {
  const value = useContext(GiftLowStockContext);
  if (!value) throw new Error('useGiftLowStock must be used inside GiftLowStockProvider');
  return value;
}
