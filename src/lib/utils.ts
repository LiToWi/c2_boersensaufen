import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Round price up to 2 decimal places (ceiling)
 * @param price - The price to round
 * @returns Price rounded up to 2 decimal places
 */
export function roundPrice(price: number): number {
  return Math.ceil(price * 100) / 100
}

