export default function OfflinePage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">You&apos;re offline</h1>
        <p className="text-foreground/60">
          Reconnect to the internet to continue using Locked-In.
        </p>
      </div>
    </div>
  );
}
