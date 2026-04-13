import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
const crypto = require('crypto');

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

const LSEE_EXCEPTION_IP = '143.107.235.10';

// A única sala de reunião - essa constante não é mais necessária, mas pode ser mantida
const SALA_REUNIAO = 'Sala de Reunião Única';

async function autoDeleteOldReservations() {
    console.log("Executando limpeza de agendamentos antigos...");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().split('T')[0];
    const deleteQuery = `
        DELETE FROM agendamentos_sala_reuniao
        WHERE data_inicio < ?;
    `;

    try {
        const [result] = await pool.execute(deleteQuery, [yesterdayISO]);
        console.log(`Limpeza concluída. ${result.affectedRows} agendamento(s) antigo(s) excluído(s).`);
    } catch (error) {
        console.error("ERRO: Falha ao executar a limpeza de agendamentos antigos.", error);
    }
}

async function initializeDatabase() {
    console.log("Tentando inicializar o banco de dados e criar a tabela 'agendamentos_sala_reuniao'...");
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS agendamentos_sala_reuniao (
            id INT AUTO_INCREMENT PRIMARY KEY,
            data_inicio DATE NOT NULL,
            hora_inicial TIME NOT NULL,
            hora_final TIME NOT NULL,
            agendado_por VARCHAR(100) NOT NULL,
            pin VARCHAR(32) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;

    try {
        await pool.execute(createTableQuery);
        console.log("Tabela 'agendamentos_sala_reuniao' verificada/criada com sucesso.");
    } catch (error) {
        console.error("ERRO CRÍTICO: Falha ao inicializar a tabela agendamentos_sala_reuniao.", error);
    }
}

initializeDatabase();

function checkDbConnection() {
    if (!process.env.MYSQL_HOST) {
        return NextResponse.json(
            { error: 'Serviço indisponível. Variáveis de ambiente do MySQL não configuradas.' },
            { status: 503 }
        );
    }
    return null;
}

export async function POST(request) {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError;

    try {
        const { data_inicio, hora_inicial, hora_final, agendado_por, pin, codigo_lsee } = await request.json();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const requestDate = new Date(data_inicio + 'T00:00:00');
        requestDate.setHours(0, 0, 0, 0);

        if (requestDate < today) {
            return NextResponse.json(
                { error: 'Não é possível agendar para uma data que já passou.' },
                { status: 400 }
            );
        }

        const clientIP = request.headers.get('x-forwarded-for') || request.ip;
        let isPinRequired = true;

        if (clientIP === LSEE_EXCEPTION_IP) {
            isPinRequired = false;
        }

        if (!data_inicio || !hora_inicial || !hora_final || !agendado_por || (isPinRequired && !pin)) {
            return NextResponse.json({ error: 'Dados incompletos. Todos os campos são obrigatórios.' }, { status: 400 });
        }

        // Validação robusta de hora/minuto
        function horaValida(hora) {
            if (!hora || typeof hora !== 'string') return false;
            const partes = hora.split(':');
            if (partes.length !== 2) return false;
            const h = Number(partes[0]);
            const m = Number(partes[1]);
            return (
                Number.isInteger(h) && Number.isInteger(m) &&
                h >= 0 && h <= 23 &&
                m >= 0 && m <= 59
            );
        }
        if (!horaValida(hora_inicial) || !horaValida(hora_final)) {
            return NextResponse.json(
                { error: 'Horário inválido. Hora deve ser entre 00:00 e 23:59.' },
                { status: 400 }
            );
        }

        const inicioReserva = new Date(`${data_inicio}T${hora_inicial}`);
        const fimReserva = new Date(`${data_inicio}T${hora_final}`);

        if (fimReserva <= inicioReserva) {
            return NextResponse.json(
                { error: 'A hora final deve ser após a hora inicial.' },
                { status: 400 }
            );
        }

        const conflictQuery = `
            SELECT id, data_inicio, hora_inicial, hora_final, agendado_por
            FROM agendamentos_sala_reuniao
            WHERE
                data_inicio = ? AND
                ( (hora_inicial < ? AND hora_final > ?) OR (hora_inicial = ? AND hora_final = ?) );
        `;

        const [conflicts] = await pool.execute(conflictQuery, [data_inicio, hora_final, hora_inicial, hora_inicial, hora_final]);

        if (conflicts.length > 0) {
            const conflito = conflicts[0];
            return NextResponse.json({
                error: 'CONFLITO DE AGENDAMENTO',
                message: `A sala de reunião já está reservada das ${conflito.hora_inicial} às ${conflito.hora_final} neste dia.`,
                conflito: {
                    agendado_por: conflito.agendado_por,
                    data_inicio: conflito.data_inicio,
                    hora_inicial: conflito.hora_inicial,
                    hora_final: conflito.hora_final
                }
            }, { status: 409 });
        }

        let hashedPin = '';
        if (pin) {
            hashedPin = crypto.createHash('md5').update(pin).digest('hex');
        }

        const insertQuery = `
            INSERT INTO agendamentos_sala_reuniao (
                data_inicio,
                hora_inicial,
                hora_final,
                agendado_por,
                pin
            ) VALUES (?, ?, ?, ?, ?);
        `;

        const [result] = await pool.execute(insertQuery, [data_inicio, hora_inicial, hora_final, agendado_por, hashedPin]);

        return NextResponse.json({
            message: 'Agendamento criado com sucesso!',
            id: result.insertId
        }, { status: 201 });

    } catch (error) {
        console.error('Erro ao processar agendamento (POST):', error);
        return NextResponse.json({ error: 'Erro de infraestrutura ao salvar o agendamento.' }, { status: 503 });
    }
}

export async function GET(request) {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError;

    try {
        const today = new Date().toISOString().split('T')[0];

        const [agendamentos] = await pool.execute(
            `SELECT
                 id,
                 DATE_FORMAT(data_inicio, '%Y-%m-%d') AS data_inicio,
                 hora_inicial,
                 hora_final,
                 agendado_por
             FROM agendamentos_sala_reuniao
             WHERE data_inicio >= ?
             ORDER BY data_inicio ASC, hora_inicial ASC;`,
            [today]
        );

        return NextResponse.json(agendamentos, { status: 200 });

    } catch (error) {
        console.error('Erro ao buscar agendamentos (GET):', error);
        return NextResponse.json({ error: 'Erro de infraestrutura ao carregar a lista de agendamentos.' }, { status: 503 });
    }
}

export async function DELETE(request) {
    const connectionError = checkDbConnection();
    if (connectionError) return connectionError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const { pinDigitado } = await request.json();

        if (!id || !pinDigitado) {
            return NextResponse.json({ error: 'ID e PIN de liberação são obrigatórios.' }, { status: 400 });
        }

        const hashedPinDigitado = crypto.createHash('md5').update(pinDigitado).digest('hex');

        const deleteQuery = 'DELETE FROM agendamentos_sala_reuniao WHERE id = ? AND pin = ?';
        const queryParams = [id, hashedPinDigitado];

        const [deleteResult] = await pool.execute(deleteQuery, queryParams);

        if (deleteResult.affectedRows === 0) {
            return NextResponse.json({ error: 'PIN ou ID do agendamento incorreto. Cancelamento não autorizado.' }, { status: 403 });
        }

        return NextResponse.json({ message: 'Agendamento cancelado com sucesso.' }, { status: 200 });

    } catch (error) {
        console.error('Erro ao processar cancelamento (DELETE):', error);
        return NextResponse.json({ error: 'Erro de infraestrutura ao cancelar o agendamento.' }, { status: 503 });
    }
}