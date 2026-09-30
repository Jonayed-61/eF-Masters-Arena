import Image from "next/image";
import { LOGO_PATH } from "@/lib/constants";

export function BrandLogo({ size = 52, priority = false, className = "" }: { size?: number; priority?: boolean; className?: string }) {
  return (
    <Image
      src={LOGO_PATH}
      alt="eF Masters Arena official logo"
      width={size}
      height={size}
      priority={priority}
      unoptimized
      className={`brand-logo ${className}`}
      style={{ objectFit: "contain", width: size, height: size }}
    />
  );
}

