import React from 'react';
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { ShieldIcon } from '../icons/index.jsx';

const KiteStatusButton = () => {
    const { isKiteConnected } = useContext(AppContext);

    return (
        <button className={`flex items-center px-3 py-1 rounded-lg text-sm ${
            isKiteConnected ? 'text-green-400' : 'text-yellow-400'
        }`}>
            <ShieldIcon className="w-4 h-4 mr-2" />
            {isKiteConnected ? 'Connected' : 'Connect Zerodha'}
        </button>
    );
};

export default KiteStatusButton;