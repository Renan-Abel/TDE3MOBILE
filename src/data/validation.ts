export function text(value: string, label: string, min = 1, max = 50) {
  const cleaned = value.trim();
  if (cleaned.length < min || cleaned.length > max)
    throw new Error(`${label}: informe entre ${min} e ${max} caracteres.`);
  return cleaned;
}
export function integer(value: string, label: string, min = 0) {
  if (!/^\d+$/.test(value.trim()))
    throw new Error(`${label}: informe um número inteiro.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > 2147483647)
    throw new Error(`${label}: valor fora do limite permitido.`);
  return parsed;
}
export function cents(value: string) {
  if (!/^\d+([.,]\d{1,2})?$/.test(value.trim()))
    throw new Error("Preço: use um valor como 29,90, sem separador de milhar.");
  const parsed = Math.round(Number(value.replace(",", ".")) * 100);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > 1000000000)
    throw new Error(
      "Preço: informe um valor maior que zero e até R$ 10.000.000,00.",
    );
  return parsed;
}
export function date(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) throw new Error("Data: use DD/MM/AAAA.");
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const parsed = new Date(`${iso}T12:00:00Z`);
  if (
    Number(year) < 1900 ||
    Number(year) > 2100 ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== iso
  )
    throw new Error("Informe uma data válida entre 1900 e 2100.");
  return iso;
}
export const money = (value: number) =>
  (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const displayDate = (iso: string) => iso.split("-").reverse().join("/");
export function today() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
