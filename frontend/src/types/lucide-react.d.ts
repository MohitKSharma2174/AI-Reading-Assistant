import 'lucide-react';

declare module 'lucide-react' {
  export const Youtube: React.ForwardRefExoticComponent<
    React.SVGProps<SVGSVGElement> & {
      size?: string | number;
      absoluteStrokeWidth?: boolean;
    }
  >;
}

