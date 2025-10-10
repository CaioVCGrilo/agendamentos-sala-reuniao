'use client';

import React, { useEffect, useState } from 'react';
import FormularioAgendamento from './components/FormularioAgendamento';
import CalendarioAgendamento from './components/CalendarioAgendamento';
import './App.css';

// Interface atualizada para sala de reunião com horários
interface Agendamento {
    id: number;
    data_inicio: string;
    hora_inicial: string;
    hora_final: string;
    agendado_por: string;
    pc_numero: string;
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
            } else {
                console.error("Erro ao carregar agendamentos:", response.statusText);
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
                fetchAgendamentos(); // Recarrega a lista de agendamentos
            } else {
                alert(`Falha no Cancelamento: ${result.error || 'Erro desconhecido.'}`);
            }

        } catch (error) {
            console.error("Erro na requisição DELETE:", error);
            alert("Erro de conexão com o servidor ao tentar cancelar.");
        }
    };

    const handleAgendamentoSucesso = () => {
        fetchAgendamentos(); // Recarrega a lista após o agendamento
    };

    useEffect(() => {
        fetchAgendamentos();
    }, []);

    const currentYear = new Date().getFullYear();

    return (
        <main className="app-container">
            <div className="main-card">
                <header className="header">
                    <div className="header-logo-container">
                        <div>
                            <h1 className="header-title">Agendamento de Salas de Reunião</h1>
                            <p className="header-subtitle">Laboratório de Sistemas de Energia Elétrica</p>
                        </div>
                    </div>
                </header>
                <div className="content-section">
                    <FormularioAgendamento
                        onAgendamentoSucesso={handleAgendamentoSucesso}
                    />

                    <h2 className="section-title">Calendário de Agendamentos</h2>

                    {loading ? (
                        <p>Carregando agendamentos...</p>
                    ) : (
                        <CalendarioAgendamento
                            agendamentos={agendamentos}
                            onCancelamento={handleCancelamento}
                        />
                    )}
                </div>
            </div>
            <footer className="footer">
                <p>&copy; {currentYear} LSEE - Laboratório de Sistemas de Energia Elétrica. Todos os direitos reservados.</p>
            </footer>
        </main>
    );
}