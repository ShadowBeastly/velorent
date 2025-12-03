import React from 'react';

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    isLoading = false,
    icon,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

    const variants = {
        primary: "bg-brand-600 hover:bg-brand-500 text-white shadow-btn hover:shadow-btn-hover focus:ring-brand-500 border border-transparent",
        secondary: "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 focus:ring-slate-500 shadow-sm",
        outline: "bg-transparent border-2 border-brand-600 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 focus:ring-brand-500",
        ghost: "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white focus:ring-slate-500",
        danger: "bg-red-600 hover:bg-red-500 text-white shadow-sm focus:ring-red-500",
    };

    const sizes = {
        sm: "text-sm px-3 py-1.5 rounded-lg gap-1.5",
        md: "text-sm px-5 py-2.5 rounded-xl gap-2",
        lg: "text-base px-6 py-3 rounded-xl gap-2.5",
        xl: "text-lg px-8 py-4 rounded-2xl gap-3",
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={isLoading}
            {...props}
        >
            {isLoading && (
                <svg className="animate-spin -ml-1 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {!isLoading && icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
        </button>
    );
};

export default Button;
