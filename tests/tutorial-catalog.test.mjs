import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const catalogo = JSON.parse(
  await readFile(new URL("../apps/admin/src/lib/tutorials/catalog.json", import.meta.url), "utf8"),
);

test("catálogo possui chaves e etapas estáveis", () => {
  assert.equal(catalogo.length, 14);
  assert.equal(new Set(catalogo.map((tutorial) => tutorial.key)).size, catalogo.length);

  for (const tutorial of catalogo) {
    assert.ok(tutorial.version >= 1);
    assert.ok(tutorial.route.startsWith("/"));
    assert.ok(tutorial.steps.length > 0);
    assert.equal(new Set(tutorial.steps.map((etapa) => etapa.id)).size, tutorial.steps.length);
    for (const etapa of tutorial.steps) {
      assert.ok(etapa.targetId);
      assert.ok(etapa.route.startsWith("/"));
      assert.ok(etapa.title);
      assert.ok(etapa.content);
    }
  }
});

test("apresentação inicial permanece curta", () => {
  const onboarding = catalogo.find((tutorial) => tutorial.key === "onboarding:initial");
  assert.ok(onboarding);
  assert.equal(onboarding.kind, "onboarding");
  assert.ok(onboarding.steps.length <= 5);
});

test("módulos obrigatórios possuem tutorial", () => {
  const obrigatorios = [
    "dashboard",
    "properties",
    "reservations",
    "calendar",
    "guests",
    "finance",
    "cleaning",
    "extra-services",
    "reports",
    "team",
    "integrations",
    "marketplace",
    "settings",
  ];
  const chaves = new Set(catalogo.map((tutorial) => tutorial.key));
  obrigatorios.forEach((chave) => assert.ok(chaves.has(chave), `Tutorial ausente: ${chave}`));
});
