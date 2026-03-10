export default function CardFooter({ left, right }) {
  return (
    <div className="flex items-center justify-between mt-[12px] text-[11px] text-t3">
      <span>{left}</span>
      <span className="text-t2 font-mono">{right}</span>
    </div>
  );
}
