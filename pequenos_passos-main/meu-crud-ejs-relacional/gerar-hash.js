import bcrypt from 'bcrypt';

const cpf = '12345678901';
const senha = '123456';

async function gerarHash() {
    try {
        const cpfHash = await bcrypt.hash(cpf, 10);
        const senhaHash = await bcrypt.hash(senha, 10);

        console.log('Hash do CPF:', cpfHash);
        console.log('Hash da senha:', senhaHash);

    } catch (erro) {
        console.error('Erro ao gerar hash:', erro);
    }
}

gerarHash();