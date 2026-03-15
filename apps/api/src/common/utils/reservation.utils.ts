
export function nightsBetween(checkIn: string | Date, checkOut: string | Date) {
  return Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000
  );
}

export function genReservationNo(hotelId: string) {
  const date = new Date();
  const yy   = String(date.getFullYear()).slice(-2);
  const mm   = String(date.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `RES-${yy}${mm}-${rand}`;
}