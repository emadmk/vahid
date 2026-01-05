import { createContext, useContext, useState, useCallback } from 'react';
import TourOverlay from './TourOverlay';

const TourContext = createContext(null);

// کلید ذخیره‌سازی در localStorage
const TOUR_STORAGE_KEY = 'sarafi_tours_completed';

// دریافت تورهای تکمیل شده
const getCompletedTours = () => {
  try {
    const stored = localStorage.getItem(TOUR_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// ذخیره تور تکمیل شده
const markTourCompleted = (tourId) => {
  try {
    const completed = getCompletedTours();
    if (!completed.includes(tourId)) {
      completed.push(tourId);
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completed));
    }
  } catch {
    // ignore
  }
};

// بررسی تکمیل شدن تور
const isTourCompleted = (tourId) => {
  return getCompletedTours().includes(tourId);
};

// ریست کردن تور
const resetTour = (tourId) => {
  try {
    const completed = getCompletedTours();
    const index = completed.indexOf(tourId);
    if (index > -1) {
      completed.splice(index, 1);
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completed));
    }
  } catch {
    // ignore
  }
};

export const TourProvider = ({ children }) => {
  const [activeTour, setActiveTour] = useState(null);
  const [tourSteps, setTourSteps] = useState([]);

  // شروع تور
  const startTour = useCallback((tourId, steps, force = false) => {
    // اگر قبلا دیده شده و force نیست، نمایش نده
    if (!force && isTourCompleted(tourId)) {
      return false;
    }

    setActiveTour(tourId);
    setTourSteps(steps);
    return true;
  }, []);

  // پایان تور
  const endTour = useCallback(() => {
    if (activeTour) {
      markTourCompleted(activeTour);
    }
    setActiveTour(null);
    setTourSteps([]);
  }, [activeTour]);

  // رد کردن تور
  const skipTour = useCallback(() => {
    if (activeTour) {
      markTourCompleted(activeTour);
    }
    setActiveTour(null);
    setTourSteps([]);
  }, [activeTour]);

  // نمایش مجدد تور
  const replayTour = useCallback((tourId, steps) => {
    resetTour(tourId);
    startTour(tourId, steps, true);
  }, [startTour]);

  // بررسی وضعیت تور
  const hasTourBeenSeen = useCallback((tourId) => {
    return isTourCompleted(tourId);
  }, []);

  return (
    <TourContext.Provider
      value={{
        activeTour,
        startTour,
        endTour,
        skipTour,
        replayTour,
        hasTourBeenSeen,
        isActive: !!activeTour
      }}
    >
      {children}
      {activeTour && tourSteps.length > 0 && (
        <TourOverlay
          steps={tourSteps}
          onComplete={endTour}
          onSkip={skipTour}
        />
      )}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

export default TourProvider;
