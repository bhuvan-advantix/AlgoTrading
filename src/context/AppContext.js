import { createContext } from 'react';
import usePulse915State from '../hooks/usePulse915State';

export const AppContext = createContext(null);
export { usePulse915State };