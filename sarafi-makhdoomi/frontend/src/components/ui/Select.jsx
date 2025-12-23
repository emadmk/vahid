import { useState, useRef, useEffect } from 'react';
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
  const selectRef = useRef(null);

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

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      {/* دکمه انتخاب */}
      <button
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

      {/* منوی آپشن‌ها */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 py-1 bg-dark-800 border border-dark-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {options.map((option, index) => (
            <button
              key={option.value || index}
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
        </div>
      )}
    </div>
  );
};

export default Select;
