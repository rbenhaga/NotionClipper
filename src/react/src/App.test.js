import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import Onboarding from './OnBoarding';

// Mock axios
jest.mock('axios');

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText(/Notion Clipper Pro/i)).toBeInTheDocument();
  });
});

describe('Onboarding Component', () => {
  const mockComplete = jest.fn();
  const mockSaveConfig = jest.fn();

  test('renders welcome screen', () => {
    render(
      <Onboarding 
        onComplete={mockComplete} 
        onSaveConfig={mockSaveConfig} 
      />
    );
    
    expect(screen.getByText(/Bienvenue dans Notion Clipper Pro/i)).toBeInTheDocument();
  });

  test('navigates through steps', async () => {
    render(
      <Onboarding 
        onComplete={mockComplete} 
        onSaveConfig={mockSaveConfig} 
      />
    );
    
    // Click next
    const nextButton = screen.getByText(/Suivant/i);
    fireEvent.click(nextButton);
    
    // Should show config step
    await waitFor(() => {
      expect(screen.getByText(/Configuration Notion/i)).toBeInTheDocument();
    });
  });

  test('validates Notion token', async () => {
    render(
      <Onboarding 
        onComplete={mockComplete} 
        onSaveConfig={mockSaveConfig} 
      />
    );
    
    // Navigate to config
    fireEvent.click(screen.getByText(/Suivant/i));
    
    // Enter invalid token
    const tokenInput = screen.getByPlaceholderText(/ntn/i);
    fireEvent.change(tokenInput, { target: { value: 'invalid' } });
    
    // Try to continue
    fireEvent.click(screen.getByText(/Suivant/i));
    
    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/Token invalide/i)).toBeInTheDocument();
    });
  });
});

describe('PageCard Component', () => {
  const mockPage = {
    id: '123',
    title: 'Test Page',
    icon: { type: 'emoji', emoji: '📝' },
    url: 'https://notion.so/test'
  };

  test('renders page information', () => {
    render(
      <PageCard 
        page={mockPage}
        onClick={jest.fn()}
        isFavorite={false}
        onToggleFavorite={jest.fn()}
      />
    );
    
    expect(screen.getByText('Test Page')).toBeInTheDocument();
    expect(screen.getByText('📝')).toBeInTheDocument();
  });

  test('handles favorite toggle', () => {
    const mockToggle = jest.fn();
    
    render(
      <PageCard 
        page={mockPage}
        onClick={jest.fn()}
        isFavorite={false}
        onToggleFavorite={mockToggle}
      />
    );
    
    const favoriteButton = screen.getByLabelText(/favori/i);
    fireEvent.click(favoriteButton);
    
    expect(mockToggle).toHaveBeenCalledWith('123');
  });
}); 