import { useId } from "react";

export default function Brand() {
  const colorsId = `propertyiq-colors-${useId().replace(/:/g, "")}`;
  return (
    <>
      <svg
        className="iq-brand-mark"
        viewBox="140 180 980 870"
        aria-hidden="true"
      >
        <defs>
          <filter
            id={colorsId}
            colorInterpolationFilters="sRGB"
            filterUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="1254"
            height="1254"
          >
            {/* Map the supplied icon's navy and blue to #10264d / #235fbc.
                Preserve the original silhouette, white background, and alpha. */}
            <feColorMatrix
              type="matrix"
              values="1 -0.2332078222 0.2143811490 0 0.0188266731
                      1 -0.6331430422 0.6045993765 0 0.0285436657
                      1 -1.2528442447 1.1794809506 0 0.0733632941
                      0 0 0 1 0"
            />
          </filter>
        </defs>
        <image
          href="/propertyiq-icon.png"
          width="1254"
          height="1254"
          filter={`url(#${colorsId})`}
        />
      </svg>
      <span className="iq-brand-name">PropertyIQ</span>
    </>
  );
}
