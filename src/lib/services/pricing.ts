/**
 * Validação de preços fixos e faixas ("a partir de...") para serviços.
 */

export function validateServicePricing(
  price: number,
  maxPrice?: number,
  priceType?: string
): string | null {
  if (isNaN(price) || price <= 0) {
    return priceType === "starting_at"
      ? "Informe um valor inicial válido maior que zero (a partir de R$)."
      : "Informe um preço fixo válido maior que zero (R$).";
  }

  if (priceType === "starting_at" && maxPrice !== undefined && maxPrice !== null) {
    if (isNaN(maxPrice) || maxPrice <= 0) {
      return "O valor máximo deve ser um número válido maior que zero (R$).";
    }
    if (maxPrice < price) {
      return "O valor máximo (R$) não pode ser menor do que o valor inicial (a partir de R$).";
    }
  }

  return null;
}

export function validateBasePrice(price: number): string | null {
  if (isNaN(price) || price <= 0) {
    return "Informe um valor inicial válido maior que zero (a partir de R$).";
  }
  return null;
}
