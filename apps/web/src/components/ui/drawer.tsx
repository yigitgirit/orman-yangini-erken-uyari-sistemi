import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

const Drawer = ({
  shouldScaleBackground = false,
  direction = "right",
  modal = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    direction={direction}
    modal={modal}
    {...props}
  />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 top-10 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity",
      className,
    )}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
    direction?: "right" | "left" | "bottom" | "top";
  }
>(({ className, children, direction = "right", ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-40 flex flex-col bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl focus:outline-none",
        direction === "right" &&
          "top-10 bottom-0 right-0 h-[calc(100vh-2.5rem)] w-full sm:w-[420px] max-w-full border-l animate-in slide-in-from-right duration-300",
        direction === "bottom" &&
          "inset-x-0 bottom-0 max-h-[85vh] rounded-t-lg border-t animate-in slide-in-from-bottom duration-300",
        className,
      )}
      {...props}
    >
      {/* Tutamak (Sol kenar tutamağı) */}
      {direction === "right" && (
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-12 w-1.5 rounded-l-sm bg-zinc-700/80 cursor-pointer hidden sm:block" />
      )}
      {direction === "bottom" && (
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-zinc-800" />
      )}
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 p-3.5 border-b border-zinc-800 bg-zinc-950 shrink-0",
      className,
    )}
    {...props}
  />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-sm font-mono font-semibold tracking-tight text-zinc-100", className)}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-[11px] font-mono text-zinc-400", className)}
    {...props}
  />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
