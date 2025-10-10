'use client';

import React, { useState, useEffect } from 'react';
import './Formulario.css';
import { calcularDataTermino } from './utils';


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
    const [horaInicial, setHoraInicial] = useState('08:00');
    const [horaFinal, setHoraFinal] = useState('09:00');
    const [nome, setNome] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);

    // Simplificamos a lógica de disponibilidade, já que o backend vai lidar com o conflito
    const [disponivel, setDisponivel] = useState(true);

    useEffect(() => {
        // Validação básica de horários no frontend
        setDisponivel(horaFinal > horaInicial);
    }, [horaInicial, horaFinal]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const novoAgendamento = {
            dataReserva,
            horaInicial,
            horaFinal,
            nome,
            pin
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
                setHoraInicial('08:00');
                setHoraFinal('09:00');
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
                    <label htmlFor="horaInicial" className="form-label-modern">Horário Inicial</label>
                    <div className="form-input-wrapper">
                        <input
                            type="time"
                            id="horaInicial"
                            value={horaInicial}
                            onChange={(e) => setHoraInicial(e.target.value)}
                            className="form-input-modern"
                            required
                            step="900"
                        />
                    </div>
                </div>
                <div className="form-group-modern horario-item">
                    <label htmlFor="horaFinal" className="form-label-modern">Horário Final</label>
                    <div className="form-input-wrapper">
                        <input
                            type="time"
                            id="horaFinal"
                            value={horaFinal}
                            onChange={(e) => setHoraFinal(e.target.value)}
                            className="form-input-modern"
                            required
                            step="900"
                        />
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