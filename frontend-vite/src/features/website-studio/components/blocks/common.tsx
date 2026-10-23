import React from 'react';
import type { JSX } from 'react';
import type { Block, RenderContext } from '../../lib/templateEngine';

/* ============================================================
   Base Block Wrapper
   ============================================================ */

interface BlockWrapperProps {
  children: React.ReactNode;
  block: Block;
  context: RenderContext;
  isPreview?: boolean;
  className?: string;
}

export function BlockWrapper({ 
  children, 
  block, 
  context, 
  isPreview = false,
  className = '',
}: BlockWrapperProps) {
  const isEditing = isPreview && context.isPreview;
  
  return (
    <section
      className={`ws-block ws-block--${block.type} ${className}`}
      data-block-id={block.id}
      data-block-type={block.type}
      style={{
        '--ws-block-radius': 'var(--ws-radius)',
      } as React.CSSProperties}
    >
      {isEditing && (
        <div className="ws-block-toolbar" data-block-id={block.id}>
          <span className="ws-block-type">{block.type}</span>
          <div className="ws-block-actions">
            <button className="ws-btn-icon" title="Mover" data-action="move">⋮⋮</button>
            <button className="ws-btn-icon" title="Configurar" data-action="config">⚙</button>
            <button className="ws-btn-icon" title="Duplicar" data-action="duplicate">⎘</button>
            <button className="ws-btn-icon" title="Eliminar" data-action="delete">🗑</button>
          </div>
        </div>
      )}
      <div className="ws-block-content">
        {children}
      </div>
    </section>
  );
}

/* ============================================================
   Common UI Components
   ============================================================ */

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  href, 
  onClick, 
  children, 
  disabled,
  className = '',
  ...props 
}: React.HTMLAttributes<HTMLElement> & { 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
}) {
  const Component: React.ElementType = href ? 'a' : 'button';
  
  const variants = {
    primary: 'bg-[var(--ws-primary)] text-white hover:opacity-90',
    secondary: 'bg-[var(--ws-secondary)] text-white hover:opacity-90',
    outline: 'border-2 border-[var(--ws-primary)] text-[var(--ws-primary)] hover:bg-[var(--ws-primary)] hover:text-white',
    ghost: 'text-[var(--ws-primary)] hover:bg-[var(--ws-primary)] hover:text-white',
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };
  
  const anchorProps = href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {};
  const buttonProps = !href ? { disabled, type: props.type || 'button' } : {};
  
  return (
    <Component
      {...props}
      {...anchorProps}
      {...buttonProps}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center font-medium rounded-[var(--ws-radius)]
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
        focus:ring-[var(--ws-primary)] disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {children}
    </Component>
  );
}

export function Container({ children, className = '', fluid = false, style }: { 
  children: React.ReactNode; 
  className?: string; 
  fluid?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`${fluid ? 'w-full' : 'max-w-7xl mx-auto'} px-4 sm:px-6 lg:px-8 ${className}`} style={style}>
      {children}
    </div>
  );
}

export function Section({ 
  children, 
  className = '', 
  id,
  background,
  padding = 'py-16 sm:py-24',
  style,
}: { 
  children: React.ReactNode; 
  className?: string; 
  id?: string;
  background?: string;
  padding?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section 
      id={id} 
      className={`${padding} ${className}`}
      style={background ? { backgroundImage: `url(${background})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', ...style } : style}
    >
      {children}
    </section>
  );
}

export function Heading({ 
  level = 2, 
  children, 
  className = '', 
  align = 'center',
}: { 
  level?: 1 | 2 | 3 | 4;
  children: React.ReactNode; 
  className?: string;
  align?: 'left' | 'center' | 'right';
}) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  
  const sizes = {
    1: 'text-4xl sm:text-5xl lg:text-6xl',
    2: 'text-3xl sm:text-4xl lg:text-5xl',
    3: 'text-2xl sm:text-3xl',
    4: 'text-xl sm:text-2xl',
  };
  
  return (
    <Tag 
      className={`${sizes[level]} font-heading font-medium text-[var(--ws-primary)] text-${align} ${className}`}
      {...(align !== 'center' ? { style: { textAlign: align } } : {})}
    >
      {children}
    </Tag>
  );
}

export function Text({ 
  children, 
  className = '', 
  align = 'center',
  size = 'base',
}: { 
  children: React.ReactNode; 
  className?: string; 
  align?: 'left' | 'center' | 'right';
  size?: 'sm' | 'base' | 'lg';
}) {
  const sizes = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
  };
  
  return (
    <p className={`${sizes[size]} font-body text-gray-300 text-${align} leading-relaxed ${className}`}>
      {children}
    </p>
  );
}

export function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--ws-primary)] text-white ${className}`}>
      {children}
    </span>
  );
}

export function Card({ 
  children, 
  className = '', 
  hover = false,
  href,
  style,
}: { 
  children: React.ReactNode; 
  className?: string; 
  hover?: boolean;
  href?: string;
  style?: React.CSSProperties;
}) {
  const Component = href ? 'a' : 'div';
  
  return (
    <Component
      href={href}
      style={style}
      className={`
        bg-white/5 backdrop-blur-sm border border-white/10 rounded-[var(--ws-radius)]
        overflow-hidden transition-all duration-300 ${hover ? 'hover:border-[var(--ws-primary)]/50 hover:shadow-lg hover:shadow-[var(--ws-primary)]/10 hover:-translate-y-1' : ''} ${className}
      `}
    >
      {children}
    </Component>
  );
}

export function Grid({ 
  children, 
  columns = 3, 
  gap = 'gap-6', 
  className = '',
  responsive = true,
}: { 
  children: React.ReactNode; 
  columns?: number; 
  gap?: string; 
  className?: string;
  responsive?: boolean;
}) {
  const cols = responsive 
    ? `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns}` 
    : `grid-cols-${columns}`;
  
  return (
    <div className={`grid ${cols} ${gap} ${className}`}>
      {children}
    </div>
  );
}

/* ============================================================
   Image Component with Optimization
   ============================================================ */

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
}

export function OptimizedImage({ 
  src, 
  alt, 
  width, 
  height, 
  className = '', 
  priority = false,
  fill = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
}: OptimizedImageProps) {
  // In production, this would use Next.js Image or a similar optimization
  // For now, standard img with loading lazy
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      sizes={sizes}
      className={`w-full h-auto object-cover transition-opacity duration-300 ${className}`}
      style={fill ? { objectFit: 'cover', width: '100%', height: '100%' } : undefined}
    />
  );
}

/* ============================================================
   Loading Skeleton
   ============================================================ */

export function Skeleton({ className = '', variant = 'text' }: { 
  className?: string; 
  variant?: 'text' | 'circular' | 'rectangular';
}) {
  const variants = {
    text: 'h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-[var(--ws-radius)]',
  };
  
  return (
    <div className={`${variants[variant]} animate-pulse bg-white/10 ${className}`} />
  );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-[var(--ws-radius)] overflow-hidden ${className}`}>
      <Skeleton className="aspect-video w-full" variant="rectangular" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" variant="text" />
        <Skeleton className="h-4 w-1/2" variant="text" />
        <Skeleton className="h-4 w-1/3" variant="text" />
      </div>
    </div>
  );
}