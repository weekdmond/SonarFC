"use client";

function isAssetUrl(value: string) {
  return /^https?:\/\//.test(value) || value.startsWith("/");
}

export function EntityMark({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className: string;
}) {
  return (
    <span className={`mark ${className}`.trim()} aria-hidden="true">
      {isAssetUrl(value) ? <img className="mark__image" src={value} alt="" /> : value}
    </span>
  );
}
