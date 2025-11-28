import { createContext } from 'react';
import useAdvantixState from '../hooks/useAdvantixState';

export const AppContext = createContext(null);
export { useAdvantixState };