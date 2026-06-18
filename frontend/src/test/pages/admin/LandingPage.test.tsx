import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LandingPage from '../../../pages/admin/LandingPage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../components/LandingComponents/Navigation', () => (props: any) => (
  <button onClick={props.onGetStarted}>Nav Start</button>
));
jest.mock('../../../components/LandingComponents/Hero', () => (props: any) => (
  <button onClick={props.onGetStarted}>Hero Start</button>
));
jest.mock('../../../components/LandingComponents/Solutions', () => () => <div>Solutions</div>);
jest.mock('../../../components/LandingComponents/MultiTenant', () => () => <div>MultiTenant</div>);
jest.mock('../../../components/LandingComponents/Inventory', () => () => <div>Inventory</div>);
jest.mock('../../../components/LandingComponents/Payment', () => () => <div>Payment</div>);
jest.mock('../../../components/LandingComponents/Analytics', () => () => <div>Analytics</div>);
jest.mock('../../../components/LandingComponents/Loyalty', () => () => <div>Loyalty</div>);
jest.mock('../../../components/LandingComponents/Pricing', () => () => <div>Pricing</div>);
jest.mock('../../../components/LandingComponents/CTASection', () => () => <div>CTA</div>);
jest.mock('../../../components/LandingComponents/Footer', () => () => <div>Footer</div>);
jest.mock('../../../components/LandingComponents/ScrollToTop', () => () => <div>ScrollToTop</div>);

describe('LandingPage', () => {
  it('navigates to login from hero/nav actions', () => {
    render(<LandingPage />);
    fireEvent.click(screen.getByText('Hero Start'));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});

