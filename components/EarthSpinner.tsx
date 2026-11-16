export default function EarthSpinner({ className = "h-28 w-28" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-[14px] rounded-full bg-[radial-gradient(circle_at_32%_30%,#d7fff0_0%,#3d9a62_18%,#1a6ea8_46%,#0a1c33_72%,#05060f_100%)] shadow-[0_0_28px_rgba(125,204,255,0.28)]" />
      <div className="absolute inset-0 animate-[spin_2.4s_linear_infinite]">
        <span className="absolute left-1/2 top-0 h-2.5 w-7 -translate-x-1/2 rounded-sm bg-[#e7eef5] shadow-[9px_0_0_#1a3e78,-9px_0_0_#1a3e78]" />
      </div>
    </div>
  );
}
