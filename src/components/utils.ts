export const calcularDataTermino = (dataInicioStr: string, diasNecessarios: number): Date => {
    const data = new Date(dataInicioStr + 'T00:00:00');
    data.setDate(data.getDate() + (diasNecessarios - 1));
    return data;
};