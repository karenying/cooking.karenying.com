export function PageLoading() {
  return <main className="page-loading" aria-busy="true">
    <div role="status">
      <span className="page-loading-spinner" aria-hidden="true" />
      <span className="sr-only">Loading your cookbook…</span>
    </div>
  </main>;
}
