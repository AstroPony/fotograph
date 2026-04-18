export default function DashboardLoading() {
  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <div className="border-b-4 border-black pb-4 mb-10">
        <div className="h-3 w-40 bg-black/10 mb-2" />
        <div className="h-12 w-64 bg-black/10" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-black">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white aspect-square bg-black/5 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
