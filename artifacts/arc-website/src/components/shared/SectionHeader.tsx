interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
}

export function SectionHeader({ title, subtitle, centered = false }: SectionHeaderProps) {
  return (
    <div className={`mb-12 md:mb-16 ${centered ? "text-center flex flex-col items-center" : ""}`}>
      {subtitle && (
        <span className="text-primary font-medium tracking-wider uppercase text-sm mb-3 block">
          {subtitle}
        </span>
      )}
      <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
        {title}
      </h2>
      <div className={`w-12 h-1 bg-primary mt-6 ${centered ? "mx-auto" : ""}`} />
    </div>
  );
}
