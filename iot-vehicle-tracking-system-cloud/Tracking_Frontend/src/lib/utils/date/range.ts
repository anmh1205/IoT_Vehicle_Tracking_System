export const isDateInputRangeValid = ({ from, to }: { from: string; to: string }) =>
  Boolean(from && to && from <= to);
