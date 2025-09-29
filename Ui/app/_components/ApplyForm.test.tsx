import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApplyForm from './ApplyForm';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock api
jest.mock('@/lib/api', () => ({
  postInfluencerApply: jest.fn(() => Promise.resolve({})),
}));

describe('ApplyForm Component Tests', () => {
  test('renders form correctly', () => {
    render(<ApplyForm />);
    
    expect(screen.getByText('Hesap Bilgileri')).toBeInTheDocument();
    expect(screen.getByText('İletişim Bilgileri')).toBeInTheDocument();
    expect(screen.getByText('Aktif Olunan Platformlar')).toBeInTheDocument();
    expect(screen.getByText('Ödeme ve İşletme Bilgileri')).toBeInTheDocument();
    expect(screen.getByText('Ek Mesaj')).toBeInTheDocument();
    expect(screen.getByLabelText('E-posta')).toBeInTheDocument();
    expect(screen.getByLabelText('Şifre')).toBeInTheDocument();
    expect(screen.getByLabelText('Markanız')).toBeInTheDocument();
    expect(screen.getByLabelText('İsim Soyisim')).toBeInTheDocument();
    expect(screen.getByLabelText('Telefon Numarası')).toBeInTheDocument();
    expect(screen.getByLabelText('Ödeme Yapılacak Hesap (IBAN)')).toBeInTheDocument();
    expect(screen.getByLabelText('Banka Adı')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kaydol' })).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    render(<ApplyForm />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Kaydol' }));
    
    await waitFor(() => {
      expect(screen.getByText('Bu alan zorunludur.')).toBeInTheDocument();
      expect(screen.getByText('Geçerli bir e-posta girin.')).toBeInTheDocument();
      expect(screen.getByText('Şifre en az 6 karakter olmalı.')).toBeInTheDocument();
      expect(screen.getByText('En az bir sosyal hesap ekleyin.')).toBeInTheDocument();
      expect(screen.getByText('Şartları kabul etmelisiniz.')).toBeInTheDocument();
    });
 });

  test('shows error for invalid email', async () => {
    render(<ApplyForm />);
    
    fireEvent.change(screen.getByLabelText('E-posta'), { target: { value: 'invalid-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydol' }));
    
    await waitFor(() => {
      expect(screen.getByText('Geçerli bir e-posta girin.')).toBeInTheDocument();
    });
  });

  test('shows error for short password', async () => {
    render(<ApplyForm />);
    
    fireEvent.change(screen.getByLabelText('E-posta'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Şifre'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydol' }));
    
    await waitFor(() => {
      expect(screen.getByText('Şifre en az 6 karakter olmalı.')).toBeInTheDocument();
    });
  });

  test('validates social account fields', async () => {
    render(<ApplyForm />);
    
    // Add a social account with invalid data
    const platformSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(platformSelect, { target: { value: 'Instagram' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Kaydol' }));
    
    await waitFor(() => {
      expect(screen.getByText('En az 2 karakter girin.')).toBeInTheDocument();
    });
  });

  test('adds and removes social accounts', () => {
    render(<ApplyForm />);
    
    const addAccountButton = screen.getByRole('button', { name: 'Platform Ekle' });
    fireEvent.click(addAccountButton);
    
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(1);
    
    const removeButtons = screen.getAllByRole('button', { name: 'Kaldır' });
    fireEvent.click(removeButtons[0]);
    
    expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(1);
  });

  test('handles terms and conditions checkbox', async () => {
    render(<ApplyForm />);
    
    const termsCheckbox = screen.getByLabelText(/Sözleşme’yi okudum, anladım ve kabul ettim./i);
    expect(termsCheckbox).not.toBeChecked();
    
    fireEvent.click(termsCheckbox);
    expect(termsCheckbox).toBeChecked();
    
    // Try to submit without checking terms
    fireEvent.click(screen.getByRole('button', { name: 'Kaydol' }));
    
    await waitFor(() => {
      expect(screen.getByText('Şartları kabul etmelisiniz.')).toBeInTheDocument();
    });
 });
});