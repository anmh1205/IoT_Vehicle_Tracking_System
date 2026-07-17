import { BrandMark } from '@/components/common/brand-mark';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const FALLBACK_ICON_SIZE = {
  sm: 16,
  default: 18,
  lg: 22,
} as const;

export const UserAvatar = ({
  className,
  name,
  size = 'default',
  src,
}: {
  className?: string;
  name?: string | null;
  size?: 'default' | 'sm' | 'lg';
  src?: string | null;
}) => {
  const displayName = name?.trim() || 'Người dùng';

  return (
    <Avatar className={className} size={size}>
      {src ? <AvatarImage src={src} alt={displayName} className="object-cover" /> : null}
      <AvatarFallback className={cn('overflow-hidden border border-white/10 bg-[linear-gradient(145deg,#0f172a,#1d4ed8)] text-white')}>
        <span className="sr-only">{displayName}</span>
        <BrandMark
          alt=""
          token={false}
          size={FALLBACK_ICON_SIZE[size]}
          className="drop-shadow-[0_4px_10px_rgba(15,23,42,0.38)]"
        />
      </AvatarFallback>
    </Avatar>
  );
};
