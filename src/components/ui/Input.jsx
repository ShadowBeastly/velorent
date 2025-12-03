import React from 'react';

const Input = React.forwardRef(({
    label,
    error,
    icon,
    className = '',
    containerClassName = '',
    ...props
}, ref) => {
    return (
        <div className={`w-full ${containerClassName}`}>
            {label && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        {icon}
                    </div>
                )}
                <input
                    ref={ref}
                    className={`
            w-full px-4 py-2.5 rounded-xl 
            bg-white dark:bg-slate-900 
            border border-slate-200 dark:border-slate-700 
            text-slate-900 dark:text-white 
            placeholder:text-slate-400 
            focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 
            transition-all outline-none
            disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}
          `}
                    {...props}
                />
            </div>
            {error && (
                <p className="mt-1.5 text-sm text-red-500 ml-1">{error}</p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
