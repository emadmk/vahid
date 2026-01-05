import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaArrowLeft, FaArrowRight, FaTimes, FaLightbulb } from 'react-icons/fa';

const TourOverlay = ({ steps, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);

  const step = steps[currentStep];

  useEffect(() => {
    if (!step) return;

    const updatePosition = () => {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);

        // محاسبه موقعیت tooltip
        const tooltipWidth = 320;
        const tooltipHeight = 200;
        const padding = 16;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let top, left;

        switch (step.position || 'bottom') {
          case 'top':
            top = rect.top - tooltipHeight - padding;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case 'bottom':
            top = rect.bottom + padding;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case 'left':
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.left - tooltipWidth - padding;
            break;
          case 'right':
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.right + padding;
            break;
          default:
            top = rect.bottom + padding;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
        }

        // تنظیم برای جلوگیری از خروج از صفحه
        if (left < padding) left = padding;
        if (left + tooltipWidth > windowWidth - padding) left = windowWidth - tooltipWidth - padding;
        if (top < padding) top = rect.bottom + padding;
        if (top + tooltipHeight > windowHeight - padding) top = rect.top - tooltipHeight - padding;

        setTooltipPosition({ top, left });

        // اسکرول به المنت
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [currentStep, step]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!step) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" dir="rtl">
      {/* پس‌زمینه تاریک با سوراخ */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.85)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* حاشیه دور المنت هایلایت شده */}
      {targetRect && (
        <div
          className="absolute border-2 border-gold rounded-xl pointer-events-none animate-pulse"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 20px rgba(212, 175, 55, 0.5), 0 0 40px rgba(212, 175, 55, 0.3)'
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl p-5 w-80 animate-fadeIn"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* هدر */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
              <FaLightbulb className="text-gold text-sm" />
            </div>
            <span className="text-gold font-bold">{step.title}</span>
          </div>
          <button
            onClick={onSkip}
            className="text-dark-400 hover:text-white transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* محتوا */}
        <p className="text-dark-300 text-sm leading-relaxed mb-5">
          {step.content}
        </p>

        {/* پیشرفت */}
        <div className="flex items-center gap-1 mb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === currentStep
                  ? 'w-6 bg-gold'
                  : index < currentStep
                  ? 'w-3 bg-gold/50'
                  : 'w-3 bg-dark-700'
              }`}
            />
          ))}
        </div>

        {/* دکمه‌ها */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-all ${
              currentStep === 0
                ? 'text-dark-600 cursor-not-allowed'
                : 'text-dark-300 hover:text-white hover:bg-dark-800'
            }`}
          >
            <FaArrowRight className="text-xs" />
            قبلی
          </button>

          <span className="text-dark-500 text-xs">
            {currentStep + 1} از {steps.length}
          </span>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm bg-gold text-dark-900 font-bold hover:bg-gold/90 transition-all"
          >
            {currentStep === steps.length - 1 ? 'پایان' : 'بعدی'}
            {currentStep < steps.length - 1 && <FaArrowLeft className="text-xs" />}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TourOverlay;
