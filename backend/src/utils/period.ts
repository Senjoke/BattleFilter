export const getPeriodId = (): string => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  const week = Math.ceil(diff / oneWeek);
  return `${now.getFullYear()}-W${week}`;
};