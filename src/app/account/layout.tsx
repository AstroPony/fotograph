import { Nav } from "@/components/nav";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
