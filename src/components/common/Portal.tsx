import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
    children: React.ReactNode;
}

const Portal: React.FC<PortalProps> = ({ children }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        
        let portalRoot = document.getElementById('portal-root');
        if (!portalRoot) {
            portalRoot = document.createElement('div');
            portalRoot.setAttribute('id', 'portal-root');
            document.body.appendChild(portalRoot);
        }
        
        return () => {
            // Optional: cleanup portal root if empty? 
            // Usually we keep it to avoid thrashing.
        };
    }, []);

    if (!mounted) return null;

    const portalRoot = document.getElementById('portal-root');
    if (!portalRoot) return null;

    return createPortal(children, portalRoot);
};

export default Portal;
