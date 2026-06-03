import Big from 'big.js';

// Configure big.js default limits if necessary
// Big.DP is the number of decimal places for division, default is 20
Big.DP = 10;

export type Unit = 'mg' | 'g' | 'kg' | 'mL' | 'L' | 'item';
export type UnitDimension = 'weight' | 'volume' | 'count';

export const UNIT_DIMENSIONS: Record<Unit, UnitDimension> = {
  mg: 'weight',
  g: 'weight',
  kg: 'weight',
  mL: 'volume',
  L: 'volume',
  item: 'count'
};

export const UNIT_LABELS: Record<Unit, string> = {
  mg: 'milligrams (mg)',
  g: 'grams (g)',
  kg: 'kilograms (kg)',
  mL: 'milliliters (mL)',
  L: 'liters (L)',
  item: 'items (count)'
};

/**
 * Checks if two units belong to the same dimension and are compatible
 */
export function areUnitsCompatible(unitA: Unit, unitB: Unit): boolean {
  return UNIT_DIMENSIONS[unitA] === UNIT_DIMENSIONS[unitB];
}

/**
 * Returns list of units that are compatible with the given unit
 */
export function getCompatibleUnits(unit: Unit): Unit[] {
  const dimension = UNIT_DIMENSIONS[unit];
  return Object.keys(UNIT_DIMENSIONS).filter(
    (key) => UNIT_DIMENSIONS[key as Unit] === dimension
  ) as Unit[];
}

/**
 * Returns the conversion factor from the ordered unit to the product's base unit.
 * 
 * Formula: quantity_in_base = quantity_in_ordered * conversion_factor
 */
export function getConversionFactor(fromUnit: Unit, toBaseUnit: Unit): Big {
  if (!areUnitsCompatible(fromUnit, toBaseUnit)) {
    throw new Error(`Incompatible units: cannot convert ${fromUnit} to ${toBaseUnit}`);
  }

  if (fromUnit === toBaseUnit) {
    return new Big(1);
  }

  // Weight dimension
  if (fromUnit === 'kg' && toBaseUnit === 'g') {
    return new Big(1000);
  }
  if (fromUnit === 'g' && toBaseUnit === 'kg') {
    return new Big(0.001);
  }
  if (fromUnit === 'kg' && toBaseUnit === 'mg') {
    return new Big(1000000);
  }
  if (fromUnit === 'mg' && toBaseUnit === 'kg') {
    return new Big(0.000001);
  }
  if (fromUnit === 'g' && toBaseUnit === 'mg') {
    return new Big(1000);
  }
  if (fromUnit === 'mg' && toBaseUnit === 'g') {
    return new Big(0.001);
  }

  // Volume dimension
  if (fromUnit === 'L' && toBaseUnit === 'mL') {
    return new Big(1000);
  }
  if (fromUnit === 'mL' && toBaseUnit === 'L') {
    return new Big(0.001);
  }

  return new Big(1);
}

/**
 * Converts a quantity from one unit to another
 */
export function convertQuantity(
  quantity: number | string | Big,
  fromUnit: Unit,
  toBaseUnit: Unit
): Big {
  const qty = new Big(quantity);
  const factor = getConversionFactor(fromUnit, toBaseUnit);
  return qty.times(factor);
}

/**
 * Calculates the total price based on ordered quantity, unit, base unit, and base price.
 * 
 * Formula:
 * 1. base_qty = quantity * conversion_factor
 * 2. total_price = base_qty * base_price
 */
export function calculateTotalPrice(
  quantity: number | string | Big,
  fromUnit: Unit,
  toBaseUnit: Unit,
  basePriceInr: number | string | Big
): Big {
  const baseQty = convertQuantity(quantity, fromUnit, toBaseUnit);
  const price = new Big(basePriceInr);
  return baseQty.times(price);
}

/**
 * Format INR amount for displaying in the UI
 */
export function formatINR(amount: number | string | Big): string {
  try {
    const amt = new Big(amount);
    // Standard Indian currency formatting would use Intl.NumberFormat, but we can do a simple round/format
    // displaying 2 decimal places.
    return '₹' + parseFloat(amt.toFixed(2)).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  } catch (e) {
    return '₹0.00';
  }
}

/**
 * Format numeric values with high precision for audit displays
 */
export function formatPrecision(value: number | string | Big, decimals: number = 6): string {
  try {
    return new Big(value).toFixed(decimals);
  } catch (e) {
    return '0.000000';
  }
}
