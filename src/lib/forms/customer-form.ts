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

export type CustomerFormState = {
  name: string;
  document: string;
  email: string;
  phone: string;
  whatsapp: string;
  addressZipCode: string;
  addressStreet: string;
  addressNumber: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  notes: string;
};

export type CustomerFormError = {
  field: keyof CustomerFormState;
  message: string;
};

export const emptyCustomerFormState: CustomerFormState = {
  name: "",
  document: "",
  email: "",
  phone: "",
  whatsapp: "",
  addressZipCode: "",
  addressStreet: "",
  addressNumber: "",
  addressDistrict: "",
  addressCity: "",
  addressState: "",
  notes: "",
};

export function formatCustomerField(
  field: keyof CustomerFormState,
  value: string,
) {
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

export function maskCustomerFormState(
  state: Partial<CustomerFormState>,
): CustomerFormState {
  return {
    ...emptyCustomerFormState,
    ...state,
    document: formatCpfCnpj(state.document ?? ""),
    email: normalizeEmailInput(state.email ?? ""),
    phone: formatPhone(state.phone ?? ""),
    whatsapp: formatPhone(state.whatsapp ?? ""),
    addressZipCode: formatZipCode(state.addressZipCode ?? ""),
    addressState: normalizeStateCode(state.addressState ?? ""),
  };
}

export function validateCustomerFormDetailed(
  form: CustomerFormState,
): CustomerFormError | null {
  if (form.name.trim().length < 3) {
    return {
      field: "name",
      message:
        "Informe o nome ou razao social com pelo menos 3 caracteres.",
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

export function validateCustomerForm(form: CustomerFormState) {
  return validateCustomerFormDetailed(form)?.message ?? null;
}
