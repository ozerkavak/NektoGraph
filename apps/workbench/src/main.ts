window.addEventListener('error', (event) => {
    console.group('%c🚨 NektoGraph CRITICAL ERROR', 'color: white; background: red; font-weight: bold; padding: 2px 4px; border-radius: 2px;');
    console.error('Message:', event.message);
    console.error('Source:', event.filename, 'Line:', event.lineno);
    console.error('Error Object:', event.error);
    console.groupEnd();
});

window.addEventListener('unhandledrejection', (event) => {
    console.group('%c🚨 NektoGraph PROMISE REJECTION', 'color: white; background: #c00; font-weight: bold; padding: 2px 4px; border-radius: 2px;');
    console.error('Reason:', event.reason);
    console.groupEnd();
});

import './ui/main.css';
import './ui/premium.css';

// Promotion of core RDF-IO utilities to window for standalone export modules
import * as UniversalRDF from '@triplestore/io';
(window as any).UniversalRDF = UniversalRDF;

// NektoGraph V6 Global Runtime - Bundling is handled via Vite aliases (Zero-Shim Policy)

// NektoGraph V6 Global Runtime Assets (Promoted Libraries) - loaded via main.ts imports

import { renderDashboard } from './ui';

window.addEventListener('beforeunload', (e) => {
    const hasActiveSession = (window as any).state?.currentSession || (window as any).uiState?.currentSession;
    if (hasActiveSession) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your session. Are you sure you want to leave?';
    }
});

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => renderDashboard());
} else {
    renderDashboard();
}
