import type { TranslationKey } from "@/lib/i18n";

export type PaymentTab = "deposit" | "withdraw";
export type PaymentMethod = "CARD" | "YAPE" | "PLIN" | "TRANSFER";
export type CardBrand = "visa" | "mastercard" | "amex" | "generic";
export type BankId = "BCP" | "BBVA" | "INTERBANK" | "SCOTIABANK";

export type PaymentDetails = {
  cardNumber: string;
  cardHolder: string;
  cardExpiry: string;
  cardCvv: string;
  phone: string;
  otp: string;
  bank: BankId;
  cci: string;
  operation: string;
};

export type CheckoutField =
  | "cardNumber"
  | "cardHolder"
  | "cardExpiry"
  | "cardCvv"
  | "phone"
  | "otp"
  | "cci"
  | "operation";

export type CheckoutErrors = Partial<Record<CheckoutField, TranslationKey>>;

export const emptyDetails: PaymentDetails = {
  cardNumber: "",
  cardHolder: "",
  cardExpiry: "",
  cardCvv: "",
  phone: "",
  otp: "",
  bank: "BCP",
  cci: "",
  operation: "",
};

export const banks: Array<{ id: BankId; name: string; tone: string }> = [
  { id: "BCP", name: "BCP", tone: "bg-[#ff6b00]" },
  { id: "BBVA", name: "BBVA", tone: "bg-[#004481]" },
  { id: "INTERBANK", name: "Interbank", tone: "bg-[#00a650]" },
  { id: "SCOTIABANK", name: "Scotiabank", tone: "bg-[#e2231a]" },
];

export const bankDestinations: Record<
  BankId,
  { account: string; cci: string; holder: string }
> = {
  BCP: {
    account: "193-2345678-0-12",
    cci: "00219300234567801234",
    holder: "BetPulse S.A.C.",
  },
  BBVA: {
    account: "0011-0123-0100123456",
    cci: "01112300010012345678",
    holder: "BetPulse S.A.C.",
  },
  INTERBANK: {
    account: "200-3001234567",
    cci: "00320000300123456789",
    holder: "BetPulse S.A.C.",
  },
  SCOTIABANK: {
    account: "000-1234567",
    cci: "00900000123456789012",
    holder: "BetPulse S.A.C.",
  },
};

export function onlyDigits(value: string, maxLength = 19): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function detectCardBrand(value: string): CardBrand {
  const number = onlyDigits(value);
  if (/^4/.test(number)) {
    return "visa";
  }
  if (/^(5[1-5]|2[2-7])/.test(number)) {
    return "mastercard";
  }
  if (/^3[47]/.test(number)) {
    return "amex";
  }
  return "generic";
}

export function cardBrandLabel(brand: CardBrand): string {
  switch (brand) {
    case "visa":
      return "Visa";
    case "mastercard":
      return "Mastercard";
    case "amex":
      return "American Express";
    default:
      return "Tarjeta";
  }
}

export function formatCardNumber(value: string): string {
  const number = onlyDigits(value, 19);
  if (detectCardBrand(number) === "amex") {
    return [number.slice(0, 4), number.slice(4, 10), number.slice(10, 15)]
      .filter(Boolean)
      .join(" ");
  }
  return number.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Formatea el vencimiento mientras se escribe. Admite año de 2 o 4 dígitos y
 * también el separador escrito por el usuario:
 *   `1226` → `12/26`, `122026` → `12/2026`, `1/26` → `01/26`.
 * Si el primer dígito del mes es mayor que 1 se completa con `0`
 * (`926` → `09/26`).
 */
export function formatExpiry(value: string): string {
  const [monthPart, ...yearParts] = value.split("/");
  const hasSeparator = yearParts.length > 0;
  const typedYear = onlyDigits(yearParts.join(""), 4);

  if (hasSeparator) {
    const month = onlyDigits(monthPart, 2).padStart(2, "0");
    return month ? `${month}/${typedYear}` : "";
  }

  let digits = onlyDigits(value, 6);
  if (digits.length === 1 && Number(digits) > 1) {
    digits = `0${digits}`;
  }
  return digits.length > 2
    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
    : digits;
}

export function formatPhone(value: string): string {
  const digits = onlyDigits(value, 9);
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)]
    .filter(Boolean)
    .join(" ");
}

export function formatCci(value: string): string {
  return onlyDigits(value, 20).replace(/(.{4})/g, "$1 ").trim();
}

export function formatOperation(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase();
}

export function isValidCardNumber(value: string): boolean {
  const digits = onlyDigits(value);
  const brand = detectCardBrand(digits);
  if (brand === "amex") {
    return digits.length === 15;
  }
  if (brand === "mastercard") {
    return digits.length === 16;
  }
  if (brand === "visa") {
    return [13, 16, 19].includes(digits.length);
  }
  return digits.length >= 13 && digits.length <= 19;
}

/**
 * Extrae mes y año de un vencimiento ya formateado. Acepta `MM/AA` y
 * `MM/AAAA`; devuelve `null` si la estructura o el mes no son válidos.
 */
