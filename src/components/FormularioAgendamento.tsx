// src/components/FormularioAgendamento.tsx
'use client';

import React, { useState, useEffect } from 'react';
import './Formulario.css';
import { calcularDataTermino } from './utils';

// Função para gerar as opções de hora (00 a 23)
const gerarOpcoesHora = () => {
    return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
};

// Função para gerar as opções de minuto (00, 15, 30, 45)
const gerarOpcoesMinuto = () => {
    return ['00', '15', '30', '45'];
};

const OPCOES_HORA = gerarOpcoesHora();
const OPCOES_MINUTO = gerarOpcoesMinuto();

interface Agendamento {
    id: number;
    data_inicio: string;
    hora_inicial: string;
    hora_final: string;
    agendado_por: string;
    pc_numero: string;
}

const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface FormularioAgendamentoProps {
    onAgendamentoSucesso: () => void;
}

export default function FormularioAgendamento({ onAgendamentoSucesso }: FormularioAgendamentoProps) {
    const [dataReserva, setDataReserva] = useState(getTodayDate());

    // Separamos o estado para hora e minuto de inicio e fim
    const [horaInicial, setHoraInicial] = useState('08');
    const [minutoInicial, setMinutoInicial] = useState('00');
    const [horaFinal, setHoraFinal] = useState('09');
    const [minutoFinal, setMinutoFinal] = useState('00');

    const [nome, setNome] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);

    const [disponivel, setDisponivel] = useState(true);

    const [opcoesHoraDisponiveis, setOpcoesHoraDisponiveis] = useState(OPCOES_HORA);
    const [opcoesMinutoDisponiveis, setOpcoesMinutoDisponiveis] = useState(OPCOES_MINUTO);

    useEffect(() => {
        // Validação básica: converte para string para comparar
        const inicio = `${horaInicial}:${minutoInicial}`;
        const fim = `${horaFinal}:${minutoFinal}`;
        setDisponivel(fim > inicio);
    }, [horaInicial, minutoInicial, horaFinal, minutoFinal]);

    // Lógica para filtrar horários passados
    useEffect(() => {
        const today = new Date();
        const currentHour = today.getHours();
        const currentMinute = today.getMinutes();

        const isToday = dataReserva === getTodayDate();

        let filteredHours = OPCOES_HORA;
        let filteredMinutes = OPCOES_MINUTO;

        if (isToday) {
            filteredHours = OPCOES_HORA.filter(h => parseInt(h) >= currentHour);
            setOpcoesHoraDisponiveis(filteredHours);

            if (parseInt(horaInicial) === currentHour) {
                const currentMinuteInterval = Math.ceil((currentMinute + 1) / 15) * 15;
                filteredMinutes = OPCOES_MINUTO.filter(m => parseInt(m) >= currentMinuteInterval);
                setOpcoesMinutoDisponiveis(filteredMinutes);
            } else {
                setOpcoesMinutoDisponiveis(OPCOES_MINUTO);
            }
        } else {
            setOpcoesHoraDisponiveis(OPCOES_HORA);
            setOpcoesMinutoDisponiveis(OPCOES_MINUTO);
        }

        // Ajusta o valor inicial se o horário anterior não estiver mais disponível
        if (isToday && parseInt(horaInicial) < currentHour) {
            setHoraInicial(String(currentHour).padStart(2, '0'));
            setMinutoInicial(String(Math.ceil((currentMinute + 1) / 15) * 15).padStart(2, '0'));
        }
    }, [dataReserva, horaInicial]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const novoAgendamento = {
            data_inicio: dataReserva,
            hora_inicial: `${horaInicial}:${minutoInicial}`,
            hora_final: `${horaFinal}:${minutoFinal}`,
            agendado_por: nome,
            pin: pin
        };

        try {
            const response = await fetch('/api/agendamentos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(novoAgendamento),
            });

            const result = await response.json();

            if (response.ok) {
                alert('Agendamento criado com sucesso!');
                onAgendamentoSucesso();
                setDataReserva(getTodayDate());
                setHoraInicial('08');
                setMinutoInicial('00');
                setHoraFinal('09');
                setMinutoFinal('00');
                setNome('');
                setPin('');
            } else if (response.status === 409) {
                const conflito = result.conflito;
                alert(
                    `❌ Conflito de Agendamento!\n\n` +
                    `${result.message}\n` +
                    `Reservado por: ${conflito.agendado_por}\n` +
                    `Período: ${conflito.hora_inicial} até ${conflito.hora_final}`
                );
            } else {
                alert(`Erro ao agendar: ${result.error || 'Erro desconhecido.'}`);
            }

        } catch (error) {
            alert('Erro de conexão com o servidor.');
            console.error('Erro ao enviar formulário:', error);
        } finally {
            setLoading(false);
        }
    };
    return (
        <form onSubmit={handleSubmit} className="form-card">
            <h2 className="form-title">Reservar Sala de Reunião</h2>
            <div className="form-group-modern">
                <label htmlFor="dataReserva" className="form-label-modern">Data da Reserva</label>
                <div className="form-input-wrapper">
                    <input
                        type="date"
                        id="dataReserva"
                        value={dataReserva}
                        onChange={(e) => setDataReserva(e.target.value)}
                        className="form-input-modern"
                        min={getTodayDate()}
                        required
                    />
                </div>
            </div>
            <div className="horarios-container">
                <div className="form-group-modern horario-item">
                    <label className="form-label-modern">Horário Inicial</label>
                    <div className="time-select-group">
                        <select
                            value={horaInicial}
                            onChange={(e) => setHoraInicial(e.target.value)}
                            className="form-input-modern time-select"
                            required
                        >
                            {opcoesHoraDisponiveis.map(hora => (
                                <option key={hora} value={hora}>{hora}</option>
                            ))}
                        </select>
                        <span className="separator">:</span>
                        <select
                            value={minutoInicial}
                            onChange={(e) => setMinutoInicial(e.target.value)}
                            className="form-input-modern time-select"
                            required
                        >
                            {opcoesMinutoDisponiveis.map(minuto => (
                                <option key={minuto} value={minuto}>{minuto}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="form-group-modern horario-item">
                    <label className="form-label-modern">Horário Final</label>
                    <div className="time-select-group">
                        <select
                            value={horaFinal}
                            onChange={(e) => setHoraFinal(e.target.value)}
                            className="form-input-modern time-select"
                            required
                        >
                            {OPCOES_HORA.map(hora => (
                                <option key={hora} value={hora}>{hora}</option>
                            ))}
                        </select>
                        <span className="separator">:</span>
                        <select
                            value={minutoFinal}
                            onChange={(e) => setMinutoFinal(e.target.value)}
                            className="form-input-modern time-select"
                            required
                        >
                            {OPCOES_MINUTO.map(minuto => (
                                <option key={minuto} value={minuto}>{minuto}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            {/* ... (O restante do formulário permanece o mesmo) */}
            <div className="form-group-modern">
                <label htmlFor="nome" className="form-label-modern">Agendado por</label>
                <div className="form-input-wrapper">
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
                <label htmlFor="pin" className="form-label-modern">PIN para agendar e cancelar</label>
                <div className="form-input-wrapper">
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
                disabled={!disponivel}
            >
                {disponivel ? 'Confirmar Agendamento' : 'Horário Ocupado'}
            </button>
        </form>
    );
}