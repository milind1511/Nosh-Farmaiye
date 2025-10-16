import { DEFAULT_CURRENCY } from "../config";

const currencyLocaleMap = {
  INR: "en-IN",
  USD: "en-US",
  GBP: "en-GB",
  EUR: "de-DE",
};

const createFormatter = (currency = DEFAULT_CURRENCY) =>
  new Intl.NumberFormat(currencyLocaleMap[currency] || "en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

export const formatCurrency = (value, currency = DEFAULT_CURRENCY) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return createFormatter(currency).format(0);
  }
  return createFormatter(currency).format(Number(value));
};

export const extractCurrencySymbol = (currency = DEFAULT_CURRENCY) => {
  const parts = createFormatter(currency).formatToParts(0);
  const symbolPart = parts.find((part) => part.type === "currency");
  return symbolPart ? symbolPart.value : currency;
};
