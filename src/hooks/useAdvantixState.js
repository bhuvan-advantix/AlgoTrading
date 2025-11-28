import { useState, useCallback, useMemo, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

// --- App State Hook ---
const useAdvantixState = () => {
    // Alert state
    const [alert, setAlert] = useState(null); // { type: 'success'|'error'|'info', message: '...' }
    const alertUser = useCallback((newAlert) => {
        setAlert(newAlert);
        if (newAlert) {
            const timer = setTimeout(() => setAlert(null), 5000);
            return () => clearTimeout(timer);
        }
    }, []);

    // Navigation state
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // User and authentication state
    const { user } = useUser();
    const [userId, setUserId] = useState(null);
    const [isKiteConnected, setIsKiteConnected] = useState(false);

    // Update userId when Clerk user changes
    useEffect(() => {
        if (user) {
            setUserId(user.id);
        }
    }, [user]);

    // Wrap common functionality in useMemo/useCallback
    const contextValue = useMemo(() => ({
        currentPage,
        setCurrentPage,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        alert,
        alertUser,
        isKiteConnected,
        setIsKiteConnected,
        userId
    }), [
        currentPage,
        isMobileMenuOpen,
        alert,
        isKiteConnected,
        alertUser,
        userId
    ]);

    return contextValue;
};

export default useAdvantixState;