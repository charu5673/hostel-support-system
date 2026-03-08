import {AlertContext} from './AlertContext';
import { useContext } from 'react';


export function useAlert() {
  return useContext(AlertContext);
}