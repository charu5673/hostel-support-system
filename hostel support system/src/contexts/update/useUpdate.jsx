import {UpdateContext} from './UpdateContext';
import { useContext } from 'react';


export function useUpdate() {
  return useContext(UpdateContext);
}