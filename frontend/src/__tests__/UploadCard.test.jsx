import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UploadCard from '../components/UploadCard';

describe('UploadCard Component', () => {
    test('renders upload instructions when no file is selected', () => {
        render(<UploadCard onFileSelected={() => { }} onError={() => { }} isLoading={false} />);
        expect(screen.getByText(/Upload Iris Image/i)).toBeInTheDocument();
        expect(screen.getByText(/Drag & drop or/i)).toBeInTheDocument();
    });

    test('displays file name after selection', () => {
        render(<UploadCard onFileSelected={() => { }} onError={() => { }} isLoading={false} />);
        const file = new File(['hello'], 'iris.png', { type: 'image/png' });
        const input = document.getElementById('file-input');

        // fireEvent doesn't work well with hidden inputs in some setups, but let's try
        fireEvent.change(input, { target: { files: [file] } });

        // The component updates state asynchronously via FileReader, but the mock file name is set
        expect(screen.getByText(/iris.png/i)).toBeInTheDocument();
    });

    test('disables input when loading', () => {
        render(<UploadCard onFileSelected={() => { }} onError={() => { }} isLoading={true} />);
        const input = document.getElementById('file-input');
        expect(input).toBeDisabled();
    });
});
