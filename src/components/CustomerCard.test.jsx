import { fireEvent, render, screen } from '@testing-library/react'; import { MemoryRouter } from 'react-router-dom'; import { describe, expect, it, vi } from 'vitest'; import CustomerCard from './CustomerCard';

const customer={id:'c1',name:'Test Customer',phone:'020 5555 1234',status:'ໃໝ່',priority:'VIP',imageUrl:'https://example.test/photo.jpg',gps:'https://maps.example/test'};
describe('CustomerCard regression',()=>{
  it('preserves card photo, status, phone, WhatsApp, and map actions',()=>{const onStatusChange=vi.fn();render(<MemoryRouter><CustomerCard customer={customer} onStatusChange={onStatusChange}/></MemoryRouter>);expect(screen.getByAltText('Test Customer')).toHaveAttribute('src',customer.imageUrl);expect(screen.getByLabelText('Call')).toHaveAttribute('href','tel:02055551234');expect(screen.getByLabelText('WhatsApp')).toHaveAttribute('href','https://wa.me/8562055551234');expect(screen.getByLabelText('Map')).toHaveAttribute('href',customer.gps);fireEvent.change(screen.getByLabelText(/Status for/),{target:{value:'ຕິດຕາມຕໍ່'}});expect(onStatusChange).toHaveBeenCalledWith('c1','ຕິດຕາມຕໍ່');});
});
