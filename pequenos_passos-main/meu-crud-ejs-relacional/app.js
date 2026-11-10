import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

import pool from './db.js';
import { verificarAutenticacao } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configuração EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Leitura dos formulários
app.use(express.urlencoded({ extended: true }));

// Configuração de sessão
app.use(session({
    secret: 'pequenos_passos_saep',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }
}));

// ======================================
// LOGIN
// ======================================

app.get('/login', (req, res) => {
    res.render('login', { erro: null });
});

app.post('/login', async (req, res) => {

    const { cpf, senha } = req.body;

    try {

        const resultado = await pool.query(
            'SELECT * FROM usuarios'
        );

        let usuarioEncontrado = null;

        for (const usuario of resultado.rows) {

            const cpfValido = await bcrypt.compare(
                cpf,
                usuario.cpf
            );

            if (cpfValido) {
                usuarioEncontrado = usuario;
                break;
            }
        }

        if (!usuarioEncontrado) {
            return res.render('login', {
                erro: 'CPF não encontrado.'
            });
        }

        const senhaValida = await bcrypt.compare(
            senha,
            usuarioEncontrado.senha
        );

        if (!senhaValida) {
            return res.render('login', {
                erro: 'Senha incorreta.'
            });
        }

        req.session.usuario = {
            id: usuarioEncontrado.id,
            nome: usuarioEncontrado.nome
        };

        res.redirect('/clientes');

    } catch (err) {

        console.error(err);

        res.status(500).send('Erro ao realizar login.');
    }
});

// LOGOUT
app.get('/logout', (req, res) => {

    req.session.destroy(() => {
        res.redirect('/login');
    });

});

// ======================================
// CRUD DE GRUPOS
// ======================================

// LISTAR GRUPOS
app.get('/grupos', verificarAutenticacao, async (req, res) => {

    try {

        const resultado = await pool.query(
            'SELECT * FROM grupos_clientes ORDER BY id ASC'
        );

        res.render('grupos', {
            grupos: resultado.rows,
            usuario: req.session.usuario
        });

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao buscar grupos.');

    }

});

// FORMULÁRIO NOVO GRUPO
app.get('/grupos/novo', verificarAutenticacao, (req, res) => {

    res.render('novo-grupo');

});

// CADASTRAR GRUPO
app.post('/grupos/novo', verificarAutenticacao, async (req, res) => {

    const { nome_grupo, descricao } = req.body;

    try {

        await pool.query(
            'INSERT INTO grupos_clientes (nome_grupo, descricao) VALUES ($1, $2)',
            [nome_grupo, descricao]
        );

        res.redirect('/grupos');

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao cadastrar grupo.');

    }

});

// FORMULÁRIO EDITAR GRUPO
app.get('/grupos/editar/:id', verificarAutenticacao, async (req, res) => {

    const { id } = req.params;

    try {

        const resultado = await pool.query(
            'SELECT * FROM grupos_clientes WHERE id = $1',
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).send('Grupo não encontrado.');
        }

        res.render('editar-grupo', {
            grupo: resultado.rows[0]
        });

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao buscar grupo.');

    }

});

// ATUALIZAR GRUPO
app.post('/grupos/editar/:id', verificarAutenticacao, async (req, res) => {

    const { id } = req.params;
    const { nome_grupo, descricao } = req.body;

    try {

        await pool.query(
            'UPDATE grupos_clientes SET nome_grupo = $1, descricao = $2 WHERE id = $3',
            [nome_grupo, descricao, id]
        );

        res.redirect('/grupos');

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao atualizar grupo.');

    }

});

// EXCLUIR GRUPO
app.get('/grupos/deletar/:id', verificarAutenticacao, async (req, res) => {

    const { id } = req.params;

    try {

        await pool.query(
            'DELETE FROM grupos_clientes WHERE id = $1',
            [id]
        );

        res.redirect('/grupos');

    } catch (err) {

        console.error(err);

        res.status(409).send(
            'Não é possível excluir um grupo que possui clientes vinculados.'
        );

    }

});

// ======================================
// CRUD DE CLIENTES
// ======================================

