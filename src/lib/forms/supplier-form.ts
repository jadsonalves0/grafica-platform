import {
  formatCpfCnpj,
  formatPhone,
  formatZipCode,
  isValidCpfCnpj,
  isValidEmail,
  isValidPhone,
  isValidStateCode,
  isValidZipCode,
  normalizeEmailInput,
  normalizeStateCode,
} from "@/lib/forms/br-utils";

export type SupplierFormState = {
  legalName: string;
  tradeName: string;
  document: string;
  email: string;
  phone: string;
  whatsapp: string;
  contactName: string;
  addressZipCode: string;
  addressStreet: string;
  addressNumber: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  notes: string;
  isActive: boolean;
};

export type SupplierFormError = {
  field: keyof SupplierFormState;
  message: string;
};

export const emptySupplierFormState: SupplierFormState = {
  legalName: "",
  tradeName: "",
  document: "",
  email: "",
  phone: "",
  whatsapp: "",
  contactName: "",
  addressZipCode: "",
  addressStreet: "",
  addressNumber: "",
  addressDistrict: "",
  addressCity: "",
  addressState: "",
  notes: "",
  isActive: true,
};

export function formatSupplierField(field: keyof SupplierFormState, value: string | boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  switch (field) {
    case "document":
      return formatCpfCnpj(value);
    case "phone":
    case "whatsapp":
      return formatPhone(value);
    case "addressZipCode":
      return formatZipCode(value);
    case "addressState":
      return normalizeStateCode(value);
    case "email":
      return value.trim().toLowerCase();
    default:
      return value;
  }
}

export function maskSupplierFormState(state: Partial<SupplierFormState>): SupplierFormState {
  return {
    ...emptySupplierFormState,
    ...state,
    document: formatCpfCnpj(state.document ?? ""),
    email: normalizeEmailInput(state.email ?? ""),
    phone: formatPhone(state.phone ?? ""),
    whatsapp: formatPhone(state.whatsapp ?? ""),
    addressZipCode: formatZipCode(state.addressZipCode ?? ""),
    addressState: normalizeStateCode(state.addressState ?? ""),
    isActive: state.isActive ?? true,
  };
}

export function validateSupplierFormDetailed(form: SupplierFormState): SupplierFormError | null {
  if (form.legalName.trim().length < 3) {
    return {
      field: "legalName",
      message: "Informe a razao social com pelo menos 3 caracteres.",
    };
  }

  if (form.document && !isValidCpfCnpj(form.document)) {
    return {
      field: "document",
      message: "Informe um CPF ou CNPJ valido.",
    };
  }

  if (form.email && !isValidEmail(form.email)) {
    return {
      field: "email",
      message: "Informe um e-mail valido.",
    };
  }

  if (form.phone && !isValidPhone(form.phone)) {
    return {
      field: "phone",
      message: "Informe um telefone valido com DDD.",
    };
  }

  if (form.whatsapp && !isValidPhone(form.whatsapp)) {
    return {
      field: "whatsapp",
      message: "Informe um WhatsApp valido com DDD.",
    };
  }

  if (form.addressZipCode && !isValidZipCode(form.addressZipCode)) {
    return {
      field: "addressZipCode",
      message: "Informe um CEP valido.",
    };
  }

  if (form.addressState && !isValidStateCode(form.addressState)) {
    return {
      field: "addressState",
      message: "Informe uma UF valida com 2 letras.",
    };
  }

  return null;
}
