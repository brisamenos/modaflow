-- ==============================================
-- STOREOS - DATABASE SCHEMA (PostgreSQL / MySQL)
-- ==============================================
-- Este modelo relacional foi deduzido automaticamente com base nas 
-- mais de 240 operações do frontend refatorado.

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
    nome VARCHAR(255) NOT NULL,
    documento VARCHAR(50),      -- CPF/CNPJ
    celular VARCHAR(20),
    email VARCHAR(255),
    endereco TEXT,
    origem VARCHAR(100),        -- Como conheceu
    ativo BOOLEAN DEFAULT TRUE,
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
    codigo VARCHAR(100) UNIQUE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco_custo DECIMAL(10,2) DEFAULT 0.00,
    preco_venda DECIMAL(10,2) DEFAULT 0.00,
    categoria_id INT REFERENCES categorias(id),
    colecao_id INT REFERENCES colecoes(id),
    fornecedor_id INT REFERENCES fornecedores(id),
    grade_id INT REFERENCES grades(id),
    estoque_minimo INT DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE produto_grades (
    id SERIAL PRIMARY KEY,
    produto_id INT REFERENCES produtos(id) ON DELETE CASCADE,
    tamanho VARCHAR(50) NOT NULL,
    estoque INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(produto_id, tamanho)
);

CREATE TABLE vendas (
    id SERIAL PRIMARY KEY,
    cliente_id INT REFERENCES clientes(id),
    vendedor_id INT REFERENCES vendedores(id),
    total DECIMAL(10,2) NOT NULL,
    desconto DECIMAL(10,2) DEFAULT 0.00,
    forma_pagamento VARCHAR(50), -- dinheiro, pix, credito, debito, crediario
    status VARCHAR(50) DEFAULT 'concluida', -- concluida, cancelada
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
    status VARCHAR(50) DEFAULT 'aberto', -- aberto, quitado, atrasado
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crediario_parcelas (
    id SERIAL PRIMARY KEY,
    crediario_id INT REFERENCES crediario(id) ON DELETE CASCADE,
    valor DECIMAL(10,2) NOT NULL,
    vencimento DATE NOT NULL,
    data_pagamento DATE NULL,
    status VARCHAR(50) DEFAULT 'pendente', -- pendente, pago, atrasado
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE caixas (
    id SERIAL PRIMARY KEY,
    saldo_inicial DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'aberto', -- aberto, fechado
    data_fechamento TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE movimentos_caixa (
    id SERIAL PRIMARY KEY,
    caixa_id INT REFERENCES caixas(id),
    tipo VARCHAR(50), -- suprimento, sangria, venda
    descricao VARCHAR(255),
    valor DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE classificacoes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) -- despesa, receita
);

CREATE TABLE despesas (
    id SERIAL PRIMARY KEY,
    classificacao_id INT REFERENCES classificacoes(id),
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data_competencia DATE,
    vencimento DATE,
    data_pagamento DATE NULL,
    status VARCHAR(50) DEFAULT 'aberta', -- aberta, pago
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contas_pagar (
    id SERIAL PRIMARY KEY,
    fornecedor_id INT REFERENCES fornecedores(id),
    descricao VARCHAR(255),
    valor DECIMAL(10,2) NOT NULL,
    vencimento DATE,
    data_pagamento DATE NULL,
    status VARCHAR(50) DEFAULT 'aberta', -- aberta, pago
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
    status VARCHAR(50) DEFAULT 'pendente', -- pendente, pago
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE metas (
    id SERIAL PRIMARY KEY,
    vendedor_id INT REFERENCES vendedores(id),
    mes VARCHAR(7), -- YYYY-MM
    meta_valor DECIMAL(10,2) NOT NULL,
    atingido DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bags (
    id SERIAL PRIMARY KEY,
    cliente_id INT REFERENCES clientes(id),
    vendedor_id INT REFERENCES vendedores(id),
    total DECIMAL(10,2) NOT NULL,
    data_retorno DATE NULL,
    status VARCHAR(50) DEFAULT 'aberta', -- aberta, efetivada, devolvida
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
    status VARCHAR(50) DEFAULT 'pendente', -- pendente, concluida
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
