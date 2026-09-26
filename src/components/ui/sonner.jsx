import { Toaster as Sonner } from "sonner";

const Toaster = ({
  ...props
}) => {
  // This project uses Vite (not Next.js), so next-themes is not compatible.
  // Default to "light" theme for the toaster.
  const theme = "light";

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)"
        }
      }
      {...props} />
  );
}

export { Toaster }
