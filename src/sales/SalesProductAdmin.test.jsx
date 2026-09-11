import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SalesProductAdmin from './SalesProductAdmin';
const mocks = vi.hoisted(() => ({ subscribe: vi.fn((onData) => { onData([{ id: 'bcel', name: 'BCEL One', sortOrder: 1, active: true }]); return vi.fn(); }) }));
vi.mock('../services/salesService', () => ({ subscribeAllSalesProducts: mocks.subscribe, createSalesProduct: vi.fn(), updateSalesProduct: vi.fn() }));
describe('SalesProductAdmin', () => { it('shows catalog controls without delete', () => { render(<SalesProductAdmin />); expect(screen.getByText('BCEL One')).toBeInTheDocument(); expect(screen.queryByRole('button', { name: /ລຶບ/ })).not.toBeInTheDocument(); }); });
