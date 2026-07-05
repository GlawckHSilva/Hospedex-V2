import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { normalizarVariavelAmbiente } from "../supabase/env";

/**
 * Criptografia simples para segredos por tenant.
 *
 * O objetivo e permitir que o proprietario configure credenciais dentro do
 * Hospedex sem expor access tokens no frontend ou em tabelas publicas. A chave
 * mestra fica apenas no servidor/Vercel.
 */

const ALGORITMO = "aes-256-gcm";
const PREFIXO = "hpx:v1";

export function criptografarSegredoTenant(valor: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITMO, obterChaveCriptografia(), iv);
  const ciphertext = Buffer.concat([cipher.update(valor, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    PREFIXO,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url")
  ].join(":");
}

export function descriptografarSegredoTenant(valorCriptografado: string): string {
  const [prefixo, versao, ivBase64, tagBase64, conteudoBase64] = valorCriptografado.split(":");
  if (`${prefixo}:${versao}` !== PREFIXO || !ivBase64 || !tagBase64 || !conteudoBase64) {
    throw new Error("Formato de segredo criptografado invalido.");
  }

  const decipher = createDecipheriv(
    ALGORITMO,
    obterChaveCriptografia(),
    Buffer.from(ivBase64, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagBase64, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(conteudoBase64, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function obterChaveCriptografia() {
  const secret = normalizarVariavelAmbiente(process.env.HOSPEDEX_CREDENTIALS_SECRET);
  if (!secret || secret.length < 32) {
    throw new Error(
      "HOSPEDEX_CREDENTIALS_SECRET precisa estar configurada no servidor com pelo menos 32 caracteres."
    );
  }

  return createHash("sha256").update(secret).digest();
}
