import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the KeyStrike splash screen', async () => {
  render(<App />);
  expect(await screen.findByAltText(/splashscreen/i)).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /start/i })).toBeInTheDocument();
});