// LISTAR CLIENTES COM LEFT JOIN E BUSCA
app.get('/clientes', verificarAutenticacao, async (req, res) => {

    const busca = req.query.busca || '';

    try {

        let querySql = `
            SELECT
                c.id,
                c.nome_completo,
                c.cpf,
                c.email,
                c.telefone,
                c.grupo_id,
                g.nome_grupo
            FROM clientes c
            LEFT JOIN grupos_clientes g
            ON c.grupo_id = g.id
            ORDER BY c.id DESC
        `;

        let params = [];

        if (busca) {

            querySql = `
                SELECT
                    c.id,
                    c.nome_completo,
                    c.cpf,
                    c.email,
                    c.telefone,
                    c.grupo_id,
                    g.nome_grupo
                FROM clientes c
                LEFT JOIN grupos_clientes g
                ON c.grupo_id = g.id
                WHERE c.nome_completo ILIKE $1
                ORDER BY c.id DESC
            `;

            params = [`%${busca}%`];
        }

        const resultado = await pool.query(querySql, params);

        res.render('clientes', {
            clientes: resultado.rows,
            usuario: req.session.usuario,
            busca: busca
        });

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao buscar clientes.');

    }

});

// FORMULÁRIO NOVO CLIENTE
app.get('/clientes/novo', verificarAutenticacao, async (req, res) => {

    try {

        const grupos = await pool.query(
            'SELECT * FROM grupos_clientes ORDER BY nome_grupo ASC'
        );

        res.render('novo-cliente', {
            grupos: grupos.rows
        });

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao carregar formulário.');

    }

});

// CADASTRAR CLIENTE
app.post('/clientes/novo', verificarAutenticacao, async (req, res) => {

    const {
        nome_completo,
        cpf,
        email,
        telefone,
        grupo_id
    } = req.body;

    try {

        await pool.query(
            `INSERT INTO clientes
            (nome_completo, cpf, email, telefone, grupo_id)
            VALUES ($1, $2, $3, $4, $5)`,
            [nome_completo, cpf, email, telefone, grupo_id]
        );

        res.redirect('/clientes');

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao cadastrar cliente. Verifique se o CPF já existe.');

    }

});

// FORMULÁRIO EDITAR CLIENTE
app.get('/clientes/editar/:id', verificarAutenticacao, async (req, res) => {

    const { id } = req.params;

    try {

        const cliente = await pool.query(
            'SELECT * FROM clientes WHERE id = $1',
            [id]
        );

        const grupos = await pool.query(
            'SELECT * FROM grupos_clientes ORDER BY nome_grupo ASC'
        );

        if (cliente.rows.length === 0) {
            return res.status(404).send('Cliente não encontrado.');
        }

        res.render('editar-cliente', {
            cliente: cliente.rows[0],
            grupos: grupos.rows
        });

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao carregar edição.');

    }

});

// ATUALIZAR CLIENTE
app.post('/clientes/editar/:id', verificarAutenticacao, async (req, res) => {

    const { id } = req.params;

    const {
        nome_completo,
        cpf,
        email,
        telefone,
        grupo_id
    } = req.body;

    try {

        await pool.query(
            `UPDATE clientes
            SET nome_completo = $1,
                cpf = $2,
                email = $3,
                telefone = $4,
                grupo_id = $5
            WHERE id = $6`,
            [nome_completo, cpf, email, telefone, grupo_id, id]
        );

        res.redirect('/clientes');

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao atualizar cliente.');

    }

});

// EXCLUIR CLIENTE
app.get('/clientes/deletar/:id', verificarAutenticacao, async (req, res) => {

    const { id } = req.params;

    try {

        await pool.query(
            'DELETE FROM clientes WHERE id = $1',
            [id]
        );

        res.redirect('/clientes');

    } catch (err) {

        console.error(err);
        res.status(500).send('Erro ao excluir cliente.');

    }

});

// ROTA INICIAL
app.get('/', (req, res) => {
    res.redirect('/login');
});

// INICIAR SERVIDOR
app.listen(3000, () => {
    console.log('Sistema Pequenos Passos rodando em http://localhost:3000');
});