// components/saude/MedicationFormatIcon.tsx
"use client";

import {
  useId,
} from "react";

import {
  Droplet,
  StickyNote,
  Syringe,
} from "lucide-react";

// ============================================================
// TIPOS
// ============================================================

interface MedicationFormatIconProps {
  formato?: string | null;
  cores?: string[] | null;
  size?: number;
  className?: string;
}

interface BaseMedicationSvgProps {
  size: number;
  fill: string;
  className?: string;
}

// ============================================================
// HELPERS
// ============================================================

function sanitizeGradientId(
  value: string
): string {
  return value.replace(
    /[^a-zA-Z0-9_-]/g,
    ""
  );
}

function getValidColors(
  cores?: string[] | null
): string[] {
  return (
    cores
      ?.filter(
        (
          color
        ): color is string =>
          typeof color ===
            "string" &&
          color.trim().length >
            0
      )
      .map(
        (color) =>
          color.trim()
      )
      .slice(0, 2) || []
  );
}

// ============================================================
// SVGs CANÔNICOS
//
// Estes desenhos reproduzem os formatos usados no cadastro
// de medicamentos.
// ============================================================

function CirclePillIcon({
  size,
  fill,
  className,
}: BaseMedicationSvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="none"
      strokeWidth="2"
      className={
        className
      }
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />
    </svg>
  );
}

function SplitPillIcon({
  size,
  fill,
  className,
}: BaseMedicationSvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="none"
      strokeWidth="2"
      className={
        className
      }
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <line
        x1="12"
        y1="3"
        x2="12"
        y2="21"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CapsuleIcon({
  size,
  fill,
  className,
}: BaseMedicationSvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="none"
      strokeWidth="2"
      className={
        className
      }
      aria-hidden="true"
    >
      <rect
        x="4"
        y="7"
        width="16"
        height="10"
        rx="5"
        ry="5"
      />

      <line
        x1="12"
        y1="7"
        x2="12"
        y2="17"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="2"
      />
    </svg>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export function MedicationFormatIcon({
  formato,
  cores,
  size = 20,
  className,
}: MedicationFormatIconProps) {
  const rawId =
    useId();

  const gradientId =
    `medication-format-${sanitizeGradientId(
      rawId
    )}`;

  const normalizedFormat =
    formato?.trim().toLocaleLowerCase(
      "pt-BR"
    ) ||
    "comprimido";

  const validColors =
    getValidColors(
      cores
    );

  const firstColor =
    validColors[0] ||
    "#9CA3AF";

  const secondColor =
    validColors[1] ||
    firstColor;

  const supportsTwoColors =
    normalizedFormat ===
      "comprimido" ||
    normalizedFormat ===
      "partido" ||
    normalizedFormat ===
      "capsula";

  const hasTwoColors =
    supportsTwoColors &&
    validColors.length >= 2;

  const fill =
    hasTwoColors
      ? `url(#${gradientId})`
      : firstColor;

  return (
    <>
      {hasTwoColors && (
        <svg
          width="0"
          height="0"
          className="absolute"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={
                gradientId
              }
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop
                offset="50%"
                stopColor={
                  firstColor
                }
              />

              <stop
                offset="50%"
                stopColor={
                  secondColor
                }
              />
            </linearGradient>
          </defs>
        </svg>
      )}

      {normalizedFormat ===
        "partido" && (
        <SplitPillIcon
          size={
            size
          }
          fill={
            fill
          }
          className={
            className
          }
        />
      )}

      {normalizedFormat ===
        "capsula" && (
        <CapsuleIcon
          size={
            size
          }
          fill={
            fill
          }
          className={
            className
          }
        />
      )}

      {normalizedFormat ===
        "gota" && (
        <Droplet
          size={
            size
          }
          fill={
            firstColor
          }
          stroke={
            firstColor
          }
          className={
            className
          }
          aria-hidden="true"
        />
      )}

      {normalizedFormat ===
        "injecao" && (
        <Syringe
          size={
            size
          }
          stroke={
            firstColor
          }
          className={
            className
          }
          aria-hidden="true"
        />
      )}

      {normalizedFormat ===
        "adesivo" && (
        <StickyNote
          size={
            size
          }
          fill={
            firstColor
          }
          stroke={
            firstColor
          }
          className={
            className
          }
          aria-hidden="true"
        />
      )}

      {![
        "partido",
        "capsula",
        "gota",
        "injecao",
        "adesivo",
      ].includes(
        normalizedFormat
      ) && (
        <CirclePillIcon
          size={
            size
          }
          fill={
            fill
          }
          className={
            className
          }
        />
      )}
    </>
  );
}