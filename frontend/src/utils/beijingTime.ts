const beijingFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

const getParts = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = beijingFormatter.formatToParts(date);
  const pick = (type: string) => parts.find(part => part.type === type)?.value || '';
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute')
  };
};

export const toBeijingDateTimeInput = (value: string | null | undefined) => {
  if (!value) return '';
  const parts = getParts(value);
  if (!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const fromBeijingDateTimeInput = (value: string | null | undefined) => {
  if (!value) return null;
  return `${value.slice(0, 16)}:00+08:00`;
};

export const formatBeijingDateTime = (value: string | null | undefined) => {
  const inputValue = toBeijingDateTimeInput(value);
  if (!inputValue) return '';
  return inputValue.replace('T', ' ');
};
