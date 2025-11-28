import React from 'react';

const IconWrapper = ({ children, className = 'w-5 h-5', style = {} }) => (
    <span className={`inline-block ${className}`} aria-hidden="true" style={style}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
            {children}
        </svg>
    </span>
);

export const ZapIcon = (props) => (
    <IconWrapper {...props}>
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </IconWrapper>
);

export const ClockIcon = (props) => (
    <IconWrapper {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
    </IconWrapper>
);

export const BarChart2Icon = (props) => (
    <IconWrapper {...props}>
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
    </IconWrapper>
);

export const TrendingUpIcon = (props) => (
    <IconWrapper {...props}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
    </IconWrapper>
);

export const MenuIcon = (props) => (
    <IconWrapper {...props}>
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </IconWrapper>
);

export const XCircleIcon = (props) => (
    <IconWrapper {...props}>
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
    </IconWrapper>
);

export const CheckCircleIcon = (props) => (
    <IconWrapper {...props}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </IconWrapper>
);

export const MaximizeIcon = (props) => (
    <IconWrapper {...props}>
        <path d="M15 3h6v6" />
        <path d="M9 21H3v-6" />
        <line x1="21" y1="3" x2="14" y2="10" />
        <line x1="3" y1="21" x2="10" y2="14" />
    </IconWrapper>
);