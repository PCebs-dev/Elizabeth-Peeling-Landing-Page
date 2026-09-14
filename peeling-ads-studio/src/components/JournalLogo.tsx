interface JournalLogoProps {
  className?: string;
}

/**
 * Journal de Montréal masthead-style wordmark used for a genuine press mention.
 * Red "J" mark + serif wordmark evokes the newspaper's branding.
 */
export function JournalLogo({ className = "" }: JournalLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#e2231a] font-serif text-lg font-bold leading-none text-white">
        J
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-serif text-sm font-semibold tracking-tight text-[#1a1a1a]">
          Le Journal
        </span>
        <span className="font-serif text-xs font-medium tracking-tight text-[#1a1a1a]">
          de Montréal
        </span>
      </span>
    </span>
  );
}
