import React from 'react';
import clsx from 'clsx';

export const Card = ({
  title,
  children,
  className = '',
  titleIcon: TitleIcon,
  titleClassName = '',
}) => (
  <div
    className={clsx(
      `relative bg-gradient-to-br from-[#0b1220]/80 to-[#0e1b3a]/70
       border border-white/10 backdrop-blur-xl
       rounded-2xl p-5 sm:p-6 shadow-[0_0_20px_-5px_rgba(37,99,235,0.2)]
       hover:shadow-[0_0_25px_-5px_rgba(37,99,235,0.35)]
       transition-all duration-300 ease-in-out`,
      className
    )}
  >
    {title && (
      <div
        className={clsx(
          'flex items-center mb-4 pb-2 border-b border-white/10',
          titleClassName
        )}
      >
        {TitleIcon && (
          <TitleIcon className="w-5 h-5 mr-2 text-blue-400 flex-shrink-0" />
        )}
        <h2 className="text-lg font-semibold text-slate-100 tracking-wide">
          {title}
        </h2>
      </div>
    )}
    {children}
  </div>
);
