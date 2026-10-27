# Modelo de dados

O GitHub desenha o diagrama abaixo automaticamente (é Mermaid).

```mermaid
erDiagram
    USUARIOS ||--o{ ORDENS_SERVICO : "abre"
    CLIENTES ||--o{ VEICULOS : "possui"
    VEICULOS ||--o{ ORDENS_SERVICO : "recebe"
    ORDENS_SERVICO ||--|{ ITENS_OS : "contém"

    USUARIOS {
        int id PK
        text nome
        text email UK
        text senha_hash
        enum papel "gerente | atendente"
    }
    CLIENTES {
        int id PK
        text nome
        text telefone
        text email
        text documento "CPF ou CNPJ"
        text observacoes
    }
    VEICULOS {
        int id PK
        int cliente_id FK
        text placa UK
        text marca
        text modelo
        int ano
    }
    ORDENS_SERVICO {
        int id PK "também é o número da OS"
        int veiculo_id FK
        int criado_por_id FK
        enum status "aberta | em_andamento | pronta | entregue"
        text descricao_problema
        int km_entrada
        int total_centavos
        timestamp aberta_em
        timestamp entregue_em
    }
    CATALOGO_VEICULOS {
        int id PK
        text marca
        text modelo
        int ano
    }
    ITENS_OS {
        int id PK
        int ordem_id FK
        enum tipo "peca | servico"
        text descricao
        numeric quantidade
        int valor_unitario_centavos
    }
```

## Como explicar em voz alta

- **Um cliente tem vários veículos** (1:N). Por isso a chave estrangeira
  `cliente_id` fica na tabela de **veículos**, o lado "muitos".
- **Um veículo tem várias ordens de serviço** ao longo do tempo (1:N). A OS
  aponta para o veículo, não para o cliente. O cliente é descoberto pelo veículo,
  e assim não existe risco de a OS dizer um dono e o veículo dizer outro.
- **Uma OS tem vários itens** (peças e serviços). Cada item tem quantidade e
  valor unitário. O total da OS é a soma de `quantidade × valor_unitario`.
- **Cada OS guarda quem abriu** (`criado_por_id`, ligado a usuários).

## Decisões importantes

| Decisão | Por quê |
|---|---|
| Dinheiro em **centavos** (inteiro) | Números com vírgula no computador têm erro de arredondamento (`0.1 + 0.2 = 0.30000000000000004`). Em centavos, R$ 12,50 vira `1250` e a conta é exata. |
| `total_centavos` **guardado** na OS | Poderia ser calculado sempre a partir dos itens, mas guardar deixa as listas e o painel rápidos. Ele é recalculado **no servidor**, dentro de uma transação, toda vez que os itens mudam. |
| Status como **enum** | O banco só aceita os 4 valores válidos. Um erro de digitação como "pronto" é barrado pelo próprio PostgreSQL. |
| Excluir com **restrict** | Não dá para excluir um cliente que tem veículos, nem um veículo que tem OS. Isso protege o histórico da oficina. Os itens são apagados junto com a OS (**cascade**), porque não fazem sentido sozinhos. |
| **Catálogo** de marca/modelo/ano separado | Alimenta as sugestões do formulário de veículo e continua existindo mesmo se o veículo for excluído. O índice único usa `lower()`, então "Scania" e "SCANIA" contam como a mesma marca, e o veículo é gravado com a grafia que já existia. |
| Placa **única** | Duas fichas para o mesmo caminhão causariam confusão no histórico. |

## Fluxo de status da OS

```mermaid
stateDiagram-v2
    [*] --> aberta
    aberta --> em_andamento
    em_andamento --> pronta
    pronta --> entregue
    em_andamento --> aberta : voltar
    pronta --> em_andamento : voltar
    entregue --> [*]
```

- A OS anda **uma etapa por vez** e pode voltar uma etapa, por exemplo quando
  o cliente reclama antes de buscar o veículo.
- **Entregue é final**: não volta mais.
- Os itens só podem ser alterados com a OS **aberta** ou **em andamento**.

As regras estão em `src/lib/regras-os.ts` e têm testes em
`src/lib/regras-os.test.ts`.
