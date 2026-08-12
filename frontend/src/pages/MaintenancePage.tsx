interface MaintenancePageProps {
  message?: string | null;
  imageUrl?: string | null;
}

export default function MaintenancePage({ message, imageUrl }: MaintenancePageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md text-center space-y-4">
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Maintenance"
            className="mx-auto max-w-xs w-full h-auto mb-2"
          />
        )}
        <h1 className="text-2xl font-semibold">Nous revenons bientôt</h1>
        <p className="text-muted-foreground">
          {message || "MTI Shop est actuellement en maintenance planifiée. Merci de revenir un peu plus tard."}
        </p>
      </div>
    </div>
  );
}