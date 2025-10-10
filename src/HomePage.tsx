'use client';

import React, { useEffect, useState } from 'react';
import FormularioAgendamento from './components/FormularioAgendamento';
import './App.css';

// Utility function to calculate the end date
const calcularDataTermino = (dataInicioStr: string, diasNecessarios: number): Date => {
    // 1. Convert the YYYY-MM-DD string to a Date object
    const data = new Date(dataInicioStr + 'T00:00:00');
    data.setDate(data.getDate() + (diasNecessarios - 1));
    return data;
};

interface Agendamento {
    id: number;
    data_inicio: string;
    dias_necessarios: number;
    pc_numero: string;
    agendado_por: string;
}

export default function HomePage() {
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAgendamentos = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/agendamentos');
            if (response.ok) {
                const data = await response.json();
                setAgendamentos(data);
            }
        } catch (error) {
            console.error("Erro ao carregar agendamentos:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelamento = async (id: number) => {
        const pinDigitado = prompt("Para cancelar, digite o PIN de liberação:");

        if (!pinDigitado) {
            alert("Operação cancelada.");
            return;
        }

        try {
            const response = await fetch(`/api/agendamentos?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pinDigitado }),
            });

            const result = await response.json();

            if (response.ok) {
                alert(`Agendamento ${id} cancelado com sucesso!`);
                fetchAgendamentos();
            } else if (response.status === 403 || response.status === 404) {
                alert(`Falha no Cancelamento: ${result.error || 'PIN ou ID incorreto.'}`);
            } else {
                alert(`Erro ao cancelar: ${result.error || 'Erro desconhecido.'}`);
            }

        } catch (error) {
            console.error("Erro na requisição DELETE:", error);
            alert("Erro de conexão com o servidor ao tentar cancelar.");
        }
    };

    useEffect(() => {
        fetchAgendamentos();
    }, []);

    // Get the current year dynamically for the copyright notice
    const currentYear = new Date().getFullYear();

    // Lógica para filtrar agendamentos expirados
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zera o horário para a comparação ser somente por data

    const agendamentosValidos = agendamentos.filter(agendamento => {
        const dataTermino = calcularDataTermino(agendamento.data_inicio, agendamento.dias_necessarios);
        return dataTermino >= hoje;
    });

    return (
        <main className="app-container">
            <div className="main-card">
                <header className="header">
                    <div className="header-logo-container">
                        <div>
                            <h1 className="header-title">Agendamento de Servidores</h1>
                            <p className="header-subtitle">Laboratório de Sistemas de Energia Elétrica</p>
                        </div>
                    </div>
                </header>
                <div className="content-section">
                    <FormularioAgendamento onAgendamentoSucesso={fetchAgendamentos} />

                    <h2 className="section-title">Agendamentos Existentes</h2>

                    {loading ? (
                        <p>Carregando agendamentos...</p>
                    ) : (
                        <div className="table-container">
                            <table className="agendamentos-table">
                                <thead>
                                <tr>
                                    <th>Início</th> {/* Simplificado */}
                                    <th>Término</th> {/* Novo título */}
                                    <th>Nº PC</th>
                                    <th>Agendado por</th>
                                    <th>Ação</th>
                                </tr>
                                </thead>
                                <tbody>
                                {agendamentosValidos.map((agendamento) => {
                                    // Formata a data de início para exibição
                                    const dataInicioFormatada = agendamento.data_inicio ? new Date(agendamento.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '';

                                    // Calcula a data de término para exibição
                                    const dataTermino = calcularDataTermino(agendamento.data_inicio, agendamento.dias_necessarios);
                                    const dataTerminoFormatada = dataTermino.toLocaleDateString('pt-BR', {timeZone: 'UTC'});

                                    return (
                                        <tr key={agendamento.id}>
                                            <td data-label="Início">{dataInicioFormatada}</td>
                                            <td data-label="Término">{dataTerminoFormatada}</td>
                                            <td data-label="Nº PC">
                                                <span className={`pc-tag ${
                                                    agendamento.pc_numero === 'PC 094' ? 'blue' :
                                                        agendamento.pc_numero === 'PC 082' ? 'orange' :
                                                            agendamento.pc_numero === 'PC 095' ? 'purple' :
                                                                'green'
                                                }`}>
                                                    {agendamento.pc_numero}
                                                </span>
                                            </td>
                                            {/* Corrected the variable name here */}
                                            <td data-label="Agendado por">{agendamento.agendado_por}</td>
                                            <td data-label="Ação">
                                                <button onClick={() => handleCancelamento(agendamento.id)} className="cancel-button">
                                                    Cancelar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <footer className="footer">
                <p>&copy; {currentYear} LSEE - Laboratório de Sistemas de Energia Elétrica. Todos os direitos reservados.</p>
            </footer>
        </main>
    );
}