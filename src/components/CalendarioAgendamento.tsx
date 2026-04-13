'use client';

import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
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
    // Views do calendário em caixa alta
    type CalendarView = 'MONTH' | 'WEEK' | 'WORK_WEEK' | 'DAY' | 'AGENDA';
    const [currentView, setCurrentView] = useState<CalendarView>('MONTH');

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

    const handleSelectSlot = (slotInfo: any) => {
        setCurrentDate(slotInfo.start);
        setCurrentView('DAY');
    };

    // Corrige: entrar no dia com apenas um clique
    const handleDrillDown = (date: Date, view: string) => {
        setCurrentDate(date);
        setCurrentView('DAY');
        return false; // previne navegação padrão
    };

    const eventPropGetter = (event: any) => {
        return {
            style: event.style,
        };
    };

    // Torna toda a célula do mês clicável para navegação, mantendo o grid e destacando dias passados
    const components = {
        dateCellWrapper: (props: any) => {
            const isPast = props.value < new Date(new Date().setHours(0,0,0,0));
            return React.cloneElement(
                props.children,
                {
                    style: {
                        ...props.children.props.style,
                        cursor: 'pointer',
                        background: isPast ? '#f3f4f6' : props.children.props.style?.background,
                        color: isPast ? '#9ca3af' : props.children.props.style?.color,
                        opacity: isPast ? 0.7 : 1,
                    },
                    onClick: (e: any) => {
                        e.stopPropagation();
                        setCurrentDate(props.value);
                        setCurrentView('DAY');
                        if (props.children.props.onClick) props.children.props.onClick(e);
                    }
                }
            );
        }
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
                selectable={true}
                onSelectSlot={handleSelectSlot}
                onDrillDown={handleDrillDown}
                eventPropGetter={eventPropGetter}
                components={components}
                toolbar={false} // Oculta a barra de ferramentas padrão
                date={currentDate}
                view={Views[currentView]}
                onView={(view) => setCurrentView(view as CalendarView)}
                onNavigate={(newDate) => setCurrentDate(newDate)}
            />

            {/* Barra inferior para voltar ao mês */}
            {currentView !== 'MONTH' && (
                <div className="calendar-bottom-bar">
                    <button className="calendar-back-month-btn" onClick={() => setCurrentView('MONTH')}>
                        Voltar para o mês
                    </button>
                </div>
            )}

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
                <ul style={{paddingLeft: 0}}>
                    {agendamentos
                        .map(agendamento => {
                            const dataHora = new Date(`${agendamento.data_inicio}T${agendamento.hora_inicial}`);
                            const [ano, mes, dia] = agendamento.data_inicio.split('-');
                            const horaIni = agendamento.hora_inicial.slice(0,5);
                            const horaFim = agendamento.hora_final.slice(0,5);
                            return {
                                ...agendamento,
                                dataHora,
                                dataFormatada: `${dia}/${mes}/${ano.slice(2)}`,
                                horaIni,
                                horaFim
                            };
                        })
                        .filter(a => a.dataHora >= new Date())
                        .sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime())
                        .slice(0, 5)
                        .map(a => (
                            <li key={a.id} style={{marginBottom: 4, padding: 0, fontSize: '0.97rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                <span style={{display: 'inline-block', minWidth: 90, fontWeight: 600}}>{a.dataFormatada}</span>
                                <span style={{margin: '0 2px'}}> - </span>
                                <span style={{minWidth: 80}}>{a.horaIni} às {a.horaFim}</span>
                                <span style={{margin: '0 2px'}}>|</span>
                                <span style={{maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', verticalAlign: 'bottom'}}>{a.agendado_por}</span>
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