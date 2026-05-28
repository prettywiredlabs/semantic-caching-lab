import Image from "next/image";

export function PwaiLogo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Image
        src="/PWAI-logo.png"
        alt="Pretty Wired AI logo"
        width={120}
        height={40}
        priority
      />
    </div>
  );
}
