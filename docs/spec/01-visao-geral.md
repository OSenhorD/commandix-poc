# 1. Visão geral

[← Índice](./README.md)

## Objetivo

Desenvolver um módulo de **gestão de integrações multi-tenant**: cada empresa cliente (tenant) cadastra integrações com serviços externos (webhooks, APIs REST, n8n), configura credenciais e headers, dispara execuções manualmente e consulta o histórico.

## Foco da avaliação

| Prioridade | Área |
|------------|------|
| **Alto** | Arquitetura backend, modelagem PostgreSQL, multi-tenancy, NestJS |
| **Médio** | Histórico de execuções, README com decisões |
| **Baixo** | Beleza do frontend (mínimo funcional basta) |
| **Bônus** | n8n, testes unitários/E2E |

## Entregáveis obrigatórios

- API NestJS funcional com autenticação JWT e isolamento por tenant
- Frontend React com **fluxo completo** (login, integrações, histórico — cadastros e ações na UI)
- `docker compose up` sobe API + frontend + PostgreSQL
- `.env.example` documentado
- README com setup, seed, decisões técnicas e pontos em aberto
