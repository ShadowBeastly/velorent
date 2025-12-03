import React from 'react';

const Card = ({ children, className = '', hover = false, glass = false, ...props }) => {
    const baseStyles = "rounded-2xl transition-all duration-300";

    const variants = {
        default: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-premium",
        glass: "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-glass",
    };

    const hoverStyles = hover
        ? "hover:shadow-premium-hover hover:border-brand-200 dark:hover:border-brand-900/50 hover:-translate-y-1"
        : "";

    return (
        <div
            className={`${baseStyles} ${glass ? variants.glass : variants.default} ${hoverStyles} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
