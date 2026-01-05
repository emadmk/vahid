import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaArrowLeft, FaArrowRight, FaTimes, FaLightbulb } from 'react-icons/fa';

const TourOverlay = ({ steps, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [targetElement, setTargetElement] = useState(null);
  const tooltipRef = useRef(null);

  const step = steps[currentStep];

  useEffect(() => {
    if (!step) return;

    const updatePosition = () => {
      const element = document.querySelector(step.target);
      if (element) {
        // ذخیره المنت برای اعمال استایل
        setTargetElement(element);

        // اضافه کردن استایل به المنت هایلایت شده
        element.style.position = 'relative';
        element.style.zIndex = '10000';
        element.style.pointerEvents = 'auto';

        const rect = element.getBoundingClientRect();
        setTargetRect(rect);

        // محاسبه موقعیت tooltip
        const tooltipWidth = 360;
        const padding = 20;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let top, left;

        switch (step.position || 'bottom') {
          case 'top':
            top = rect.top - 200 - padding;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case 'bottom':
            top = rect.bottom + padding;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case 'left':
            top = rect.top;
            left = rect.left - tooltipWidth - padding;
            break;
          case 'right':
            top = rect.top;
            left = rect.right + padding;
            break;
          default:
            top = rect.bottom + padding;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
        }

        // تنظیم برای جلوگیری از خروج از صفحه
        if (left < padding) left = padding;
        if (left + tooltipWidth > windowWidth - padding) left = windowWidth - tooltipWidth - padding;
        if (top < padding) {
          top = rect.bottom + padding;
        }
        if (top > windowHeight - 280) {
          top = rect.top - 240;
        }
        if (top < 10) top = 10;

        setTooltipStyle({ top, left, width: tooltipWidth });

        // اسکرول به المنت
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // تاخیر کوتاه برای اطمینان از رندر شدن المنت
    setTimeout(updatePosition, 100);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      // حذف استایل از المنت قبلی
      if (targetElement) {
        targetElement.style.position = '';
        targetElement.style.zIndex = '';
        targetElement.style.pointerEvents = '';
      }
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [currentStep, step]);

  // پاکسازی استایل هنگام unmount
  useEffect(() => {
    return () => {
      if (targetElement) {
        targetElement.style.position = '';
        targetElement.style.zIndex = '';
        targetElement.style.pointerEvents = '';
      }
    };
  }, [targetElement]);

  const handleNext = () => {
    // پاکسازی المنت قبلی
    if (targetElement) {
      targetElement.style.position = '';
      targetElement.style.zIndex = '';
      targetElement.style.pointerEvents = '';
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    // پاکسازی المنت قبلی
    if (targetElement) {
      targetElement.style.position = '';
      targetElement.style.zIndex = '';
      targetElement.style.pointerEvents = '';
    }

    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    // پاکسازی المنت
    if (targetElement) {
      targetElement.style.position = '';
      targetElement.style.zIndex = '';
      targetElement.style.pointerEvents = '';
    }
    onSkip();
  };

  if (!step) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" dir="rtl">
      {/* پس‌زمینه تاریک با سوراخ */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 9998 }}>
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

      {/* حاشیه طلایی دور المنت */}
      {targetRect && (
        <div
          className="absolute rounded-xl pointer-events-none"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            border: '3px solid #d4af37',
            boxShadow: '0 0 20px rgba(212, 175, 55, 0.5), 0 0 40px rgba(212, 175, 55, 0.3), inset 0 0 20px rgba(212, 175, 55, 0.1)',
            zIndex: 10001
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute bg-white rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
        style={{ ...tooltipStyle, zIndex: 10002 }}
      >
        {/* هدر */}
        <div className="bg-gradient-to-l from-amber-500 to-yellow-500 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <FaLightbulb className="text-white text-lg" />
            </div>
            <span className="text-white font-bold text-lg">{step.title}</span>
          </div>
          <button
            onClick={handleSkip}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* محتوا */}
        <div className="p-5">
          <p className="text-gray-700 text-base leading-relaxed mb-5">
            {step.content}
          </p>

          {/* پیشرفت */}
          <div className="flex items-center gap-1.5 mb-5">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-amber-500'
                    : index < currentStep
                    ? 'w-4 bg-amber-300'
                    : 'w-4 bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* دکمه‌ها */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                currentStep === 0
                  ? 'text-gray-300 cursor-not-allowed bg-gray-100'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <FaArrowRight className="text-xs" />
              قبلی
            </button>

            <span className="text-gray-400 text-sm font-medium">
              {currentStep + 1} از {steps.length}
            </span>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-l from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600 transition-all shadow-lg shadow-amber-500/30"
            >
              {currentStep === steps.length - 1 ? 'پایان' : 'بعدی'}
              {currentStep < steps.length - 1 && <FaArrowLeft className="text-xs" />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TourOverlay;
