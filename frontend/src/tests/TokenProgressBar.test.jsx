import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TokenProgressBar from '../components/TokenProgressBar';

describe('TokenProgressBar', () => {
    it('renders with 0 usage', () => {
        render(<TokenProgressBar used={0} remaining={10000} />);
        expect(screen.getByText('0.0%')).toBeInTheDocument();
        expect(screen.getByText('0.0K used')).toBeInTheDocument();
        expect(screen.getByText('10.0K left')).toBeInTheDocument();
    });

    it('renders with 50% usage', () => {
        render(<TokenProgressBar used={5000} remaining={5000} />);
        expect(screen.getByText('50.0%')).toBeInTheDocument();
    });

    it('renders with 100% usage', () => {
        render(<TokenProgressBar used={10000} remaining={0} />);
        expect(screen.getByText('100.0%')).toBeInTheDocument();
    });

    it('shows purple color for normal usage', () => {
        const { container } = render(<TokenProgressBar used={3000} remaining={7000} />);
        const bar = container.querySelector('.from-purple-500');
        expect(bar).toBeInTheDocument();
    });

    it('shows red color for 90%+ usage', () => {
        const { container } = render(<TokenProgressBar used={9500} remaining={500} />);
        const bar = container.querySelector('.from-red-500');
        expect(bar).toBeInTheDocument();
    });

    it('shows yellow color for 70-89% usage', () => {
        const { container } = render(<TokenProgressBar used={8000} remaining={2000} />);
        const bar = container.querySelector('.from-yellow-500');
        expect(bar).toBeInTheDocument();
    });

    it('renders small size variant', () => {
        const { container } = render(<TokenProgressBar used={5000} remaining={5000} size="sm" />);
        const bar = container.querySelector('.h-1\\.5');
        expect(bar).toBeInTheDocument();
    });

    it('renders custom label', () => {
        render(<TokenProgressBar used={3000} remaining={7000} label="Credit Usage" />);
        expect(screen.getByText('Credit Usage')).toBeInTheDocument();
    });

    it('handles zero total gracefully', () => {
        render(<TokenProgressBar used={0} remaining={0} />);
        expect(screen.getByText('0.0%')).toBeInTheDocument();
    });
});
