'use client'

import { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variants = {
  primary:   'bg-[#6c3fff] hover:bg-[#4f2dcc] text-white',
  secondary: 'bg-[#13131f] hover:bg-[#1a1a2e] border border-[#1e1e30] text-[#e8e8f0]',
  ghost:     'hover:bg-[#1a1a2e] text-[#8888aa] hover:text-[#e8e8f0]',
  danger:    'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({ variant = 'primary', size = 'md', children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-lg font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
