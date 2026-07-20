import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminLogin from './AdminLogin';
import React from 'react';

// ─── Helper ──────────────────────────────────────────────────────────────────
function fillAdminForm(username: string, password: string) {
  if (username)
    fireEvent.change(screen.getByPlaceholderText('Enter admin username'), {
      target: { value: username },
    });
  if (password)
    fireEvent.change(screen.getByPlaceholderText('Enter admin password'), {
      target: { value: password },
    });
}

// ─── Form Validation Tests ────────────────────────────────────────────────────
describe('AdminLogin — Form Validation', () => {
  it('renders the Admin Portal heading', () => {
    render(<AdminLogin onLogin={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Admin Portal')).toBeInTheDocument();
  });

  it('shows error when username is empty on submit', () => {
    render(<AdminLogin onLogin={vi.fn()} onBack={vi.fn()} />);
    fireEvent.submit(document.querySelector('form')!);
    expect(
      screen.getByText('Please enter your username'),
    ).toBeInTheDocument();
  });

  it('shows error when password is empty after entering username', () => {
    render(<AdminLogin onLogin={vi.fn()} onBack={vi.fn()} />);
    fillAdminForm('sscet', '');
    fireEvent.submit(document.querySelector('form')!);
    expect(
      screen.getByText('Please enter your password'),
    ).toBeInTheDocument();
  });

  it('calls onBack when Back button is clicked', () => {
    const onBackMock = vi.fn();
    render(<AdminLogin onLogin={vi.fn()} onBack={onBackMock} />);
    fireEvent.click(screen.getByText('Back to Student Login'));
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });
});

// ─── Authentication Tests ─────────────────────────────────────────────────────
describe('AdminLogin — Authentication', () => {
  it('shows invalid credentials error for wrong username/password', async () => {
    render(<AdminLogin onLogin={vi.fn()} onBack={vi.fn()} />);
    fillAdminForm('wronguser', 'wrongpass');
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Invalid credentials. Please check your username and password.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('shows error for correct username but wrong password', async () => {
    render(<AdminLogin onLogin={vi.fn()} onBack={vi.fn()} />);
    fillAdminForm('sscet', 'wrongpassword');
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Invalid credentials. Please check your username and password.',
        ),
      ).toBeInTheDocument();
    });
  });

  it('calls onLogin when correct credentials are entered', async () => {
    const onLoginMock = vi.fn();
    render(<AdminLogin onLogin={onLoginMock} onBack={vi.fn()} />);
    fillAdminForm('sscet', 'adminsscet@2026');
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(onLoginMock).toHaveBeenCalledTimes(1);
    });
  });

  it('does NOT call onLogin for wrong credentials', async () => {
    const onLoginMock = vi.fn();
    render(<AdminLogin onLogin={onLoginMock} onBack={vi.fn()} />);
    fillAdminForm('hacker', 'password123');
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(onLoginMock).not.toHaveBeenCalled();
    });
  });
});
