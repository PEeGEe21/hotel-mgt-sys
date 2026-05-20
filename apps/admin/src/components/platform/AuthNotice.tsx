type AuthNoticeProps = {
  title?: string;
  message: string;
};

export function AuthNotice({ title = 'Platform auth not connected yet', message }: AuthNoticeProps) {
  return (
    <div className="rounded-3xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 leading-6">{message}</p>
    </div>
  );
}
