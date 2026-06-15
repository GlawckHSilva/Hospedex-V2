import type { PropriedadePublica } from "../../lib/marketplace/data";

export type PropertyGalleryProps = {
  property: PropriedadePublica;
};

export function PropertyGallery({ property }: PropertyGalleryProps) {
  const imagens = property.images.slice(0, 5);

  if (!imagens.length) {
    return (
      <div className="glass-panel grid min-h-[340px] place-items-center bg-[linear-gradient(135deg,var(--secondary),var(--accent))] p-8 text-center">
        <div>
          <p className="text-sm font-semibold text-accent-foreground">
            Fotos em preparação
          </p>
          <p className="mt-2 max-w-sm text-sm text-accent-foreground/75">
            As imagens públicas desta hospedagem aparecerão aqui assim que forem
            publicadas pelo proprietário.
          </p>
        </div>
      </div>
    );
  }

  const capa = imagens[0];
  const miniaturas = imagens.slice(1);

  if (!capa) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
      <figure className="glass-card relative min-h-[340px] overflow-hidden bg-secondary lg:min-h-[520px]">
        <img
          alt={capa.alt}
          className="h-full w-full object-cover"
          fetchPriority="high"
          src={capa.url}
        />
      </figure>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
        {miniaturas.length ? (
          miniaturas.slice(0, 4).map((imagem) => (
            <figure
              className="glass-card min-h-[150px] overflow-hidden bg-secondary lg:min-h-0"
              key={imagem.id}
            >
              <img
                alt={imagem.alt}
                className="h-full w-full object-cover"
                loading="lazy"
                src={imagem.url}
              />
            </figure>
          ))
        ) : (
          <div className="glass-card grid min-h-[150px] place-items-center p-5 text-center text-sm text-muted-foreground lg:min-h-full">
            Mais fotos serão exibidas aqui.
          </div>
        )}
      </div>
    </div>
  );
}
