type CatalogLogoProps = {
  size?: number;
  className?: string;
};

/** Product mark from `/logo.svg`. Keep “HV Catalog” beside it in chrome. */
export function CatalogLogo({ size = 28, className }: CatalogLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG mark
    <img
      src="/logo.svg"
      alt="HV Catalog"
      width={size}
      height={size}
      className={className}
      decoding="async"
    />
  );
}
