'use client';

import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from 'date-fns';
import * as dateFnsLocales from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../App.css';

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
    'pt-BR': dateFnsLocales.ptBR,
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
    const [currentDate, setCurrentDate] = useState(new Date());

    const eventos = agendamentos.map(agendamento => {
        const dataInicio = new Date(`${agendamento.data_inicio}T${agendamento.hora_inicial}`);
        const dataFim = new Date(`${agendamento.data_inicio}T${agendamento.hora_final}`);

        const eventColor = '#3b82f6';

        return {
            id: agendamento.id,
            title: `${agendamento.agendado_por}`,
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
            {/* Barra de navegação personalizada */}
            <div className="custom-toolbar">
                <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                    &lt;
                </button>
                <span>{format(currentDate, 'MMMM yyyy', { locale: dateFnsLocales.ptBR })}</span>
                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                    &gt;
                </button>
            </div>

            <Calendar
                localizer={localizer}
                events={eventos}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '500px' }}
                messages={messages}
                onSelectEvent={handleSelectEvent}
                selectable={false}
                eventPropGetter={eventPropGetter}
                toolbar={false} // Oculta a barra de ferramentas padrão
                date={currentDate}
                onNavigate={(newDate) => setCurrentDate(newDate)}
            />
            {selectedEvent && (
                <div className="event-details-popup">
                    <h3>Detalhes do Agendamento</h3>
                    <p>Reservado por: <strong>{selectedEvent.resource.agendado_por}</strong></p>
                    <p>Início: <strong>{format(selectedEvent.start, 'dd/MM/yyyy HH:mm')}</strong></p>
                    <p>Término: <strong>{format(selectedEvent.end, 'dd/MM/yyyy HH:mm')}</strong></p>

                    <div className="button-group">
                        <button
                            onClick={() => {
                                onCancelamento(selectedEvent.id);
                                setSelectedEvent(null);
                            }}
                            className="cancel-button"
                        >
                            Cancelar Agendamento
                        </button>
                        <button
                            onClick={() => setSelectedEvent(null)}
                            className="close-popup-button"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}

            {/* Próximas 5 reuniões */}
            <div className="proximos-agendamentos">
                <h4>Próximas 5 reuniões</h4>
                <ul>
                    {agendamentos
                        .map(agendamento => ({
                            ...agendamento,
                            dataHora: new Date(`${agendamento.data_inicio}T${agendamento.hora_inicial}`)
                        }))
                        .filter(a => a.dataHora >= new Date())
                        .sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime())
                        .slice(0, 5)
                        .map(a => (
                            <li key={a.id} style={{marginBottom: 8}}>
                                <strong>{a.data_inicio}</strong> {a.hora_inicial} - {a.hora_final} | {a.agendado_por}
                            </li>
                        ))
                    }
                    {agendamentos.filter(a => new Date(`${a.data_inicio}T${a.hora_inicial}`) >= new Date()).length === 0 && (
                        <li>Nenhuma reunião futura agendada.</li>
                    )}
                </ul>
            </div>
        </div>
    );
}