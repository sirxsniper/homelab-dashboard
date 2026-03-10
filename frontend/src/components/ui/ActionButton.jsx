export default function ActionButton({ label, onClick, danger, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`py-[7px] px-[16px] rounded-[var(--radius-inner)] text-[12px] font-medium border transition-colors
        ${danger
          ? 'bg-rd border-rb text-red hover:opacity-80'
          : 'bg-s2 border-bd text-t3 hover:text-t2 hover:border-bd2'
        } disabled:opacity-50`}
    >
      {label}
    </button>
  );
}

export function ActionRow({ children }) {
  return <div className="flex gap-[8px] mt-[12px]">{children}</div>;
}
