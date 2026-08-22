import { Toaster as Sonner, toast } from "sonner";

/*
  POLYNOUS toast host — JS adaptation of the shadcn sonner component for a
  Vite/JS app (no next-themes, no Tailwind tokens). Themed to the app: near-navy
  surface, green accent, Bricolage/Hanken/JetBrains type. Mount ONCE at the app
  root; call `toast.*` from anywhere (including plain modules like config.js).
*/
export function Toaster(props) {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "linear-gradient(180deg, #0e1434, #0a0a1e)",
          border: "1px solid rgba(200,216,234,0.14)",
          color: "#e2e0fc",
          fontFamily: "'Hanken Grotesk', -apple-system, sans-serif",
          borderRadius: "12px",
          boxShadow: "0 24px 60px -28px rgba(0,0,10,0.9)",
        },
        classNames: { title: "pn-toast-title", description: "pn-toast-desc" },
      }}
      {...props}
    />
  );
}

// re-export so callers can `import { toast } from "../components/ui/Toaster"`
export { toast };
