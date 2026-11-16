import { describe, expect, it } from "vitest";
import {
  emptyDetails,
  formatExpiry,
  isValidCvv,
  isValidExpiry,
  onlyDigits,
  parseExpiry,
  validateDetails,
  type PaymentDetails,
} from "./checkout";

const validCard: PaymentDetails = {
  ...emptyDetails,
  cardNumber: "4111111111111111",
  cardHolder: "Ana Pérez",
  cardExpiry: "1226",
  cardCvv: "123",
};

describe("formatExpiry", () => {
  it("mantiene el mes incompleto mientras se escribe", () => {
    expect(formatExpiry("")).toBe("");
    expect(formatExpiry("1")).toBe("1");
    expect(formatExpiry("12")).toBe("12");
  });

  it("autocompleta meses de un dígito mayores que uno", () => {
    expect(formatExpiry("2")).toBe("02");
    expect(formatExpiry("9")).toBe("09");
  });

  it("inserta la barra después de dos dígitos", () => {
    expect(formatExpiry("122")).toBe("12/2");
    expect(formatExpiry("1226")).toBe("12/26");
    expect(formatExpiry("0926")).toBe("09/26");
  });

  it("admite año de cuatro dígitos sin truncarlo", () => {
    expect(formatExpiry("122026")).toBe("12/2026");
    expect(formatExpiry("12/2026")).toBe("12/2026");
    expect(formatExpiry("12/2027")).toBe("12/2027");
  });

  it("respeta la barra escrita por el usuario", () => {
    expect(formatExpiry("1/26")).toBe("01/26");
    expect(formatExpiry("9/28")).toBe("09/28");
    expect(formatExpiry("1/")).toBe("01/");
  });
});

describe("parseExpiry", () => {
  it("lee año de dos y cuatro dígitos", () => {
    expect(parseExpiry("12/26")).toEqual({ month: 12, year: 2026 });
    expect(parseExpiry("12/2026")).toEqual({ month: 12, year: 2026 });
    expect(parseExpiry("1/28")).toEqual({ month: 1, year: 2028 });
  });

  it("rechaza meses fuera de rango y estructuras incompletas", () => {
    expect(parseExpiry("13/26")).toBeNull();
    expect(parseExpiry("00/26")).toBeNull();
    expect(parseExpiry("12/2")).toBeNull();
    expect(parseExpiry("12/")).toBeNull();
    expect(parseExpiry("")).toBeNull();
  });
});

describe("isValidExpiry", () => {
  it("acepta fechas vencidas porque el checkout es simulado", () => {
    // Regresión de la demo: 12/25 se rechazaba y bloqueaba el flujo.
    expect(isValidExpiry("12/25")).toBe(true);
    expect(isValidExpiry("01/24")).toBe(true);
  });

  it("acepta el año completo", () => {
    expect(isValidExpiry("12/2026")).toBe(true);
    expect(isValidExpiry("12/2027")).toBe(true);
  });

  it("sigue validando el formato y el mes", () => {
    expect(isValidExpiry("13/26")).toBe(false);
    expect(isValidExpiry("12/2")).toBe(false);
    expect(isValidExpiry("")).toBe(false);
  });
});

describe("escritura del vencimiento en el campo", () => {
  // Reproduce el handler real: formatea, conserva solo dígitos y vuelve a
  // formatear para mostrar. Evita regresiones del tipo "1/26" -> "12/6".
  const typeIntoExpiry = (keys: string): string => {
    let state = "";
    for (const key of keys) {
      state = onlyDigits(formatExpiry(`${formatExpiry(state)}${key}`), 6);
    }
    return formatExpiry(state);
  };

  it("acepta el mes de un dígito seguido de barra", () => {
    expect(typeIntoExpiry("1/26")).toBe("01/26");
    expect(isValidExpiry(typeIntoExpiry("1/26"))).toBe(true);
  });

  it("acepta el año completo tecleado", () => {
    expect(typeIntoExpiry("12/2026")).toBe("12/2026");
    expect(typeIntoExpiry("122026")).toBe("12/2026");
  });

  it("sigue aceptando la fecha típica de la demo", () => {
    expect(typeIntoExpiry("12/25")).toBe("12/25");
    expect(isValidExpiry(typeIntoExpiry("12/25"))).toBe(true);
  });
});

describe("isValidCvv", () => {
  it("exige 4 dígitos solo para Amex", () => {
    expect(isValidCvv("123", "visa")).toBe(true);
    expect(isValidCvv("1234", "visa")).toBe(false);
    expect(isValidCvv("1234", "amex")).toBe(true);
    expect(isValidCvv("123", "amex")).toBe(false);
  });
});

describe("validateDetails", () => {
  it("acepta una tarjeta completa con año de cuatro dígitos", () => {
    expect(
      validateDetails("deposit", "CARD", { ...validCard, cardExpiry: "12/2026" }),
    ).toEqual({});
  });

  it("ya no bloquea la recarga con una fecha vencida", () => {
    expect(
      validateDetails("deposit", "CARD", { ...validCard, cardExpiry: "12/25" }),
    ).toEqual({});
  });

  it("marca cada campo inválido por separado", () => {
    const errors = validateDetails("deposit", "CARD", {
      ...emptyDetails,
      cardNumber: "4111",
      cardHolder: "12345",
      cardExpiry: "13/26",
      cardCvv: "",
    });
    expect(errors.cardNumber).toBe("checkout.errorCardNumber");
    expect(errors.cardHolder).toBe("checkout.errorCardHolder");
    expect(errors.cardExpiry).toBe("checkout.errorCardExpiry");
    expect(errors.cardCvv).toBe("checkout.errorCardCvv");
  });

  it("no exige vencimiento ni CVV al retirar", () => {
    expect(
      validateDetails("withdraw", "CARD", {
        ...validCard,
        cardExpiry: "",
        cardCvv: "",
      }),
    ).toEqual({});
  });
});
