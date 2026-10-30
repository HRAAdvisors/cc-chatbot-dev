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
export function FieldDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p data-slot="field-description" className={cn('text-sm leading-relaxed text-muted-foreground', className)} {...props} />;
}