export function parseExpiry(
  value: string,
): { month: number; year: number } | null {
  const digits = onlyDigits(formatExpiry(value), 6);
  if (digits.length !== 4 && digits.length !== 6) {
    return null;
  }
  const month = Number(digits.slice(0, 2));
  if (month < 1 || month > 12) {
    return null;
  }
  const yearDigits = digits.slice(2);
  const year =
    yearDigits.length === 2 ? 2000 + Number(yearDigits) : Number(yearDigits);
  return { month, year };
}

/**
 * El checkout es simulado y no procesa pagos reales: basta con que la fecha
 * tenga forma válida (`MM/AA` o `MM/AAAA`) y un mes entre 01 y 12. No se
 * compara contra la fecha actual para no bloquear la demo con tarjetas de
 * ejemplo vencidas.
 */
export function isValidExpiry(value: string): boolean {
  return parseExpiry(value) !== null;
}

export function isValidCvv(value: string, brand: CardBrand): boolean {
  const digits = onlyDigits(value, 4);
  return brand === "amex" ? digits.length === 4 : digits.length === 3;
}

export function isValidHolder(value: string): boolean {
  return value.trim().length >= 3 && /[a-zA-Z\u00c0-\u00ff]/.test(value);
}

export function isValidPhone(value: string): boolean {
  const digits = onlyDigits(value, 9);
  return digits.length === 9 && digits.startsWith("9");
}

export function validateDetails(
  tab: PaymentTab,
  method: PaymentMethod,
  details: PaymentDetails,
): CheckoutErrors {
  const errors: CheckoutErrors = {};

  if (method === "CARD") {
    const brand = detectCardBrand(details.cardNumber);
    if (!isValidCardNumber(details.cardNumber)) {
      errors.cardNumber = "checkout.errorCardNumber";
    }
    if (!isValidHolder(details.cardHolder)) {
      errors.cardHolder = "checkout.errorCardHolder";
    }
    if (tab === "deposit") {
      if (!isValidExpiry(details.cardExpiry)) {
        errors.cardExpiry = "checkout.errorCardExpiry";
      }
      if (!isValidCvv(details.cardCvv, brand)) {
        errors.cardCvv = "checkout.errorCardCvv";
      }
    }
    return errors;
  }

  if (method === "YAPE" || method === "PLIN") {
    if (!isValidPhone(details.phone)) {
      errors.phone = "checkout.errorPhone";
    }
    if (tab === "deposit" && onlyDigits(details.otp, 6).length !== 6) {
      errors.otp = "checkout.errorOtp";
    }
    return errors;
  }

  if (tab === "deposit") {
    if (formatOperation(details.operation).length < 6) {
      errors.operation = "checkout.errorOperation";
    }
  } else {
    if (onlyDigits(details.cci, 20).length !== 20) {
      errors.cci = "checkout.errorCci";
    }
    if (!isValidHolder(details.cardHolder)) {
      errors.cardHolder = "checkout.errorCardHolder";
    }
  }
  return errors;
}

export function hasErrors(errors: CheckoutErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function maskCardNumber(value: string): string {
  const digits = onlyDigits(value);
  const last = digits.slice(-4);
  return `•••• •••• •••• ${last}`;
}

export function maskPhone(value: string): string {
  const digits = onlyDigits(value, 9);
  return `+51 ${digits.slice(0, 1)}•• ••• ${digits.slice(-3)}`;
}

export function maskCci(value: string): string {
  const digits = onlyDigits(value, 20);
  const groups = digits.replace(/(.{4})/g, "$1 ").trim().split(" ");
  return groups
    .map((group, index) =>
      index === groups.length - 1 ? group : "••••",
    )
    .join(" ");
}

export function maskOperation(value: string): string {
  const clean = formatOperation(value);
  return `••${clean.slice(-4)}`;
}

export function detailsFingerprint(
  tab: PaymentTab,
  method: PaymentMethod,
  details: PaymentDetails,
): string {
  if (method === "CARD") {
    return `${tab}|card|${onlyDigits(details.cardNumber).slice(-4)}|${details.cardExpiry}`;
  }
  if (method === "YAPE" || method === "PLIN") {
    return `${tab}|${method}|${details.phone}|${details.otp}`;
  }
  return `${tab}|transfer|${details.bank}|${details.operation}|${details.cci.slice(-4)}`;
}

export function newOperationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 5; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `BP-${code}`;
}

export function maskedDetail(
  tab: PaymentTab,
  method: PaymentMethod,
  details: PaymentDetails,
): string {
  if (method === "CARD") {
    return `${cardBrandLabel(detectCardBrand(details.cardNumber))} ${maskCardNumber(details.cardNumber)}`;
  }
  if (method === "YAPE") {
    return `Yape · ${maskPhone(details.phone)}`;
  }
  if (method === "PLIN") {
    return `Plin · ${maskPhone(details.phone)}`;
  }
  const bank = banks.find((item) => item.id === details.bank)?.name ?? details.bank;
  return tab === "deposit"
    ? `${bank} · Op. ${maskOperation(details.operation)}`
    : `${bank} · CCI ${maskCci(details.cci)}`;
}
