import { Zap } from "lucide-react";
import NextLink from "next/link";
import * as React from "react";


// Use Next.js Link and forward the ref
const Link = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<typeof NextLink>
>((props, ref) => <NextLink ref={ref} {...props} />);
Link.displayName = "Link";


interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
}


export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex items-center">
            <Zap className="h-8 w-8 text-primary" />
            <span className="ml-2 text-2xl font-bold">Cards Gone Crazy</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {children}
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Link 
            href="/" 
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
