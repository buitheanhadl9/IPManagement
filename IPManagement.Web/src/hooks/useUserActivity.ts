import { useEffect } from 'react';
import { useAppDispatch } from './useAppSelector';
import { updateLastActivity } from '../store/slices/authSlice';

export const useUserActivity = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const updateActivity = () => {
      dispatch(updateLastActivity(Date.now()));
    };

    // Các sự kiện user activity
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [dispatch]);
};