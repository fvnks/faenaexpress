'use client';

import GradientASCIIRaw from './GradientASCII';
import type { ComponentPropsWithoutRef } from 'react';

type GradientASCIIProps = ComponentPropsWithoutRef<typeof GradientASCIIRaw>;

const GradientASCII: React.ForwardRefExoticComponent<
  GradientASCIIProps & React.RefAttribute<HTMLDivElement>
> = GradientASCIIRaw as unknown as React.ForwardRefExoticComponent<
  GradientASCIIProps & React.RefAttribute<HTMLDivElement>
>;

export default GradientASCII;
export type { GradientASCIIProps };
