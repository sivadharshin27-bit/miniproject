import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from './LoginPage';
import React from 'react';

// Mock API calls
vi.mock('../services/api', () => ({
  getStudentByEmail: vi.fn().mockResolvedValue({
    id: '1',
    name: 'Jane Doe',
    registerNumber: 'E24CS002',
    department: 'Computer Science',
    email: 'jane@example.com',
    leetCodeUsername: 'janedoe',
  }),
  checkServerHealth: vi.fn().mockResolvedValue(true),
  autoAssignRandomQuestion: vi.fn().mockResolvedValue(true),
}));

describe('LoginPage — Tab Navigation and Rendering', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the Portal Access heading', () => {
    render(<LoginPage onLogin={vi.fn()} onAdminLogin={vi.fn()} />);
    expect(screen.getByText('Portal Access')).toBeInTheDocument();
  });

  it('switches to Register tab when clicked', () => {
    render(<LoginPage onLogin={vi.fn()} onAdminLogin={vi.fn()} />);
    fireEvent.click(screen.getByText('Register', { selector: 'button' }));
    expect(screen.getByPlaceholderText('e.g. Anitha')).toBeInTheDocument();
  });

  it('switches to Admin tab when clicked', () => {
    render(<LoginPage onLogin={vi.fn()} onAdminLogin={vi.fn()} />);
    fireEvent.click(screen.getByText('Admin', { selector: 'button' }));
    expect(screen.getByPlaceholderText('Enter administrator username')).toBeInTheDocument();
  });
});

describe('LoginPage — Sign In Validation', () => {
  it('shows error when email is empty on submit', () => {
    render(<LoginPage onLogin={vi.fn()} onAdminLogin={vi.fn()} />);
    fireEvent.submit(document.querySelector('form')!);
    expect(screen.getByText('Please enter your email.')).toBeInTheDocument();
  });

  it('shows error when password is empty on submit', () => {
    render(<LoginPage onLogin={vi.fn()} onAdminLogin={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Enter your registered email'), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.submit(document.querySelector('form')!);
    expect(screen.getByText('Please enter your password.')).toBeInTheDocument();
  });
});

describe('LoginPage — Authentication', () => {
  it('calls onLogin with correct student data after successful DB lookup', async () => {
    const onLoginMock = vi.fn();
    render(<LoginPage onLogin={onLoginMock} onAdminLogin={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Enter your registered email'), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
      target: { value: 'password123' },
    });
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(onLoginMock).toHaveBeenCalledWith({
        name: 'Jane Doe',
        registerNumber: 'E24CS002',
        department: 'Computer Science',
        email: 'jane@example.com',
        leetCodeUsername: 'janedoe',
      });
    });
  });
});
