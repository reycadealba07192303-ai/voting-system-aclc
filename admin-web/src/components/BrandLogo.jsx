import { ACLC_LOGO, BRAND } from '../constants/branding'

const SIZES = {
  sm: 'w-9 h-9',
  md: 'w-11 h-11',
  lg: 'w-14 h-14',
}

export default function BrandLogo({ size = 'md', subtitle = BRAND.panel, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={ACLC_LOGO}
        alt={`${BRAND.name}`}
        className={`${SIZES[size] || SIZES.md} rounded-full object-cover bg-white p-1 shadow-md shrink-0`}
      />
      <div className="min-w-0">
        <p className="text-white font-semibold leading-tight truncate">{BRAND.name}</p>
        {subtitle ? (
          <p className="text-slate-400 text-xs truncate">{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}
