-- ==============================================
-- STOREOS - DATABASE SCHEMA (PostgreSQL / MySQL)
-- ==============================================

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE colecoes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE grades (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    valores JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    codigo_externo VARCHAR(50),          -- col 1: ID do sistema de origem
    nome VARCHAR(255) NOT NULL,          -- col 3
    nome_abreviado VARCHAR(255),         -- col 4
    celular VARCHAR(20),                 -- col 5
    sexo VARCHAR(5),                     -- col 6
    dia_nascimento INT,                  -- col 7 (CSV salva dia separado)
    mes_nascimento INT,                  -- col 8 (CSV salva mês separado)
    data_nascimento DATE,                -- data completa quando disponível
    email VARCHAR(255),                  -- col 9
    instagram VARCHAR(255),              -- col 10
    ativo BOOLEAN DEFAULT TRUE,          -- col 11: S=true / N=false
    cpf VARCHAR(50),                     -- col 13
    cep VARCHAR(20),                     -- col 14
    logradouro VARCHAR(255),             -- col 15
    numero VARCHAR(50),                  -- col 16
    complemento VARCHAR(255),            -- col 17
    bairro VARCHAR(255),                 -- col 18
    estado VARCHAR(5),                   -- col 19
    cidade VARCHAR(255),                 -- col 20
    -- campos adicionais não presentes no CSV mas usados pelo sistema
    nome_abreviado_2 VARCHAR(255),
    documento VARCHAR(50),
    rg VARCHAR(50),
    ie VARCHAR(50),
    como_conheceu VARCHAR(255),
    tipo_pessoa VARCHAR(10) DEFAULT 'PF',
    origem VARCHAR(100),
    observacoes TEXT,
    endereco TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE como_conheceu (
    id SERIAL PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cliente_filhos (
    id SERIAL PRIMARY KEY,
    cliente_id INT REFERENCES clientes(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    nome_abreviado VARCHAR(255),
    sexo VARCHAR(5),
    data_nascimento DATE,
    grade_id INT,
    grade_nome VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contas_receber (
    id SERIAL PRIMARY KEY,
    cliente_id INT REFERENCES clientes(id),
    descricao VARCHAR(255),
    valor DECIMAL(10,2) NOT NULL,
    vencimento DATE,
    data_pagamento DATE NULL,
    status VARCHAR(50) DEFAULT 'aberta',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agenda (
    id SERIAL PRIMARY KEY,
    cliente_id INT REFERENCES clientes(id),
    titulo VARCHAR(255),
    descricao TEXT,
    data DATE,
    hora VARCHAR(10),
    concluido BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendedores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    comissao_percentual DECIMAL(5,2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fornecedores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    documento VARCHAR(50),
    email VARCHAR(255),
    telefone VARCHAR(20),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(100) UNIQUE,          -- Cód. Produto
    nome VARCHAR(255) NOT NULL,          -- Descrição Produto
    descricao TEXT,
    preco_custo DECIMAL(10,2) DEFAULT 0.00,   -- Preço Custo
    preco_venda DECIMAL(10,2) DEFAULT 0.00,   -- Preço Venda
    categoria_id INT REFERENCES categorias(id),
    colecao_id INT REFERENCES colecoes(id),
    fornecedor_id INT REFERENCES fornecedores(id),
    fornecedor_cnpj VARCHAR(50),         -- CNPJ Fornecedor (raw do CSV para mapeamento)
    grade_id INT REFERENCES grades(id),
    estoque_minimo INT DEFAULT 0,
    sku TEXT,                            -- SKU
    marca TEXT,                          -- Marca
    genero TEXT,                         -- Genero: F, M, U, J
    unidade TEXT DEFAULT 'UN',           -- UN
    ncm TEXT,                            -- NCM
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE produto_grades (
    id SERIAL PRIMARY KEY,
    produto_id INT REFERENCES produtos(id) ON DELETE CASCADE,
    tamanho VARCHAR(50) NOT NULL,        -- Tam - Grade
    estoque INT DEFAULT 0,               -- Qtde
    ean TEXT,                            -- Cód. de Barras EAN
    cor_hexa TEXT,                       -- Cor - Hexa
    cor_descricao TEXT,                  -- Cor - Descrição
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(produto_id, tamanho, ean)     -- EAN único por variante
);

CREATE TABLE vendas (
    id SERIAL PRIMARY KEY,
    numero_venda INT,
    cliente_id INT REFERENCES clientes(id),
    vendedor_id INT REFERENCES vendedores(id),
    total DECIMAL(10,2) NOT NULL,
    desconto DECIMAL(10,2) DEFAULT 0.00,
    forma_pagamento VARCHAR(50),
    status VARCHAR(50) DEFAULT 'concluida',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE venda_itens (
    id SERIAL PRIMARY KEY,
    venda_id INT REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id INT REFERENCES produtos(id),
    produto_nome VARCHAR(255),
    tamanho VARCHAR(50),
    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crediario (
    id SERIAL PRIMARY KEY,
    venda_id INT REFERENCES vendas(id),
    cliente_id INT REFERENCES clientes(id),
    total DECIMAL(10,2) NOT NULL,
    saldo_devedor DECIMAL(10,2) DEFAULT 0.00,
    num_parcelas INT DEFAULT 1,
    parcelas_pagas INT DEFAULT 0,
    valor_parcela DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'aberto',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crediario_parcelas (
    id SERIAL PRIMARY KEY,
    crediario_id INT REFERENCES crediario(id) ON DELETE CASCADE,
    numero_parcela INT DEFAULT 1,
    valor DECIMAL(10,2) NOT NULL,
    valor_pago DECIMAL(10,2),
    vencimento DATE NOT NULL,
    data_pagamento DATE NULL,
    status VARCHAR(50) DEFAULT 'pendente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE caixas (
    id SERIAL PRIMARY KEY,
    saldo_inicial DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'aberto',
    data_fechamento TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE movimentos_caixa (
    id SERIAL PRIMARY KEY,
    caixa_id INT REFERENCES caixas(id),
    tipo VARCHAR(50),
    descricao VARCHAR(255),
    valor DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE classificacoes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50)
);

CREATE TABLE despesas (
    id SERIAL PRIMARY KEY,
    classificacao_id INT REFERENCES classificacoes(id),
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data_competencia DATE,
    vencimento DATE,
    data_pagamento DATE NULL,
    status VARCHAR(50) DEFAULT 'aberta',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contas_pagar (
    id SERIAL PRIMARY KEY,
    fornecedor_id INT REFERENCES fornecedores(id),
    descricao VARCHAR(255),
    valor DECIMAL(10,2) NOT NULL,
    vencimento DATE,
    data_pagamento DATE NULL,
    status VARCHAR(50) DEFAULT 'aberta',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notas_fiscais (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(100),
    chave VARCHAR(100),
    fornecedor_id INT REFERENCES fornecedores(id),
    valor DECIMAL(10,2) NOT NULL,
    data_emissao DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE duplicatas (
    id SERIAL PRIMARY KEY,
    nota_id INT REFERENCES notas_fiscais(id) ON DELETE CASCADE,
    valor DECIMAL(10,2) NOT NULL,
    vencimento DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pendente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE metas_vendas (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) DEFAULT 'loja',
    vendedor_id INT REFERENCES vendedores(id),
    mes INT,
    ano INT,
    valor_meta DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bags (
    id SERIAL PRIMARY KEY,
    cliente_id INT REFERENCES clientes(id),
    vendedor_id INT REFERENCES vendedores(id),
    total DECIMAL(10,2) NOT NULL,
    data_retorno DATE NULL,
    status VARCHAR(50) DEFAULT 'aberta',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bag_itens (
    id SERIAL PRIMARY KEY,
    bag_id INT REFERENCES bags(id) ON DELETE CASCADE,
    produto_id INT REFERENCES produtos(id),
    produto_nome VARCHAR(255),
    tamanho VARCHAR(50),
    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trocas (
    id SERIAL PRIMARY KEY,
    venda_id INT REFERENCES vendas(id),
    cliente_id INT REFERENCES clientes(id),
    produto_id INT REFERENCES produtos(id),
    motivo TEXT,
    status VARCHAR(50) DEFAULT 'pendente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agenda_tarefas (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_tarefa DATE,
    concluida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE changelog (
    id SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL,
    data_lancamento DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE configuracoes (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(255) UNIQUE NOT NULL,
    valor TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contas_bancarias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    banco VARCHAR(255),
    agencia VARCHAR(50),
    conta VARCHAR(50),
    saldo DECIMAL(10,2) DEFAULT 0.00,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
