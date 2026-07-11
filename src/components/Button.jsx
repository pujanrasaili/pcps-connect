const VARIANTS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  outline: "btn-outline",
  ghost: "btn-ghost",
  onDark: "btn-on-dark",
  outlineOnDark: "btn-outline-on-dark",
};

export default function Button({
  children,
  variant = "primary",
  icon: Icon,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={`${VARIANTS[variant] || VARIANTS.primary} ${className}`}
      {...props}
    >
      {Icon && <Icon className="text-base" />}
      {children}
    </button>
  );
}
