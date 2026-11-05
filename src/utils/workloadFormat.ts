/**
 * Utilitário de formatação de carga horária para cursos e certificados (LMS).
 * Converte horas fracionárias (ex: 0.25h, 0.5h, 0.75h, 1.5h) em representações textuais amigáveis.
 */
export function formatWorkload(
  hours: number | undefined | null,
  options?: {
    style?: 'short' | 'long';
    short?: boolean;
    suffixCarga?: boolean;
  }
): string {
  const isLong = options?.style === 'long' || (options?.short === false && options?.style !== 'short');
  const h = typeof hours === 'number' && !isNaN(hours) ? hours : 0;
  if (h <= 0) {
    const zeroText = isLong ? '0 minutos' : '0 min';
    return options?.suffixCarga ? `${zeroText} carga` : zeroText;
  }

  const totalMinutes = Math.round(h * 60);

  // Menor do que 1 hora (< 60 minutos)
  if (totalMinutes < 60) {
    const text = isLong
      ? `${totalMinutes} ${totalMinutes === 1 ? 'minuto' : 'minutos'}`
      : `${totalMinutes} min`;
    return options?.suffixCarga ? `${text} carga` : text;
  }

  // 1 hora ou mais (>= 60 minutos)
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  let text: string;
  if (!isLong) {
    text = mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;
  } else if (mins === 0) {
    text = `${hrs} ${hrs === 1 ? 'hora' : 'horas'}`;
  } else {
    text = `${hrs} ${hrs === 1 ? 'hora' : 'horas'} e ${mins} ${mins === 1 ? 'minuto' : 'minutos'}`;
  }

  return options?.suffixCarga ? `${text} carga` : text;
}
