import Image from "next/image";

export function PwaiLogo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Image
        src="/images/PWAI-logo.png"
        alt="Pretty Wired AI logo"
        width={120}
        height={40}
        style={{ width: "auto", height: "auto" }}
        priority
      />
    </div>
  );
}
