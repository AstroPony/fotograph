import { Nav } from "@/components/nav";

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
