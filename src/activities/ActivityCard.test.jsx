import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ActivityCard from './ActivityCard';

describe('ActivityCard Lao labels', () => {
  it('shows localized type, status, and follow-up labels', () => {
    render(<MemoryRouter><ActivityCard activity={{ id:'a1',type:'event',title:'ປະຊຸມ',status:'planned',startAt:'2026-08-25T02:00:00Z',assignedStaffIds:[],followUpRequired:true }}/></MemoryRouter>);
    expect(screen.getByText('ກິດຈະກຳ')).toBeInTheDocument();
    expect(screen.getByText('ວາງແຜນ')).toBeInTheDocument();
    expect(screen.getByText('ຕິດຕາມຕໍ່')).toBeInTheDocument();
    expect(screen.queryByText('planned')).not.toBeInTheDocument();
  });
});
