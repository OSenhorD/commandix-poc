# docs/todo/

Fila viva de features, erros e refactors. Um arquivo por item, separado por lado:

```
docs/todo/<frontend|backend>/<slug>.md
```

Não criar arquivo solto em `docs/todo/`. Não criar `todo/` na raiz do repo.

## Ciclo de vida

1. **Criar** o arquivo quando surgir uma feature, erro ou refactor (incluindo o que aparecer no meio de outra entrega e não bloquear agora).
2. **Entregar** o item.
3. **Fechar:** marcar o item correspondente em [`docs/spec/11-checklist.md`](../spec/11-checklist.md) (se houver) e **apagar este arquivo**. Item concluído não fica no disco — a fila só tem o que ainda falta.

O mesmo vale para briefs de entrega em [`docs/plans/frontend/`](../plans/frontend/): ao concluir F0x, marcar o checklist, atualizar o [índice](../plans/frontend.md) (mover para "já entregue" e tirar a linha da tabela) e **apagar** `docs/plans/frontend/fXX-*.md`. Se a entrega absorveu um todo, apagar o todo também.

## Formato

```markdown
# <título curto>

**Lado:** frontend | backend
**Tipo:** feature | erro | refactor
**Contexto:** onde/quando foi percebido (entrega, arquivo, linha)
**Descrição:** o que é o problema ou a melhoria
**Impacto:** por que importa (dívida técnica, risco, custo de manutenção)
**Sugestão:** encaminhamento proposto, se houver
```

## Quando criar

- Feature, erro ou refactor **novo** — sempre neste diretório, nunca só num comentário ou no chat.
- Durante qualquer tarefa, ao perceber algo fora do escopo da entrega atual: duplicação, acoplamento, gap de teste, decisão discutível, débito técnico.
- Bugs bloqueantes da tarefa em andamento se corrigem na hora — não viram todo.

Ver [`AGENTS.md`](../../AGENTS.md) § Fluxo de trabalho sugerido para IA.
