-- 1. TABELA DE USUÁRIOS (LOGIN)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(11) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL
);

-- 2. TABELA DE GRUPOS DE CLIENTES
CREATE TABLE IF NOT EXISTS grupos_clientes (
    id SERIAL PRIMARY KEY,
    nome_grupo VARCHAR(100) NOT NULL,
    descricao VARCHAR(255) NOT NULL
);

-- 3. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome_completo VARCHAR(100) NOT NULL,
    cpf VARCHAR(11) UNIQUE NOT NULL,
    email VARCHAR(100) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    grupo_id INTEGER REFERENCES grupos_clientes(id)
        ON DELETE RESTRICT
);

-- 4. INSERÇÃO DE GRUPOS INICIAIS
INSERT INTO grupos_clientes (nome_grupo, descricao)
VALUES
('Convênio Bronze', 'Atendimento por convênio básico'),
('Particular Especial', 'Atendimento particular'),
('Programa Neonatal', 'Atendimento neonatal'),
('Atendimento Social', 'Atendimento social');

-- 5. USUÁRIO ADMINISTRADOR
-- Substitua o valor da senha pelo hash gerado com bcrypt.
INSERT INTO usuarios (nome, cpf, senha)
VALUES (
    'Administrador',
    '12345678901',
    'COLE_AQUI_O_HASH_BCRYPT'
);