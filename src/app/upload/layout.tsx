import { Nav } from "@/components/nav";

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <Nav />
      {children}
    </div>
  );
}
