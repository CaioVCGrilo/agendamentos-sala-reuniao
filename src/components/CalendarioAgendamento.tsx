'use client';

import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../App.css'; // Importe o CSS para estilização

interface EventoCalendario {
    id: number;
    title: string;
    start: Date;
    end: Date;
    resource: any;
    style: { backgroundColor: string; color: string };
}

interface Agendamento {
    id: number;
    data_inicio: string;
    hora_inicial: string;
    hora_final: string;
    agendado_por: string;
    pc_numero: string;
}

// Configuração de localização para pt-BR
const locales = {
    'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

// A lista de mensagens traduzidas para o calendário
const messages = {
    allDay: 'Dia Inteiro',
    previous: 'Anterior',
    next: 'Próximo',
    today: 'Hoje',
    month: 'Mês',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    date: 'Data',
    time: 'Hora',
    event: 'Evento',
    showMore: (total: number) => `+${total} mais`,
};

interface CalendarioAgendamentoProps {
    agendamentos: Agendamento[];
    onCancelamento: (id: number) => void;
}

export default function CalendarioAgendamento({ agendamentos, onCancelamento }: CalendarioAgendamentoProps) {
    const [selectedEvent, setSelectedEvent] = useState<EventoCalendario | null>(null);

    const eventos = agendamentos.map(agendamento => {
        const dataInicio = new Date(`${agendamento.data_inicio}T${agendamento.hora_inicial}`);
        const dataFim = new Date(`${agendamento.data_inicio}T${agendamento.hora_final}`);

        const eventColor = '#3b82f6';

        return {
            id: agendamento.id,
            title: `${agendamento.pc_numero} - ${agendamento.agendado_por}`,
            start: dataInicio,
            end: dataFim,
            resource: agendamento,
            style: { backgroundColor: eventColor, color: 'white' }
        };
    });

    const handleSelectEvent = (event: EventoCalendario) => {
        setSelectedEvent(event);
    };

    const eventPropGetter = (event: any) => {
        return {
            style: event.style,
        };
    };

    return (
        <div className="calendar-container">
            <Calendar
                localizer={localizer}
                events={eventos}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '500px' }}
                messages={messages} // Usando o objeto de mensagens traduzido
                onSelectEvent={handleSelectEvent}
                selectable={false}
                eventPropGetter={eventPropGetter}
            />
            {selectedEvent && (
                <div className="event-details-popup">
                    <h3>Detalhes do Agendamento</h3>
                    <p>Sala: **{selectedEvent.resource.pc_numero}**</p>
                    <p>Reservado por: **{selectedEvent.resource.agendado_por}**</p>
                    <p>Início: **{format(selectedEvent.start, 'dd/MM/yyyy HH:mm')}**</p>
                    <p>Término: **{format(selectedEvent.end, 'dd/MM/yyyy HH:mm')}**</p>
                    <button onClick={() => {
                        onCancelamento(selectedEvent.id);
                        setSelectedEvent(null);
                    }} className="cancel-button">
                        Cancelar Agendamento
                    </button>
                    <button onClick={() => setSelectedEvent(null)} className="close-popup-button">
                        Fechar
                    </button>
                </div>
            )}
        </div>
    );
}