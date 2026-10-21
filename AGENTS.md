Project Rules

1. Always read /docs before modifying architecture.
2. Never trust businessId from client input.
3. Every tenant-owned query must use TenantContext.
4. Controllers must remain thin.
5. Business logic belongs in services/use cases.
6. Financial calculations must happen on backend.
7. Never use floating point for money.
8. Every inventory change must create a stock movement.
9. Critical operations must use database transactions.
10. Do not introduce microservices.
11. Do not add dependencies without explaining why.
12. Add tests for business-critical code.
13. Never modify unrelated modules without a clear reason.
14. Keep TypeScript strict.
15. Before coding, inspect existing patterns and follow them.