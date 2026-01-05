import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaArrowLeft, FaArrowRight, FaTimes, FaLightbulb } from 'react-icons/fa';

const TourOverlay = ({ steps, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const tooltipRef = useRef(null);
  const targetElementRef = useRef(null);

  const step = steps[currentStep];

  // تابع پاکسازی استایل‌ها - با removeProperty برای اطمینان کامل
  const cleanupElement = () => {
    const el = targetElementRef.current;
    if (el) {
      el.style.removeProperty('position');
      el.style.removeProperty('border-radius');
      el.style.removeProperty('box-shadow');
      el.style.removeProperty('outline');
      targetElementRef.current = null;
    }
  };

  useEffect(() => {
    if (!step) return;

    // پاکسازی المنت قبلی
    cleanupElement();

    const updatePosition = () => {
      const element = document.querySelector(step.target);
      if (element) {
        // ذخیره المنت برای پاکسازی بعدی
        targetElementRef.current = element;

        // اضافه کردن استایل به المنت هایلایت شده - بدون z-index برای جلوگیری از مشکل stacking context
        element.style.position = 'relative';
        element.style.borderRadius = '16px';
        element.style.boxShadow = '0 0 0 4px #d4af37, 0 0 40px rgba(212, 175, 55, 0.6)';
        element.style.outline = '2px solid #fbbf24';

        const rect = element.getBoundingClientRect();
        setTargetRect(rect);

        // محاسبه موقعیت tooltip
        const tooltipWidth = 340;
        const tooltipHeight = 200;
        const gap = 20; // فاصله بین tooltip و المنت
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let top, left;
        let position = step.position || 'auto';

        // محاسبه فضای موجود در هر طرف
        const spaceTop = rect.top;
        const spaceBottom = windowHeight - rect.bottom;
        const spaceLeft = rect.left;
        const spaceRight = windowWidth - rect.right;

        // محاسبه خودکار بهترین موقعیت
        if (position === 'auto') {
          // اولویت: بالا، پایین، چپ، راست
          if (spaceTop >= tooltipHeight + gap) {
            position = 'top';
          } else if (spaceBottom >= tooltipHeight + gap) {
            position = 'bottom';
          } else if (spaceLeft >= tooltipWidth + gap) {
            position = 'left';
          } else if (spaceRight >= tooltipWidth + gap) {
            position = 'right';
          } else {
            // اگر جایی نیست، tooltip را کوچکتر و در گوشه قرار بده
            position = 'corner';
          }
        }

        switch (position) {
          case 'top':
            top = rect.top - tooltipHeight - gap;
            left = Math.max(10, Math.min(rect.left, windowWidth - tooltipWidth - 10));
            break;
          case 'bottom':
            top = rect.bottom + gap;
            left = Math.max(10, Math.min(rect.left, windowWidth - tooltipWidth - 10));
            break;
          case 'left':
            top = Math.max(10, Math.min(rect.top, windowHeight - tooltipHeight - 10));
            left = rect.left - tooltipWidth - gap;
            break;
          case 'right':
            top = Math.max(10, Math.min(rect.top, windowHeight - tooltipHeight - 10));
            left = rect.right + gap;
            break;
          case 'corner':
            // در گوشه بالا سمت چپ صفحه (سمت چپ چون RTL است)
            top = 20;
            left = 20;
            break;
          default:
            top = rect.bottom + gap;
            left = Math.max(10, rect.left);
        }

        // اولویت: نمایش کامل tooltip در صفحه (حتی اگر روی المنت قرار بگیرد)
        if (top + tooltipHeight > windowHeight - 20) {
          top = windowHeight - tooltipHeight - 20;
        }
        if (top < 20) {
          top = 20;
        }
        if (left + tooltipWidth > windowWidth - 20) {
          left = windowWidth - tooltipWidth - 20;
        }
        if (left < 20) {
          left = 20;
        }

        setTooltipStyle({ top, left, width: tooltipWidth });

        // اسکرول به المنت
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // تاخیر کوتاه برای اطمینان از رندر شدن المنت
    const timer = setTimeout(updatePosition, 150);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [currentStep, step]);

  // پاکسازی استایل هنگام unmount
  useEffect(() => {
    return () => {
      cleanupElement();
    };
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      cleanupElement();
      setCurrentStep(currentStep + 1);
    } else {
      // پایان تور - حتماً cleanup قبل از onComplete
      cleanupElement();
      // تاخیر کوتاه برای اطمینان از اعمال تغییرات DOM
      requestAnimationFrame(() => {
        onComplete();
      });
    }
  };

  const handlePrev = () => {
    cleanupElement();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    cleanupElement();
    // تاخیر کوتاه برای اطمینان از اعمال تغییرات DOM
    requestAnimationFrame(() => {
      onSkip();
    });
  };

  if (!step) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" dir="rtl">
      {/* پس‌زمینه تاریک با سوراخ */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 9998 }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="16"
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

      {/* Tooltip - بالاترین z-index ممکن */}
      <div
        ref={tooltipRef}
        className="absolute bg-white rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
        style={{ ...tooltipStyle, zIndex: 2147483647 }}
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
