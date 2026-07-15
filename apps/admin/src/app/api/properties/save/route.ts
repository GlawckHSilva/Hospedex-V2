import { NextResponse } from "next/server";

import {
  atualizarPropriedadeAction,
  criarPropriedadeAction,
  type ResultadoSalvarPropriedade,
} from "../../../../lib/properties/actions";

/**
 * Endpoint de salvamento final de Casas.
 *
 * A rota recebe multipart diretamente para evitar perda de arquivos no fluxo
 * de criação/edição. As regras multi-tenant continuam nas actions reutilizadas.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function contarArquivos(formData: FormData, chave: string) {
  return formData
    .getAll(chave)
    .filter((valor): valor is File => valor instanceof File && valor.size > 0)
    .length;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const operacaoId = formData.get("operacaoId")?.toString() ?? null;
    const propriedadeId = formData.get("propriedadeId")?.toString() ?? null;
    const quantidadeCapa = contarArquivos(formData, "imagemCapaArquivo");
    const quantidadeGaleria = contarArquivos(
      formData,
      "imagensGaleriaArquivos",
    );

    console.info("Salvamento final de casa recebido.", {
      galeriaIds: formData.getAll("galeriaArquivoIds").length,
      imagemCapaIds: formData.has("imagemCapaId") ? 1 : 0,
      modo: propriedadeId ? "editar" : "criar",
      operacaoId,
      propriedadeId,
      quantidadeCapa,
      quantidadeGaleria,
    });

    const resultado = formData.has("propriedadeId")
      ? await atualizarPropriedadeAction(formData)
      : await criarPropriedadeAction(formData);

    console.info("Salvamento final de casa concluido.", {
      modo: propriedadeId ? "editar" : "criar",
      operacaoId,
      propriedadeId: resultado.propriedadeId ?? propriedadeId,
      sucesso: resultado.sucesso,
    });

    return NextResponse.json(resultado);
  } catch (erro) {
    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Nao foi possivel salvar a casa.";
    console.error("Falha inesperada no endpoint de salvamento da casa.", {
      mensagemTecnica: mensagem,
    });

    const resultado: ResultadoSalvarPropriedade = {
      mensagem:
        "Nao foi possivel confirmar o salvamento da casa. Seus dados foram mantidos. Tente novamente.",
      sucesso: false,
    };

    return NextResponse.json(resultado, { status: 500 });
  }
}
