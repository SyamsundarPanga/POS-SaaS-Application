// Barcode Scanner Utility
// Handles keyboard input from barcode scanners

export interface BarcodeScannerOptions {
    onScan: (barcode: string) => void;
    minLength?: number;
    maxLength?: number;
    timeout?: number;
}

export class BarcodeScanner {
    private buffer: string = '';
    private timeout: NodeJS.Timeout | null = null;
    private options: Required<BarcodeScannerOptions>;

    constructor(options: BarcodeScannerOptions) {
        this.options = {
            minLength: options.minLength || 3,
            maxLength: options.maxLength || 50,
            timeout: options.timeout || 100,
            onScan: options.onScan
        };
    }

    handleKeyPress = (event: KeyboardEvent) => {
        // Ignore if user is typing in an input field
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return;
        }

        // Clear existing timeout
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        // Enter key indicates end of barcode scan
        if (event.key === 'Enter') {
            if (this.buffer.length >= this.options.minLength && 
                this.buffer.length <= this.options.maxLength) {
                this.options.onScan(this.buffer);
            }
            this.buffer = '';
            return;
        }

        // Add character to buffer
        if (event.key.length === 1) {
            this.buffer += event.key;

            // Auto-submit after timeout (for scanners without Enter)
            this.timeout = setTimeout(() => {
                if (this.buffer.length >= this.options.minLength && 
                    this.buffer.length <= this.options.maxLength) {
                    this.options.onScan(this.buffer);
                }
                this.buffer = '';
            }, this.options.timeout);
        }
    };

    start() {
        window.addEventListener('keypress', this.handleKeyPress);
    }

    stop() {
        window.removeEventListener('keypress', this.handleKeyPress);
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.buffer = '';
    }
}
