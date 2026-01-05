import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTour } from './TourProvider';
import { getTourByPath } from './tourConfigs';

/**
 * هوک برای شروع خودکار تور در اولین بازدید از صفحه
 * @param {string} userRole - نقش کاربر (sarafi یا user)
 * @param {number} delay - تاخیر قبل از شروع تور (میلی‌ثانیه)
 */
const useTourAutoStart = (userRole = 'user', delay = 1000) => {
  const location = useLocation();
  const { startTour, hasTourBeenSeen, isActive } = useTour();

  useEffect(() => {
    // تاخیر برای لود شدن کامل صفحه
    const timer = setTimeout(() => {
      const tour = getTourByPath(location.pathname, userRole);

      if (tour && !hasTourBeenSeen(tour.id) && !isActive) {
        // بررسی وجود المنت‌های تور
        const hasElements = tour.steps.every(step => {
          const el = document.querySelector(step.target);
          return !!el;
        });

        if (hasElements) {
          startTour(tour.id, tour.steps);
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [location.pathname, userRole, startTour, hasTourBeenSeen, isActive, delay]);
};

export default useTourAutoStart;
