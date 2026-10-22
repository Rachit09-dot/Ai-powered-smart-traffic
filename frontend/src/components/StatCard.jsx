import React from 'react';

export default function StatCard({ 
  title, 
  value, 
  subtext, 
  icon: Icon, 
  badge,
  badgeType = 'neutral' // 'neutral' | 'low' | 'medium' | 'high'
}) {
  const badgeStyles = {
    neutral: 'bg-[#1F1F1F] text-[#D4D4D4] border-[#333333]',
    low: 'bg-[#14231A] text-[#6BB388] border-[#2A4C37]',
    medium: 'bg-[#281F0E] text-[#D6AD57] border-[#57431B]',
    high: 'bg-[#2A1313] text-[#DE7171] border-[#5B2323]'
  };

  return (
    <div className="bg-[#171717] border border-[#333333] rounded-lg p-5 flex flex-col justify-between transition-colors hover:border-[#404040]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-[#A3A3A3]">
          {title}
        </span>
        {Icon && (
          <div className="p-1.5 rounded-md bg-[#1F1F1F] text-white border border-[#333333]">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h3 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
          {value}
        </h3>
        {badge && (
          <span className={`text-[10px] font-medium font-mono px-2 py-0.5 rounded border ${badgeStyles[badgeType] || badgeStyles.neutral}`}>
            {badge}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-[#A3A3A3] mt-2 pt-2 border-t border-[#262626]">
          {subtext}
        </p>
      )}
    </div>
  );
}
