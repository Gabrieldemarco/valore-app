import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LegalSection from './LegalSection';

describe('LegalSection', () => {
  it('renders title and date', () => {
    render(<LegalSection title="Terms &amp; Conditions" date="2024-01-01">content</LegalSection>);
    expect(screen.getByText('Terms & Conditions')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(<LegalSection title="Privacy" date="2024-06-15"><p>Some legal text here</p></LegalSection>);
    expect(screen.getByText('Some legal text here')).toBeInTheDocument();
  });
});
