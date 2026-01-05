import { useLocation } from 'react-router-dom';
import { FaQuestionCircle } from 'react-icons/fa';
import { useTour } from './TourProvider';
import { getTourByPath } from './tourConfigs';

const HelpButton = ({ userRole = 'user' }) => {
  const location = useLocation();
  const { replayTour, isActive } = useTour();

  const handleClick = () => {
    const tour = getTourByPath(location.pathname, userRole);
    if (tour) {
      replayTour(tour.id, tour.steps);
    }
  };

  // اگر تور برای این صفحه وجود نداره، نمایش نده
  const tour = getTourByPath(location.pathname, userRole);
  if (!tour) return null;

  return (
    <button
      onClick={handleClick}
      disabled={isActive}
      className={`
        relative p-2 rounded-lg transition-all duration-300
        ${isActive
          ? 'text-dark-600 cursor-not-allowed'
          : 'text-dark-400 hover:text-gold hover:bg-dark-800'
        }
      `}
      title="راهنمای صفحه"
    >
      <FaQuestionCircle className="text-xl" />

      {/* نشانگر پالس برای جلب توجه */}
      {!isActive && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-gold"></span>
        </span>
      )}
    </button>
  );
};

export default HelpButton;
