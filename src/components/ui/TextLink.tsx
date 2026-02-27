import type { AnchorHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

type TextLinkTone = 'default' | 'info'

interface TextLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  tone?: TextLinkTone
  external?: boolean
}

const toneClasses: Record<TextLinkTone, string> = {
  default: '',
  info: 'fj-link-info',
}

export default function TextLink({
  className,
  tone = 'default',
  external = false,
  rel,
  target,
  ...props
}: TextLinkProps) {
  return (
    <a
      className={cn('fj-link', toneClasses[tone], className)}
      target={external ? '_blank' : target}
      rel={external ? 'noopener noreferrer' : rel}
      {...props}
    />
  )
}
