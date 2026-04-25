import { useContext } from 'react';
import { LoadingContext } from './LoadingContext';

export function useLoading() {
  return useContext(LoadingContext);
}