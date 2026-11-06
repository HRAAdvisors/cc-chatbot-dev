import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export function FieldGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="field-group" className={cn('flex flex-col gap-5', className)} {...props} />;
}
export function Field({ className, ...props }: ComponentProps<'div'>) {
  return <div role="group" data-slot="field" className={cn('flex flex-col gap-2 data-[disabled=true]:opacity-50', className)} {...props} />;
}
export function FieldLabel(props: ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" {...props} />;
}
export function FieldSet({ className, ...props }: ComponentProps<'fieldset'>) {
  return <fieldset data-slot="field-set" className={cn('flex min-w-0 flex-col gap-3', className)} {...props} />;
}
export function FieldLegend({ className, variant = 'legend', ...props }: ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) {
  return <legend data-slot="field-legend" className={cn('font-medium', variant === 'label' ? 'text-sm' : 'text-base', className)} {...props} />;
}
export function FieldDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p data-slot="field-description" className={cn('text-sm leading-relaxed text-muted-foreground', className)} {...props} />;
}
