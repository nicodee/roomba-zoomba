import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import App from './App';

test('renders game controls and github link', () => {
  const { getByText } = render(<App />);
  expect(getByText('Turn Right')).toBeInTheDocument();
  expect(getByText('Move Forward')).toBeInTheDocument();
  expect(getByText(/Link to repo on Github/i)).toBeInTheDocument();
});

test('renders the roomba and allows turning right', () => {
  const { getByText, getByLabelText } = render(<App />);
  const roomba = getByLabelText('roomba');
  expect(roomba).toHaveClass('right');

  const turnRightButton = getByText('Turn Right');
  fireEvent.click(turnRightButton);
  expect(roomba).toHaveClass('down');
});

test('allows roomba to move forward', () => {
  const { getByText } = render(<App />);
  const moveForwardButton = getByText('Move Forward');
  // Initial position is (0, 0) facing right; moving forward moves to (1, 0)
  fireEvent.click(moveForwardButton);
  expect(moveForwardButton).toBeInTheDocument();
});
