import React from 'react';

interface PremiumPageHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  style?: React.CSSProperties;
}

export function PremiumPageHeader({ title, subtitle, right, style }: PremiumPageHeaderProps) {
  return (
    <div className="r100-header-premium" style={style}>
      <div className="r100-hdr-glow" />
      <div className="r100-hdr-glow2" />
      <div className="r100-hdr-shine" />
      <div className="r100-hdr-dots" />
      <div className="r100-hdr-content">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>
              {subtitle}
            </div>
          )}
        </div>
        {right && (
          <div style={{ flexShrink: 0 }}>
            {right}
          </div>
        )}
      </div>
    </div>
  );
}
