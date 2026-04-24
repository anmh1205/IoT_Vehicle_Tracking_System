import Image from 'next/image';
import { BRAND_ASSETS, BRAND_FULL_NAME, BRAND_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';

const getTokenPadding = (size: number) => `${Math.max(4, Math.round(size * 0.14))}px`;

export const BrandMark = ({
  alt = BRAND_FULL_NAME,
  className,
  imageClassName,
  priority = false,
  size = 40,
  token = true,
}: {
  alt?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  size?: number;
  token?: boolean;
}) => {
  const source = size >= 48 ? BRAND_ASSETS.full : BRAND_ASSETS.mark;
  const image = (
    <Image
      src={source}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={cn('size-full object-contain', imageClassName)}
    />
  );

  if (!token) {
    return (
      <span className={cn('inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}>
        {image}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-slate-200/80 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-slate-950/80 dark:shadow-[0_14px_30px_rgba(2,6,23,0.42)]',
        className,
      )}
      style={{ width: size, height: size, padding: getTokenPadding(size) }}
    >
      {image}
    </span>
  );
};

export const BrandLockup = ({
  className,
  markClassName,
  name = BRAND_NAME,
  nameClassName,
  priority = false,
  size = 40,
  supportingText,
  supportingTextClassName,
  textContainerClassName,
}: {
  className?: string;
  markClassName?: string;
  name?: string;
  nameClassName?: string;
  priority?: boolean;
  size?: number;
  supportingText?: string;
  supportingTextClassName?: string;
  textContainerClassName?: string;
}) => {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <BrandMark size={size} priority={priority} className={markClassName} />
      <span className={cn('flex min-w-0 flex-col', textContainerClassName)}>
        <span
          className={cn(
            'font-display truncate text-sm font-semibold uppercase tracking-[0.24em] text-slate-950 dark:text-slate-50',
            nameClassName,
          )}
        >
          {name}
        </span>
        {supportingText ? (
          <span className={cn('truncate text-xs text-slate-500 dark:text-slate-400', supportingTextClassName)}>
            {supportingText}
          </span>
        ) : null}
      </span>
    </div>
  );
};
