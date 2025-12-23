import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaChevronDown, FaCheck } from 'react-icons/fa';

const Select = ({
  value,
  onChange,
  options = [],
  placeholder = 'انتخاب کنید',
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const selectRef = useRef(null);
  const buttonRef = useRef(null);

  // محاسبه موقعیت dropdown
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  // بستن منو با کلیک بیرون
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue) => {
    onChange({ target: { value: optionValue } });
    setIsOpen(false);
  };

  // رندر dropdown با Portal برای جلوگیری از مشکلات z-index
  const renderDropdown = () => {
    if (!isOpen) return null;

    return createPortal(
      <div
        className="fixed py-1 bg-dark-800 border border-dark-600 rounded-lg shadow-2xl max-h-60 overflow-y-auto"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          zIndex: 99999
        }}
      >
        {options.map((option, index) => (
          <button
            key={option.value ?? index}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={`
              w-full flex items-center justify-between px-4 py-2.5
              text-right transition-colors duration-150
              ${option.value === value
                ? 'bg-gold-500/20 text-gold-500'
                : 'text-white hover:bg-dark-700'
              }
            `}
          >
            <span>{option.label}</span>
            {option.value === value && (
              <FaCheck className="text-gold-500 text-xs" />
            )}
          </button>
        ))}
      </div>,
      document.body
    );
  };

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      {/* دکمه انتخاب */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2
          bg-dark-800 border border-dark-600 rounded-lg px-4 py-2.5
          text-white text-right
          focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-dark-500'}
          ${isOpen ? 'border-gold-500 ring-1 ring-gold-500' : ''}
        `}
      >
        <span className={selectedOption ? 'text-white' : 'text-dark-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <FaChevronDown
          className={`text-gold-500 text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* منوی آپشن‌ها - با Portal */}
      {renderDropdown()}
    </div>
  );
};

export default Select;
