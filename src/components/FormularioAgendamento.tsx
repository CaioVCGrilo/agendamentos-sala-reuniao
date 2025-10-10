import path from 'path';
import React, { useState, useEffect } from 'react';
import './Formulario.css';

// Defina a interface para a estrutura de dados da reserva
interface ReservationData {
    dataInicial: string;
    diasNecessarios: string;
    pc: string;
    nome: string;
    pin: string;
    codigo_lsee?: string; // O '?' indica que este campo é opcional
}

// Função para formatar a data de hoje para o formato YYYY-MM-DD
const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Lista de todos os PCs no laboratório (MESMA LISTA DO BACKEND)
const TODOS_PCS = ['PC 082', 'PC 083', 'PC 094', 'PC 095'];

interface FormularioAgendamentoProps {
    onAgendamentoSucesso: () => void;
}

export default function FormularioAgendamento({ onAgendamentoSucesso }: FormularioAgendamentoProps) {
    const [dataInicial, setDataInicial] = useState(getTodayDate());
    const [diasNecessarios, setDiasNecessarios] = useState('1');
    const [pc, setPc] = useState('');
    const [nome, setNome] = useState('');
    const [pin, setPin] = useState('');

    const [pcsDisponiveis, setPcsDisponiveis] = useState<string[]>(TODOS_PCS);
    const [loadingDisponibilidade, setLoadingDisponibilidade] = useState(false);

    useEffect(() => {
        const fetchDisponibilidade = async () => {
            if (!dataInicial || diasNecessarios === '0' || !diasNecessarios || parseInt(diasNecessarios) > 15) {
                setPcsDisponiveis(TODOS_PCS);
                return;
            }

            setLoadingDisponibilidade(true);
            try {
                const response = await fetch(`/api/agendamentos?dataInicial=${dataInicial}&diasNecessarios=${diasNecessarios}`);
                if (response.ok) {
                    const availablePcs = await response.json();
                    setPcsDisponiveis(availablePcs);
                    if (pc && !availablePcs.includes(pc)) {
                        setPc('');
                    }
                } else {
                    setPcsDisponiveis(TODOS_PCS);
                    console.error("Falha ao buscar disponibilidade. Usando lista completa como fallback.");
                }
            } catch (error) {
                console.error("Erro de rede ao buscar disponibilidade:", error);
                setPcsDisponiveis(TODOS_PCS);
            } finally {
                setLoadingDisponibilidade(false);
            }
        };

        const timer = setTimeout(() => {
            fetchDisponibilidade();
        }, 500);

        return () => clearTimeout(timer);
    }, [dataInicial, diasNecessarios, pc]);

    const getDisponibilidadeStatus = () => {
        if (loadingDisponibilidade) return ' (Verificando...)';
        if (pcsDisponiveis.length === 0) return ' (Nenhum disponível)';
        if (pcsDisponiveis.length === TODOS_PCS.length) return ' (Todos disponíveis)';
        return ` (${pcsDisponiveis.length} disponíveis)`;
    };

    // Função de envio separada para ser reutilizada, agora com o tipo 'ReservationData'
    const sendReservation = async (data: ReservationData) => {
        const response = await fetch('/api/agendamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return response;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (pcsDisponiveis.length > 0 && !pcsDisponiveis.includes(pc)) {
            alert(`O PC ${pc} não está disponível para este período. Por favor, selecione uma opção válida.`);
            return;
        }

        if (pcsDisponiveis.length === 0) {
            alert(`Nenhum PC disponível para o período selecionado. Por favor, ajuste a data ou os dias.`);
            return;
        }

        const reservationData = { dataInicial, diasNecessarios, pc, nome, pin };

        try {
            const response = await sendReservation(reservationData);

            if (response.status === 401) {
                const codigoLsee = prompt("Você está fora da rede LSEE. Por favor, insira o código de acesso:");
                if (!codigoLsee) {
                    alert("A reserva foi cancelada. O código de acesso é obrigatório.");
                    return;
                }

                const newResponse = await sendReservation({ ...reservationData, codigo_lsee: codigoLsee });
                const newResult = await newResponse.json();

                if (newResponse.ok) {
                    alert('Agendamento criado com sucesso!');
                    onAgendamentoSucesso();
                    setDataInicial(getTodayDate());
                    setDiasNecessarios('1');
                    setPc('');
                    setNome('');
                    setPin('');
                } else {
                    alert(`Erro ao agendar: ${newResult.error || 'Erro desconhecido.'}`);
                }
            } else if (response.ok) {
                alert('Agendamento criado com sucesso!');
                onAgendamentoSucesso();
                setDataInicial(getTodayDate());
                setDiasNecessarios('1');
                setPc('');
                setNome('');
                setPin('');
            } else if (response.status === 409) {
                const result = await response.json();
                const conflito = result.conflito;
                const dataFim = new Date(conflito.data_inicio);
                dataFim.setDate(dataFim.getDate() + conflito.dias_necessarios);
                alert(
                    `❌ Conflito de Agendamento!\n\n` +
                    `${result.message}\n` +
                    `Reservado por: ${conflito.agendado_por}\n` +
                    `Período: ${new Date(conflito.data_inicio).toLocaleDateString('pt-BR')} até ${dataFim.toLocaleDateString('pt-BR')}`
                );
            } else {
                const result = await response.json();
                alert(`Erro ao agendar: ${result.error || 'Erro desconhecido.'}`);
            }
        } catch (error) {
            alert('Erro de conexão com o servidor.');
            console.error('Erro ao enviar formulário:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="form-card">
            <h2 className="form-title">Reservar um Servidor</h2>
            <div className="form-group-modern">
                <label htmlFor="dataInicial" className="form-label-modern">Data inicial</label>
                <div className="form-input-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" className="input-icon" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                    </svg>
                    <input
                        type="date"
                        id="dataInicial"
                        value={dataInicial}
                        onChange={(e) => setDataInicial(e.target.value)}
                        className="form-input-modern"
                        min={getTodayDate()} // <--- AQUI ESTÁ A MUDANÇA
                        required
                    />
                </div>
            </div>
            <div className="form-group-modern">
                <label htmlFor="diasNecessarios" className="form-label-modern">Dias necessários</label>
                <div className="form-input-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" className="input-icon" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                    </svg>
                    <input
                        type="number"
                        id="diasNecessarios"
                        value={diasNecessarios}
                        onChange={(e) => setDiasNecessarios(e.target.value)}
                        className="form-input-modern"
                        required
                        min="1"
                        max="15"
                    />
                </div>
            </div>
            <div className="form-group-modern">
                <label htmlFor="pc" className="form-label-modern">Número do PC
                    {getDisponibilidadeStatus()}
                </label>
                <div className="form-input-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" className="input-icon" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2z"/>
                        <path d="M8 12.5a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H8.5a.5.5 0 0 1-.5-.5z"/>
                    </svg>
                    <select
                        id="pc"
                        value={pc}
                        onChange={(e) => setPc(e.target.value)}
                        className="form-input-modern"
                        required
                        disabled={loadingDisponibilidade || pcsDisponiveis.length === 0}
                    >
                        <option value="">
                            {pcsDisponiveis.length === 0 ? 'NENHUM DISPONÍVEL' : 'Selecione um PC'}
                        </option>
                        {pcsDisponiveis.map(pc => (
                            <option key={pc} value={pc}>{pc}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="form-group-modern">
                <label htmlFor="nome" className="form-label-modern">Agendado por</label>
                <div className="form-input-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" className="input-icon" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                    </svg>
                    <input
                        type="text"
                        id="nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="form-input-modern"
                        required
                    />
                </div>
            </div>
            <div className="form-group-modern">
                <label htmlFor="pin" className="form-label-modern">PIN para cancelar agendamento</label>
                <div className="form-input-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" className="input-icon" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M3.5 11.5a.5.5 0 0 1 0-1h9a.5.5 0 0 1 0 1h-9zm-1-3a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm-1-3a.5.5 0 0 1 0-1h13a.5.5 0 0 1 0 1h-13z"/>
                        <path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2zm0-1h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/>
                    </svg>
                    <input
                        type="text"
                        id="pin"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="form-input-modern"
                        required
                    />
                </div>
            </div>
            <button
                type="submit"
                className="form-button-modern"
                disabled={pcsDisponiveis.length === 0 || loadingDisponibilidade}
            >
                {pcsDisponiveis.length === 0 ? 'Nenhum PC Disponível' : 'Confirmar Agendamento'}
            </button>
        </form>
    );
}