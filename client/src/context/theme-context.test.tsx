import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../context/theme-context.tsx';

function TestComponent() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  it('toggles theme between light and dark', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const button = screen.getByText('Toggle');
    const initialTheme = screen.getByTestId('theme-val').textContent;

    fireEvent.click(button);
    const toggledTheme = screen.getByTestId('theme-val').textContent;
    expect(toggledTheme).not.toBe(initialTheme);
  });
});
