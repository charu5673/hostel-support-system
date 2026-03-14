import {ConfirmContext} from './ConfirmContext';
import { useContext } from 'react';


export function useConfirm() {
  return useContext(ConfirmContext);
}