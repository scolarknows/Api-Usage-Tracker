import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './status-badge.tsx';

describe('StatusBadge', () => {
  it('renders online badge', () => {
    render(<StatusBadge status="up" />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('renders offline badge', () => {
    render(<StatusBadge status="down" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('renders pending badge', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});
