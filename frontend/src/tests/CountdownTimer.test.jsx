import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import CountdownTimer from '../components/CountdownTimer';

describe('CountdownTimer', () => {
    it('renders time from ttlSeconds', () => {
        render(<CountdownTimer ttlSeconds={3661} />);
        expect(screen.getByText('01:01:01')).toBeInTheDocument();
    });

    it('shows Expired when ttlSeconds is 0', () => {
        render(<CountdownTimer ttlSeconds={0} />);
        expect(screen.getAllByText('Expired').length).toBeGreaterThan(0);
    });

    it('shows Expired when ttlSeconds is negative', () => {
        render(<CountdownTimer ttlSeconds={-10} />);
        expect(screen.getAllByText('Expired').length).toBeGreaterThan(0);
    });

    it('shows correct hours/minutes/seconds', () => {
        render(<CountdownTimer ttlSeconds={7200} />); // 2 hours
        expect(screen.getByText('02:00:00')).toBeInTheDocument();
    });

    it('applies green color for time > 5 min', () => {
        const { container } = render(<CountdownTimer ttlSeconds={600} />);
        const timeText = container.querySelector('.text-green-400');
        expect(timeText).toBeInTheDocument();
    });

    it('decrements per second', async () => {
        vi.useFakeTimers();
        render(<CountdownTimer ttlSeconds={5} />);

        expect(screen.getByText('00:00:05')).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(screen.getByText('00:00:04')).toBeInTheDocument();

        vi.useRealTimers();
    });

    it('calls onExpire when timer reaches 0', async () => {
        vi.useFakeTimers();
        const onExpire = vi.fn();
        render(<CountdownTimer ttlSeconds={1} onExpire={onExpire} />);

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(onExpire).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });
});
